from collections.abc import AsyncIterable
from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app.api.deps import EmbedderDep, LLMDep, SessionDep, SettingsDep, user_rate_limit
from app.api.v1.routes.bots import BotDep
from app.core.errors import AppError
from app.schemas.chat import ChatTurnRequest, ModelList
from app.services import conversations as conversation_service
from app.services.chat import Turn, start_turn, stream_turn
from app.services.llm import LLMProvider

router = APIRouter(tags=["chat"])


@router.get("/chat/models")
async def list_models(settings: SettingsDep) -> ModelList:
    return ModelList(default=settings.llm_default_model, models=settings.llm_models)


@dataclass(frozen=True)
class ChatContext:
    turn: Turn
    llm: LLMProvider


async def prepare_chat(
    payload: ChatTurnRequest,
    bot: BotDep,
    session: SessionDep,
    settings: SettingsDep,
    llm: LLMDep,
    embedder: EmbedderDep,
) -> ChatContext:
    # Depends on the body, so it runs after validation and before the stream starts.
    if llm is None:
        raise AppError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "llm_not_configured",
            "The AI service is not configured on this server.",
        )
    model = payload.model or bot.model or settings.llm_default_model
    if model not in settings.llm_models:
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "unknown_model",
            f"Model '{model}' is not available.",
        )
    conversation = None
    if payload.conversation_id:
        conversation = await conversation_service.get_conversation(
            session, bot.id, payload.conversation_id, with_messages=False
        )
    turn = await start_turn(
        session,
        bot,
        content=payload.content,
        conversation=conversation,
        model=model,
        llm=llm,
        embedder=embedder,
        settings=settings,
    )
    return ChatContext(turn=turn, llm=llm)


@router.post(
    "/bots/{bot_id}/chat",
    response_class=EventSourceResponse,
    dependencies=[user_rate_limit("chat", "chat_rate_limit")],
)
async def chat(
    context: Annotated[ChatContext, Depends(prepare_chat)], session: SessionDep
) -> AsyncIterable[ServerSentEvent]:
    """Send a message to an assistant and stream its reply.

    Events: `conversation`, `sources`, then `token`*, then `done` or `error`.
    """
    async for event in stream_turn(session, context.llm, context.turn):
        yield event
