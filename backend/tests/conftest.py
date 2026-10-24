from collections.abc import AsyncIterator, Sequence

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_llm
from app.core.rate_limit import RateLimiter
from app.main import app
from app.schemas.chat import ChatMessage
from app.services.llm import LLMError


class FakeLLM:
    def __init__(self, tokens: Sequence[str] = ("Hello", " world"), fail_after: int | None = None):
        self.tokens = tokens
        self.fail_after = fail_after
        self.calls: list[dict] = []

    async def stream(
        self, messages: Sequence[ChatMessage], *, model: str, system_prompt: str
    ) -> AsyncIterator[str]:
        self.calls.append({"messages": list(messages), "model": model})
        for index, token in enumerate(self.tokens):
            if self.fail_after is not None and index == self.fail_after:
                raise LLMError("provider_error", "The AI service failed to answer.")
            yield token

    async def aclose(self) -> None:
        pass


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def fake_llm() -> FakeLLM:
    llm = FakeLLM()
    app.dependency_overrides[get_llm] = lambda: llm
    return llm


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    # ASGITransport skips the lifespan, so tests never touch real services.
    app.state.rate_limiter = RateLimiter("async+memory://")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
