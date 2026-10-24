import uuid
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field

import anyio
from fastapi.sse import ServerSentEvent
from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Bot, Channel, Chunk, Conversation, Message, MessageRole, UnansweredQuestion
from app.schemas.chat import (
    MAX_HISTORY_CHARS,
    MAX_HISTORY_MESSAGES,
    ChatMessage,
    ConversationEvent,
    DoneEvent,
    ErrorEvent,
    SourcesEvent,
    TokenEvent,
)
from app.services.embeddings import Embedder
from app.services.leads import record_leads
from app.services.llm import LLMError, LLMProvider
from app.services.prompts import build_system_prompt
from app.services.query_rewrite import rewrite_query
from app.services.retrieval import Passage, search

TITLE_LENGTH = 60


@dataclass(frozen=True)
class Turn:
    conversation: Conversation
    history: Sequence[ChatMessage]
    model: str
    system_prompt: str
    sources: list[dict] = field(default_factory=list)


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


def distinct_sources(passages: Sequence[Passage]) -> list[dict]:
    sources: dict[uuid.UUID, dict] = {}
    for passage in passages:
        sources.setdefault(
            passage.document_id, {"document_id": str(passage.document_id), "title": passage.title}
        )
    return list(sources.values())


@dataclass(frozen=True)
class Grounding:
    context: list[Passage]
    sources: list[Passage]
    has_knowledge: bool


async def _ground(
    session: AsyncSession,
    bot: Bot,
    history: Sequence[ChatMessage],
    conversation: Conversation,
    *,
    llm: LLMProvider,
    embedder: Embedder,
    settings: Settings,
) -> Grounding:
    has_knowledge = await session.scalar(select(exists().where(Chunk.bot_id == bot.id)))
    if not has_knowledge:
        return Grounding([], [], False)

    question = history[-1].content
    queries = (
        await rewrite_query(llm, history, settings.rag_rewrite_model)
        if settings.rag_query_rewrite
        else [question]
    )
    if not queries:
        return Grounding([], [], True)

    passages = await search(session, embedder, bot.id, queries, limit=settings.rag_top_k)
    context = [p for p in passages if p.score >= settings.rag_context_floor]
    confident = [p for p in context if p.score >= settings.rag_min_score]
    if not confident:
        session.add(
            UnansweredQuestion(
                bot_id=bot.id,
                conversation_id=conversation.id,
                question=question,
                best_score=passages[0].score if passages else None,
            )
        )
    return Grounding(context, confident, True)


async def start_turn(
    session: AsyncSession,
    bot: Bot,
    *,
    content: str,
    conversation: Conversation | None,
    model: str,
    llm: LLMProvider,
    embedder: Embedder,
    settings: Settings,
    channel: Channel = Channel.PLAYGROUND,
) -> Turn:
    """Persist the user message, then retrieve the knowledge the reply should rely on."""
    if conversation is None:
        conversation = Conversation(bot_id=bot.id, channel=channel, title=make_title(content))
        session.add(conversation)
        await session.flush()

    session.add(Message(conversation_id=conversation.id, role=MessageRole.USER, content=content))
    conversation.updated_at = func.now()
    await session.flush()
    await record_leads(session, bot_id=bot.id, conversation_id=conversation.id, message=content)

    messages = await session.scalars(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(MAX_HISTORY_MESSAGES)
    )
    history = fit_history(list(reversed(list(messages))))
    grounding = await _ground(
        session, bot, history, conversation, llm=llm, embedder=embedder, settings=settings
    )
    await session.commit()

    return Turn(
        conversation=conversation,
        history=history,
        model=model,
        system_prompt=build_system_prompt(
            bot, grounding.context, has_knowledge=grounding.has_knowledge
        ),
        sources=distinct_sources(grounding.sources),
    )


async def _save_reply(session: AsyncSession, turn: Turn, content: str) -> uuid.UUID | None:
    if not content:
        return None
    message = Message(
        conversation_id=turn.conversation.id,
        role=MessageRole.ASSISTANT,
        content=content,
        model=turn.model,
        sources=turn.sources or None,
    )
    session.add(message)
    turn.conversation.updated_at = func.now()
    await session.commit()
    return message.id


async def stream_turn(
    session: AsyncSession, llm: LLMProvider, turn: Turn
) -> AsyncIterator[ServerSentEvent]:
    """SSE protocol: conversation, sources, token*, then done | error. Partial replies are kept."""
    yield ServerSentEvent(
        event="conversation",
        data=ConversationEvent(id=turn.conversation.id, title=turn.conversation.title),
    )
    yield ServerSentEvent(event="sources", data=SourcesEvent(sources=turn.sources))

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
