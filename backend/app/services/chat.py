import uuid
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass

import anyio
from fastapi.sse import ServerSentEvent
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Bot, Channel, Conversation, Message, MessageRole
from app.schemas.chat import (
    MAX_HISTORY_CHARS,
    MAX_HISTORY_MESSAGES,
    ChatMessage,
    ConversationEvent,
    DoneEvent,
    ErrorEvent,
    TokenEvent,
)
from app.services.llm import LLMError, LLMProvider
from app.services.prompts import build_system_prompt

TITLE_LENGTH = 60


@dataclass(frozen=True)
class Turn:
    conversation: Conversation
    history: Sequence[ChatMessage]
    model: str
    system_prompt: str


def make_title(text: str) -> str:
    text = " ".join(text.split())
    if len(text) <= TITLE_LENGTH:
        return text
    cut = text.rfind(" ", 0, TITLE_LENGTH)
    return text[: cut if cut > 0 else TITLE_LENGTH] + "…"


def fit_history(messages: Sequence[Message]) -> list[ChatMessage]:
    """Keep the most recent messages that fit the provider context budget."""
    kept: list[ChatMessage] = []
    total = 0
    for message in reversed(messages[-MAX_HISTORY_MESSAGES:]):
        total += len(message.content)
        if kept and total > MAX_HISTORY_CHARS:
            break
        kept.append(ChatMessage(role=message.role.value, content=message.content))
    return list(reversed(kept))


async def start_turn(
    session: AsyncSession,
    bot: Bot,
    *,
    content: str,
    conversation: Conversation | None,
    model: str,
    channel: Channel = Channel.PLAYGROUND,
) -> Turn:
    """Persist the user message before streaming so it survives provider failures."""
    if conversation is None:
        conversation = Conversation(bot_id=bot.id, channel=channel, title=make_title(content))
        session.add(conversation)
        await session.flush()

    session.add(Message(conversation_id=conversation.id, role=MessageRole.USER, content=content))
    conversation.updated_at = func.now()
    await session.flush()

    messages = await session.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(MAX_HISTORY_MESSAGES)
    )
    history = fit_history(list(reversed(list(messages))))
    await session.commit()
    return Turn(conversation, history, model, build_system_prompt(bot))


async def _save_reply(session: AsyncSession, turn: Turn, content: str) -> uuid.UUID | None:
    if not content:
        return None
    message = Message(
        conversation_id=turn.conversation.id,
        role=MessageRole.ASSISTANT,
        content=content,
        model=turn.model,
    )
    session.add(message)
    turn.conversation.updated_at = func.now()
    await session.commit()
    return message.id


async def stream_turn(
    session: AsyncSession, llm: LLMProvider, turn: Turn
) -> AsyncIterator[ServerSentEvent]:
    """SSE protocol: conversation, token*, then done | error. Partial replies are kept."""
    yield ServerSentEvent(
        event="conversation",
        data=ConversationEvent(id=turn.conversation.id, title=turn.conversation.title),
    )

    parts: list[str] = []
    failure: LLMError | None = None
    try:
        async for text in llm.stream(
            turn.history, model=turn.model, system_prompt=turn.system_prompt
        ):
            parts.append(text)
            yield ServerSentEvent(event="token", data=TokenEvent(text=text))
    except LLMError as exc:
        failure = exc
    finally:
        # Shielded so a client disconnect still saves what was generated.
        with anyio.CancelScope(shield=True):
            message_id = await _save_reply(session, turn, "".join(parts))

    if failure:
        yield ServerSentEvent(
            event="error", data=ErrorEvent(code=failure.code, message=failure.message)
        )
        return
    yield ServerSentEvent(event="done", data=DoneEvent(model=turn.model, message_id=message_id))
