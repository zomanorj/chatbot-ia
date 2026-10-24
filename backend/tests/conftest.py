import os
from collections.abc import AsyncIterator, Sequence
from pathlib import Path

import anyio
import pytest
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from alembic import command
from app.core.rate_limit import RateLimiter
from app.main import app
from app.schemas.chat import ChatMessage
from app.services.llm import LLMError

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://mpanampy:mpanampy@localhost:5432/mpanampy_test"
)
BACKEND_DIR = Path(__file__).resolve().parents[1]


class FakeLLM:
    def __init__(self, tokens: Sequence[str] = ("Hello", " world"), fail_after: int | None = None):
        self.tokens = tokens
        self.fail_after = fail_after
        self.calls: list[dict] = []

    async def stream(
        self, messages: Sequence[ChatMessage], *, model: str, system_prompt: str
    ) -> AsyncIterator[str]:
        self.calls.append(
            {"messages": list(messages), "model": model, "system_prompt": system_prompt}
        )
        for index, token in enumerate(self.tokens):
            if self.fail_after is not None and index == self.fail_after:
                raise LLMError("provider_error", "The AI service failed to answer.")
            yield token

    async def aclose(self) -> None:
        pass


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


async def _create_database_if_missing(url: str) -> None:
    target = make_url(url)
    admin = create_async_engine(
        target.set(database="postgres"), isolation_level="AUTOCOMMIT", poolclass=NullPool
    )
    async with admin.connect() as conn:
        exists = await conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": target.database}
        )
        if not exists:
            await conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    await admin.dispose()


@pytest.fixture(scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    await _create_database_if_missing(TEST_DATABASE_URL)
    config = Config(BACKEND_DIR / "alembic.ini")
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    # Migrations run their own event loop, so they go to a worker thread.
    await anyio.to_thread.run_sync(command.upgrade, config, "head")

    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db(engine: AsyncEngine) -> AsyncIterator[async_sessionmaker]:
    factory = async_sessionmaker(engine, expire_on_commit=False)
    app.state.session_factory = factory
    yield factory
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE users, organizations CASCADE"))


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    # ASGITransport skips the lifespan: services are wired explicitly per test.
    app.state.rate_limiter = RateLimiter("async+memory://")
    app.state.llm = None
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def fake_llm() -> FakeLLM:
    llm = FakeLLM()
    app.state.llm = llm
    return llm


async def register(
    client: AsyncClient, email: str = "owner@ravaka.mg", organization: str = "Boutique Ravaka"
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "correct-horse-battery",
            "full_name": "Ravaka Rakoto",
            "organization_name": organization,
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
async def auth_headers(db, client: AsyncClient) -> dict[str, str]:
    return await register(client)
