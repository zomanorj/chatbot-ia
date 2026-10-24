from datetime import timedelta

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.services import auth as auth_service
from tests.conftest import register

pytestmark = [pytest.mark.anyio, pytest.mark.usefixtures("db")]

COOKIE = "mpanampy_refresh"


async def login(client: AsyncClient, email: str, password: str = "correct-horse-battery"):
    return await client.post("/api/v1/auth/login", json={"email": email, "password": password})


async def test_register_opens_a_session(client: AsyncClient) -> None:
    headers = await register(client, email="Owner@Ravaka.MG")

    assert client.cookies.get(COOKIE)
    me = (await client.get("/api/v1/auth/me", headers=headers)).json()
    assert me["user"]["email"] == "owner@ravaka.mg"
    assert me["organizations"][0]["name"] == "Boutique Ravaka"
    assert me["organizations"][0]["role"] == "owner"


async def test_register_rejects_duplicate_email_case_insensitively(client: AsyncClient) -> None:
    await register(client, email="owner@ravaka.mg")
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "OWNER@ravaka.mg",
            "password": "another-password",
            "full_name": "Someone",
            "organization_name": "Other",
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"


async def test_register_rejects_short_password(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "a@b.mg", "password": "short", "full_name": "A", "organization_name": "B"},
    )
    assert response.status_code == 422


async def test_login(client: AsyncClient) -> None:
    await register(client)
    client.cookies.clear()

    response = await login(client, "OWNER@ravaka.mg")

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert client.cookies.get(COOKIE)


@pytest.mark.parametrize(
    ("email", "password"),
    [("owner@ravaka.mg", "wrong-password"), ("nobody@ravaka.mg", "correct-horse-battery")],
    ids=["wrong-password", "unknown-email"],
)
async def test_login_failures_are_indistinguishable(
    client: AsyncClient, email: str, password: str
) -> None:
    await register(client)
    response = await login(client, email, password)

    assert response.status_code == 401
    assert response.json() == {
        "error": {"code": "invalid_credentials", "message": "Incorrect email or password."}
    }


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer not-a-jwt"}, {"Authorization": "Basic abc"}],
    ids=["missing", "garbage", "wrong-scheme"],
)
async def test_protected_routes_require_a_valid_token(client: AsyncClient, headers) -> None:
    response = await client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "not_authenticated"
    assert response.headers["www-authenticate"] == "Bearer"


async def test_expired_access_token_is_rejected(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "access_token_ttl_minutes", -1)
    headers = await register(client)

    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 401


async def test_refresh_rotates_the_cookie(client: AsyncClient) -> None:
    await register(client)
    first_cookie = client.cookies.get(COOKIE)

    response = await client.post("/api/v1/auth/refresh")

    assert response.status_code == 200
    assert client.cookies.get(COOKIE) != first_cookie
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
    assert (await client.get("/api/v1/auth/me", headers=headers)).status_code == 200


async def test_replayed_refresh_token_revokes_all_sessions(
    client: AsyncClient, monkeypatch
) -> None:
    monkeypatch.setattr(auth_service, "REUSE_GRACE_PERIOD", timedelta(0))
    await register(client)
    stolen = client.cookies.get(COOKIE)
    await client.post("/api/v1/auth/refresh")
    legitimate = client.cookies.get(COOKIE)

    client.cookies.set(COOKIE, stolen, path="/api/v1/auth")
    replay = await client.post("/api/v1/auth/refresh")
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "invalid_session"

    client.cookies.set(COOKIE, legitimate, path="/api/v1/auth")
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


async def test_concurrent_refresh_within_grace_period_keeps_sessions(
    client: AsyncClient,
) -> None:
    await register(client)
    shared = client.cookies.get(COOKIE)
    await client.post("/api/v1/auth/refresh")
    winner = client.cookies.get(COOKIE)

    client.cookies.set(COOKIE, shared, path="/api/v1/auth")
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401

    client.cookies.set(COOKIE, winner, path="/api/v1/auth")
    assert (await client.post("/api/v1/auth/refresh")).status_code == 200


async def test_logout_revokes_the_session(client: AsyncClient) -> None:
    await register(client)
    cookie = client.cookies.get(COOKIE)

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    client.cookies.set(COOKIE, cookie, path="/api/v1/auth")
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


async def test_refresh_without_cookie(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401


async def test_login_is_rate_limited(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "auth_rate_limit", "2/minute")
    for _ in range(2):
        await login(client, "nobody@ravaka.mg")

    response = await login(client, "nobody@ravaka.mg")
    assert response.status_code == 429
