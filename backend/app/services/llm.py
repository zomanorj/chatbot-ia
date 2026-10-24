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

    async def aclose(self) -> None: ...


class GroqProvider:
    def __init__(self, api_key: str) -> None:
        self._client = groq.AsyncGroq(api_key=api_key)

    async def stream(
        self, messages: Sequence[ChatMessage], *, model: str, system_prompt: str
    ) -> AsyncIterator[str]:
        payload = [{"role": "system", "content": system_prompt}]
        payload += [{"role": m.role, "content": m.content} for m in messages]
        try:
            response = await self._client.chat.completions.create(
                model=model, messages=payload, stream=True
            )
            async for chunk in response:
                if chunk.choices and (text := chunk.choices[0].delta.content):
                    yield text
        except groq.RateLimitError as exc:
            raise LLMError(
                "provider_busy", "The AI service is busy. Please retry shortly."
            ) from exc
        except groq.APIConnectionError as exc:
            raise LLMError("provider_unreachable", "The AI service is unreachable.") from exc
        except groq.APIError as exc:
            logger.exception("Groq API error")
            raise LLMError("provider_error", "The AI service failed to answer.") from exc

    async def aclose(self) -> None:
        await self._client.close()
