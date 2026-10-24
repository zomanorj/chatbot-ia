import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import FakeLLM, register

pytestmark = pytest.mark.anyio


async def create_bot(client: AsyncClient, headers: dict, **fields) -> dict:
    response = await client.post(
        "/api/v1/bots", headers=headers, json={"name": "Vendeur Ravaka", **fields}
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_bot_lifecycle(client: AsyncClient, auth_headers: dict) -> None:
    bot = await create_bot(
        client, auth_headers, instructions="Livraison gratuite à Tana.", language="mg"
    )
    assert bot["language"] == "mg"
    assert bot["model"] is None

    listed = (await client.get("/api/v1/bots", headers=auth_headers)).json()
    assert [b["id"] for b in listed] == [bot["id"]]

    updated = await client.patch(
        f"/api/v1/bots/{bot['id']}",
        headers=auth_headers,
        json={"name": "Mpivarotra", "model": "openai/gpt-oss-20b"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Mpivarotra"
    assert updated.json()["instructions"] == "Livraison gratuite à Tana."

    assert (
        await client.delete(f"/api/v1/bots/{bot['id']}", headers=auth_headers)
    ).status_code == 204
    assert (await client.get(f"/api/v1/bots/{bot['id']}", headers=auth_headers)).status_code == 404


@pytest.mark.parametrize(
    "payload",
    [{"name": "  "}, {"name": "x" * 81}, {"name": "Bot", "language": "de"}],
    ids=["blank-name", "long-name", "unsupported-language"],
)
async def test_create_bot_validation(client: AsyncClient, auth_headers: dict, payload) -> None:
    response = await client.post("/api/v1/bots", headers=auth_headers, json=payload)
    assert response.status_code == 422


async def test_create_bot_rejects_unknown_model(client: AsyncClient, auth_headers: dict) -> None:
    response = await client.post(
        "/api/v1/bots", headers=auth_headers, json={"name": "Bot", "model": "gpt-unknown"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unknown_model"


async def test_organizations_are_isolated(
    client: AsyncClient, auth_headers: dict, fake_llm: FakeLLM
) -> None:
    bot = await create_bot(client, auth_headers)
    chat = await client.post(
        f"/api/v1/bots/{bot['id']}/chat", headers=auth_headers, json={"content": "Salama"}
    )
    conversation_id = chat.text.split('"id":"')[1].split('"')[0]
    intruder = await register(client, email="rival@shop.mg", organization="Rival Shop")
    base = f"/api/v1/bots/{bot['id']}"

    assert (await client.get("/api/v1/bots", headers=intruder)).json() == []
    for method, url, body in [
        ("GET", base, None),
        ("PATCH", base, {"name": "Hacked"}),
        ("DELETE", base, None),
        ("GET", f"{base}/conversations", None),
        ("GET", f"{base}/conversations/{conversation_id}", None),
        ("DELETE", f"{base}/conversations/{conversation_id}", None),
        ("POST", f"{base}/chat", {"content": "Salama"}),
    ]:
        response = await client.request(method, url, headers=intruder, json=body)
        assert response.status_code == 404, f"{method} {url}"
        assert response.json()["error"]["code"] == "bot_not_found"

    owner_view = await client.get(base, headers=auth_headers)
    assert owner_view.json()["name"] == "Vendeur Ravaka"


async def test_foreign_organization_header_is_forbidden(
    client: AsyncClient, auth_headers: dict
) -> None:
    response = await client.get(
        "/api/v1/bots", headers={**auth_headers, "X-Organization-ID": str(uuid.uuid4())}
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "organization_forbidden"
