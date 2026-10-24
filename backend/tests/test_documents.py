import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.core.config import get_settings
from app.main import app
from app.models import Chunk
from app.workers.ingestion import run_once
from tests.conftest import create_bot, register
from tests.factories import make_pdf

pytestmark = pytest.mark.anyio


async def upload(client: AsyncClient, headers: dict, bot: dict, filename: str, data: bytes):
    return await client.post(
        f"/api/v1/bots/{bot['id']}/documents", headers=headers, files={"file": (filename, data)}
    )


async def process_queue() -> int:
    processed = 0
    while await run_once(app.state.session_factory, app.state.embedder):
        processed += 1
    return processed


@pytest.fixture
async def bot(client: AsyncClient, auth_headers: dict) -> dict:
    return await create_bot(client, auth_headers)


async def test_upload_is_indexed_by_the_worker(client: AsyncClient, auth_headers, bot, db) -> None:
    response = await upload(
        client, auth_headers, bot, "tarifs.pdf", make_pdf("Livraison gratuite a Tana")
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["content_type"] == "application/pdf"

    assert await process_queue() == 1

    documents = (
        await client.get(f"/api/v1/bots/{bot['id']}/documents", headers=auth_headers)
    ).json()
    assert documents[0]["status"] == "ready"
    assert documents[0]["chunk_count"] == 1
    async with db() as session:
        chunk = await session.scalar(select(Chunk))
        assert "Livraison gratuite" in chunk.content
        assert len(chunk.embedding) == 384


async def test_text_document(client: AsyncClient, auth_headers, bot) -> None:
    response = await client.post(
        f"/api/v1/bots/{bot['id']}/documents/text",
        headers=auth_headers,
        json={"title": "Horaires", "content": "Ouvert du lundi au samedi, 8h-18h."},
    )
    assert response.status_code == 201
    assert response.json()["kind"] == "text"
    await process_queue()
    documents = (
        await client.get(f"/api/v1/bots/{bot['id']}/documents", headers=auth_headers)
    ).json()
    assert documents[0]["status"] == "ready"


async def test_unreadable_file_fails_with_a_reason_and_can_be_retried(
    client: AsyncClient, auth_headers, bot
) -> None:
    created = (await upload(client, auth_headers, bot, "scan.pdf", make_pdf())).json()
    await process_queue()
    url = f"/api/v1/bots/{bot['id']}/documents"

    failed = (await client.get(url, headers=auth_headers)).json()[0]
    assert (failed["status"], failed["error"]) == ("failed", "no_text")

    retried = await client.post(f"{url}/{created['id']}/retry", headers=auth_headers)
    assert retried.json()["status"] == "pending"
    again = await client.post(f"{url}/{created['id']}/retry", headers=auth_headers)
    assert again.status_code == 409


@pytest.mark.parametrize(
    ("filename", "data", "status_code", "code"),
    [
        ("virus.exe", b"MZ...", 415, "unsupported_type"),
        ("fake.pdf", b"hello", 415, "corrupted_file"),
        ("empty.txt", b"", 422, "empty_file"),
    ],
)
async def test_upload_validation(
    client: AsyncClient, auth_headers, bot, filename, data, status_code, code
) -> None:
    response = await upload(client, auth_headers, bot, filename, data)
    assert response.status_code == status_code
    assert response.json()["error"]["code"] == code


async def test_upload_size_limit(client: AsyncClient, auth_headers, bot, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)
    response = await upload(client, auth_headers, bot, "big.txt", b"a" * (1024 * 1024 + 1))
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "file_too_large"


async def test_delete_document_removes_its_chunks(
    client: AsyncClient, auth_headers, bot, db
) -> None:
    created = (await upload(client, auth_headers, bot, "faq.txt", b"Livraison gratuite")).json()
    await process_queue()

    url = f"/api/v1/bots/{bot['id']}/documents/{created['id']}"
    assert (await client.delete(url, headers=auth_headers)).status_code == 204
    async with db() as session:
        assert await session.scalar(select(func.count()).select_from(Chunk)) == 0


async def test_documents_are_isolated(client: AsyncClient, auth_headers, bot) -> None:
    created = (await upload(client, auth_headers, bot, "faq.txt", b"Secret")).json()
    intruder = await register(client, email="rival@shop.mg", organization="Rival")
    base = f"/api/v1/bots/{bot['id']}/documents"

    for method, url in [("GET", base), ("DELETE", f"{base}/{created['id']}")]:
        response = await client.request(method, url, headers=intruder)
        assert response.status_code == 404
    assert (await upload(client, intruder, bot, "x.txt", b"x")).status_code == 404
