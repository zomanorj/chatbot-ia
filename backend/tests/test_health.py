import pytest
from httpx import AsyncClient

from app.api.deps import get_db_session, get_redis
from app.main import app

pytestmark = pytest.mark.anyio


class FakeSession:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    async def execute(self, _statement: object) -> None:
        if self.fail:
            raise ConnectionError("database unreachable")


class FakeRedis:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail

    async def ping(self) -> bool:
        if self.fail:
            raise ConnectionError("redis unreachable")
        return True


def override(db_fails: bool = False, redis_fails: bool = False) -> None:
    async def session_override():
        yield FakeSession(db_fails)

    app.dependency_overrides[get_db_session] = session_override
    app.dependency_overrides[get_redis] = lambda: FakeRedis(redis_fails)


async def test_liveness(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_readiness_ok(client: AsyncClient) -> None:
    override()
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "checks": {"database": "ok", "redis": "ok"}}


@pytest.mark.parametrize(
    ("db_fails", "redis_fails", "expected"),
    [
        (True, False, {"database": "error", "redis": "ok"}),
        (False, True, {"database": "ok", "redis": "error"}),
    ],
)
async def test_readiness_degraded(
    client: AsyncClient, db_fails: bool, redis_fails: bool, expected: dict[str, str]
) -> None:
    override(db_fails, redis_fails)
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "error", "checks": expected}
