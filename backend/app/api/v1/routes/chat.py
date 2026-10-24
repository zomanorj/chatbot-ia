from collections.abc import AsyncIterable
from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app.api.deps import LLMDep, SettingsDep
from app.core.errors import AppError
from app.core.rate_limit import rate_limit
from app.schemas.chat import ChatRequest, ModelList
from app.services.chat import stream_reply
from app.services.llm import LLMProvider

router = APIRouter(prefix="/chat", tags=["chat"])


@dataclass(frozen=True)
class ChatTarget:
    llm: LLMProvider
    model: str


def resolve_target(payload: ChatRequest, llm: LLMDep, settings: SettingsDep) -> ChatTarget:
    # Depends on the body so it runs only after validation, and before streaming starts.
    if llm is None:
        raise AppError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "llm_not_configured",
            "The AI service is not configured on this server.",
        )
    model = payload.model or settings.llm_default_model
    if model not in settings.llm_models:
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "unknown_model",
            f"Model '{model}' is not available.",
        )
    return ChatTarget(llm=llm, model=model)


@router.get("/models", response_model=ModelList)
async def list_models(settings: SettingsDep) -> ModelList:
    return ModelList(default=settings.llm_default_model, models=settings.llm_models)


@router.post(
    "/stream",
    response_class=EventSourceResponse,
    dependencies=[rate_limit("chat", "chat_rate_limit")],
)
async def stream_chat(
    payload: ChatRequest,
    target: Annotated[ChatTarget, Depends(resolve_target)],
) -> AsyncIterable[ServerSentEvent]:
    """Stream the assistant reply as SSE events: `token`, then `done` or `error`."""
    async for event in stream_reply(target.llm, payload.messages, model=target.model):
        yield event
