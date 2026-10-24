import json

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import get_settings
from app.models import Lead, UnansweredQuestion
from tests.conftest import FakeLLM, create_bot
from tests.test_documents import process_queue

pytestmark = pytest.mark.anyio

FAQ = (
    "Livraison: la livraison est gratuite a Antananarivo des 50 000 Ar d'achat.\n\n"
    "Paiement: nous acceptons MVola, Orange Money et les especes."
)


def events(body: str) -> dict[str, list[dict]]:
    found: dict[str, list[dict]] = {}
    for block in body.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.splitlines() if ": " in line)
        if "event" in fields:
            found.setdefault(fields["event"], []).append(json.loads(fields["data"]))
    return found


@pytest.fixture(autouse=True)
def calibrate(monkeypatch) -> None:
    # The fake embedder yields lower similarities than E5: use matching thresholds.
    monkeypatch.setattr(get_settings(), "rag_context_floor", 0.3)
    monkeypatch.setattr(get_settings(), "rag_min_score", 0.3)


@pytest.fixture
async def bot(client: AsyncClient, auth_headers: dict) -> dict:
    bot = await create_bot(client, auth_headers)
    await client.post(
        f"/api/v1/bots/{bot['id']}/documents/text",
        headers=auth_headers,
        json={"title": "FAQ", "content": FAQ},
    )
    await process_queue()
    return bot


async def ask(
    client: AsyncClient, headers: dict, bot: dict, content: str, conversation_id: str | None = None
) -> dict:
    response = await client.post(
        f"/api/v1/bots/{bot['id']}/chat",
        headers=headers,
        json={"content": content, "conversation_id": conversation_id},
    )
    assert response.status_code == 200, response.text
    return events(response.text)


async def test_reply_is_grounded_on_documents(
    client: AsyncClient, auth_headers, bot, fake_llm: FakeLLM
) -> None:
    fake_llm.rewrite = "livraison gratuite Antananarivo | free delivery Antananarivo"
    found = await ask(client, auth_headers, bot, "Maimaim-poana ve ny fanaterana?")

    assert [s["title"] for s in found["sources"][0]["sources"]] == ["FAQ"]
    prompt = fake_llm.calls[-1]["system_prompt"]
    assert "la livraison est gratuite a Antananarivo" in prompt

    conversation = found["conversation"][0]["id"]
    detail = await client.get(
        f"/api/v1/bots/{bot['id']}/conversations/{conversation}", headers=auth_headers
    )
    assert detail.json()["messages"][1]["sources"][0]["title"] == "FAQ"


async def test_unknown_topic_is_recorded_as_unanswered(
    client: AsyncClient, auth_headers, bot, fake_llm: FakeLLM, db
) -> None:
    fake_llm.rewrite = "garantie retour produit | product return warranty"
    found = await ask(client, auth_headers, bot, "Quelle est votre garantie ?")

    assert found["sources"][0]["sources"] == []
    assert "do not guess" in fake_llm.calls[-1]["system_prompt"]
    async with db() as session:
        unanswered = await session.scalar(select(UnansweredQuestion))
        assert unanswered.question == "Quelle est votre garantie ?"


async def test_small_talk_skips_search(
    client: AsyncClient, auth_headers, bot, fake_llm: FakeLLM, db
) -> None:
    fake_llm.rewrite = "NONE"
    found = await ask(client, auth_headers, bot, "Merci beaucoup !")

    assert found["sources"][0]["sources"] == []
    async with db() as session:
        assert await session.scalar(select(UnansweredQuestion)) is None


async def test_bot_without_documents_does_not_search(
    client: AsyncClient, auth_headers, fake_llm: FakeLLM
) -> None:
    empty_bot = await create_bot(client, auth_headers, name="Sans documents")
    await ask(client, auth_headers, empty_bot, "Bonjour")
    assert fake_llm.complete_calls == []


async def test_contact_details_become_leads(
    client: AsyncClient, auth_headers, bot, fake_llm: FakeLLM, db
) -> None:
    first = await ask(client, auth_headers, bot, "Rappelez-moi au 034 12 345 67 ou ravaka@mail.mg")
    conversation_id = first["conversation"][0]["id"]
    await ask(client, auth_headers, bot, "Je répète : 034 12 345 67", conversation_id)

    async with db() as session:
        leads = (await session.scalars(select(Lead).order_by(Lead.contact))).all()
    assert [(lead.contact_type, lead.contact) for lead in leads] == [
        ("phone", "+261 34 12 345 67"),
        ("email", "ravaka@mail.mg"),
    ]


async def test_rewrite_can_be_disabled(
    client: AsyncClient, auth_headers, bot, fake_llm: FakeLLM, monkeypatch
) -> None:
    monkeypatch.setattr(get_settings(), "rag_query_rewrite", False)
    found = await ask(client, auth_headers, bot, "livraison gratuite Antananarivo ?")

    assert fake_llm.complete_calls == []
    assert found["sources"][0]["sources"]
