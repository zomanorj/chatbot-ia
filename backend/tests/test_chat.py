import json
import uuid

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.models import Message, MessageRole
from app.schemas.chat import MAX_HISTORY_CHARS
from app.services.chat import fit_history, make_title
from tests.conftest import FakeLLM

pytestmark = pytest.mark.anyio


def parse_sse(body: str) -> list[tuple[str, dict]]:
    events = []
    for block in body.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.splitlines() if ": " in line)
        if "event" in fields:
            events.append((fields["event"], json.loads(fields["data"])))
    return events


@pytest.fixture
async def bot(client: AsyncClient, auth_headers: dict) -> dict:
    response = await client.post(
        "/api/v1/bots",
        headers=auth_headers,
        json={"name": "Vendeur Ravaka", "instructions": "Livraison gratuite à Tana."},
    )
    return response.json()


async def send(client: AsyncClient, headers: dict, bot: dict, content: str, **extra):
    return await client.post(
        f"/api/v1/bots/{bot['id']}/chat", headers=headers, json={"content": content, **extra}
    )


async def test_first_message_creates_a_conversation(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM
) -> None:
    response = await send(client, auth_headers, bot, "Salama! Mbola misy ve ny akanjo mena?")

    assert response.status_code == 200
    events = parse_sse(response.text)
    assert [name for name, _ in events] == ["conversation", "sources", "token", "token", "done"]
    conversation = events[0][1]
    assert conversation["title"] == "Salama! Mbola misy ve ny akanjo mena?"
    assert events[-1][1]["model"] == get_settings().llm_default_model

    detail = await client.get(
        f"/api/v1/bots/{bot['id']}/conversations/{conversation['id']}", headers=auth_headers
    )
    messages = detail.json()["messages"]
    assert [(m["role"], m["content"]) for m in messages] == [
        ("user", "Salama! Mbola misy ve ny akanjo mena?"),
        ("assistant", "Hello world"),
    ]
    assert messages[1]["id"] == events[-1][1]["message_id"]


async def test_follow_up_sends_history_and_bot_instructions(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM
) -> None:
    first = parse_sse((await send(client, auth_headers, bot, "Bonjour")).text)
    conversation_id = first[0][1]["id"]

    await send(client, auth_headers, bot, "Livrez-vous ?", conversation_id=conversation_id)

    call = fake_llm.calls[-1]
    assert [(m.role, m.content) for m in call["messages"]] == [
        ("user", "Bonjour"),
        ("assistant", "Hello world"),
        ("user", "Livrez-vous ?"),
    ]
    assert "Vendeur Ravaka" in call["system_prompt"]
    assert "Livraison gratuite à Tana." in call["system_prompt"]


async def test_model_precedence(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM
) -> None:
    await client.patch(
        f"/api/v1/bots/{bot['id']}", headers=auth_headers, json={"model": "openai/gpt-oss-20b"}
    )
    await send(client, auth_headers, bot, "Bot default")
    await send(client, auth_headers, bot, "Override", model="openai/gpt-oss-120b")

    assert [c["model"] for c in fake_llm.calls] == ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]


async def test_provider_failure_keeps_partial_reply(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM
) -> None:
    fake_llm.fail_after = 1
    events = parse_sse((await send(client, auth_headers, bot, "Bonjour")).text)

    assert [name for name, _ in events] == ["conversation", "sources", "token", "error"]
    detail = await client.get(
        f"/api/v1/bots/{bot['id']}/conversations/{events[0][1]['id']}", headers=auth_headers
    )
    assert [m["content"] for m in detail.json()["messages"]] == ["Bonjour", "Hello"]


async def test_unknown_conversation(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM
) -> None:
    response = await send(client, auth_headers, bot, "Hi", conversation_id=str(uuid.uuid4()))

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "conversation_not_found"
    assert fake_llm.calls == []


async def test_validates_before_checking_llm(
    client: AsyncClient, auth_headers: dict, bot: dict
) -> None:
    assert (await send(client, auth_headers, bot, "   ")).status_code == 422

    response = await send(client, auth_headers, bot, "Hi")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "llm_not_configured"


async def test_rejects_unknown_model(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM
) -> None:
    response = await send(client, auth_headers, bot, "Hi", model="gpt-unknown")
    assert response.json()["error"]["code"] == "unknown_model"


async def test_chat_is_rate_limited_per_user(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM, monkeypatch
) -> None:
    monkeypatch.setattr(get_settings(), "chat_rate_limit", "1/minute")
    assert (await send(client, auth_headers, bot, "Hi")).status_code == 200

    response = await send(client, auth_headers, bot, "Hi again")
    assert response.status_code == 429
    assert 0 < int(response.headers["retry-after"]) <= 60


async def test_list_and_delete_conversations(
    client: AsyncClient, auth_headers: dict, bot: dict, fake_llm: FakeLLM
) -> None:
    older = parse_sse((await send(client, auth_headers, bot, "Première")).text)[0][1]["id"]
    newer = parse_sse((await send(client, auth_headers, bot, "Deuxième")).text)[0][1]["id"]
    base = f"/api/v1/bots/{bot['id']}/conversations"

    listed = (await client.get(base, headers=auth_headers)).json()
    assert [c["id"] for c in listed] == [newer, older]

    assert (await client.delete(f"{base}/{older}", headers=auth_headers)).status_code == 204
    assert [c["id"] for c in (await client.get(base, headers=auth_headers)).json()] == [newer]


async def test_list_models(client: AsyncClient) -> None:
    response = await client.get("/api/v1/chat/models")
    settings = get_settings()
    assert response.json() == {"default": settings.llm_default_model, "models": settings.llm_models}


async def test_unknown_route_uses_error_envelope(client: AsyncClient) -> None:
    response = await client.get("/api/v1/nope")
    assert response.json() == {"error": {"code": "not_found", "message": "Not Found"}}


def test_make_title_truncates_on_word_boundary() -> None:
    assert make_title("  Salama   tompoko  ") == "Salama tompoko"
    title = make_title("Mbola misy ve " * 10)
    assert len(title) <= 61
    assert title.endswith("…")
    assert not title.endswith(" …")


def test_fit_history_keeps_most_recent_within_budget() -> None:
    messages = [Message(role=MessageRole.USER, content="x" * 6_000) for _ in range(5)]
    kept = fit_history(messages)
    assert sum(len(m.content) for m in kept) <= MAX_HISTORY_CHARS
    assert len(kept) == MAX_HISTORY_CHARS // 6_000
