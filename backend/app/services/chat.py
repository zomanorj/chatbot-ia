from collections.abc import AsyncIterator, Sequence

from fastapi.sse import ServerSentEvent

from app.schemas.chat import ChatMessage, DoneEvent, ErrorEvent, TokenEvent
from app.services.llm import LLMError, LLMProvider

DEFAULT_SYSTEM_PROMPT = (
    "You are Mpanampy, a helpful assistant for small businesses. "
    "Answer clearly and concisely, in the language the user writes in. "
    "Use Markdown when it improves readability."
)


async def stream_reply(
    llm: LLMProvider,
    messages: Sequence[ChatMessage],
    *,
    model: str,
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
) -> AsyncIterator[ServerSentEvent]:
    """Translate provider output into the public SSE protocol: token*, then done | error."""
    try:
        async for text in llm.stream(messages, model=model, system_prompt=system_prompt):
            yield ServerSentEvent(event="token", data=TokenEvent(text=text))
    except LLMError as exc:
        yield ServerSentEvent(event="error", data=ErrorEvent(code=exc.code, message=exc.message))
        return
    yield ServerSentEvent(event="done", data=DoneEvent(model=model))
