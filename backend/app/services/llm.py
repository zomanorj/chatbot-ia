import logging
from collections.abc import AsyncIterator, Sequence
from typing import Protocol

import groq

from app.schemas.chat import ChatMessage

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Provider failure safe to show to end users."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class LLMProvider(Protocol):
    def stream(
        self, messages: Sequence[ChatMessage], *, model: str, system_prompt: str
    ) -> AsyncIterator[str]: ...

    async def complete(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str,
        system_prompt: str,
        max_tokens: int,
    ) -> str: ...

    async def aclose(self) -> None: ...


def _payload(messages: Sequence[ChatMessage], system_prompt: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": system_prompt},
        *({"role": m.role, "content": m.content} for m in messages),
    ]


def _translate_error(exc: groq.APIError) -> LLMError:
    if isinstance(exc, groq.RateLimitError):
        return LLMError("provider_busy", "The AI service is busy. Please retry shortly.")
    if isinstance(exc, groq.APIConnectionError):
        return LLMError("provider_unreachable", "The AI service is unreachable.")
    logger.error("Groq API error: %s", exc)
    return LLMError("provider_error", "The AI service failed to answer.")


class GroqProvider:
    def __init__(self, api_key: str) -> None:
        self._client = groq.AsyncGroq(api_key=api_key)

    async def stream(
        self, messages: Sequence[ChatMessage], *, model: str, system_prompt: str
    ) -> AsyncIterator[str]:
        try:
            response = await self._client.chat.completions.create(
                model=model, messages=_payload(messages, system_prompt), stream=True
            )
            async for chunk in response:
                if chunk.choices and (text := chunk.choices[0].delta.content):
                    yield text
        except groq.APIError as exc:
            raise _translate_error(exc) from exc

    async def complete(
        self,
        messages: Sequence[ChatMessage],
        *,
        model: str,
        system_prompt: str,
        max_tokens: int,
    ) -> str:
        """Short non-streaming call for internal tasks. Reasoning is kept minimal and hidden."""
        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=_payload(messages, system_prompt),
                max_completion_tokens=max_tokens,
                reasoning_effort="low",
                include_reasoning=False,
            )
        except groq.APIError as exc:
            raise _translate_error(exc) from exc
        return (response.choices[0].message.content or "").strip()

    async def aclose(self) -> None:
        await self._client.close()
