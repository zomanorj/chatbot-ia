import uuid
from pathlib import PurePath

from fastapi import APIRouter, UploadFile, status
from sqlalchemy import func, select

from app.api.deps import SessionDep, SettingsDep
from app.api.v1.routes.bots import BotDep
from app.core.errors import AppError
from app.models import Document, DocumentKind, DocumentStatus
from app.schemas.document import DocumentRead, TextDocumentCreate
from app.services.extraction import SUPPORTED_EXTENSIONS, ExtractionError, detect_content_type

MAX_DOCUMENTS_PER_BOT = 100
READ_CHUNK_BYTES = 1024 * 1024

router = APIRouter(prefix="/bots/{bot_id}/documents", tags=["documents"])


async def _get_document(session: SessionDep, bot_id: uuid.UUID, document_id: uuid.UUID) -> Document:
    document = await session.scalar(
        select(Document).where(Document.id == document_id, Document.bot_id == bot_id)
    )
    if document is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "document_not_found", "Document not found.")
    return document


async def _check_quota(session: SessionDep, bot_id: uuid.UUID) -> None:
    count = await session.scalar(select(func.count()).where(Document.bot_id == bot_id))
    if count >= MAX_DOCUMENTS_PER_BOT:
        raise AppError(
            status.HTTP_409_CONFLICT,
            "document_limit",
            f"An assistant can hold at most {MAX_DOCUMENTS_PER_BOT} documents.",
        )


async def _read_limited(file: UploadFile, max_bytes: int) -> bytes:
    data = bytearray()
    while chunk := await file.read(READ_CHUNK_BYTES):
        data += chunk
        if len(data) > max_bytes:
            raise AppError(
                status.HTTP_413_CONTENT_TOO_LARGE,
                "file_too_large",
                f"Files are limited to {max_bytes // (1024 * 1024)} MB.",
            )
    return bytes(data)


@router.get("")
async def list_documents(bot: BotDep, session: SessionDep) -> list[DocumentRead]:
    documents = await session.scalars(
        select(Document).where(Document.bot_id == bot.id).order_by(Document.created_at.desc())
    )
    return [DocumentRead.model_validate(d) for d in documents]


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile, bot: BotDep, session: SessionDep, settings: SettingsDep
) -> DocumentRead:
    """Upload a PDF, Word, Excel, CSV, text or Markdown file. Indexing runs in the background."""
    await _check_quota(session, bot.id)
    filename = PurePath(file.filename or "document").name[:255]
    data = await _read_limited(file, settings.max_upload_mb * 1024 * 1024)
    if not data:
        raise AppError(status.HTTP_422_UNPROCESSABLE_CONTENT, "empty_file", "The file is empty.")
    try:
        content_type = detect_content_type(filename, data)
    except ExtractionError as exc:
        raise AppError(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            exc.code,
            f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}.",
        ) from exc

    document = Document(
        bot_id=bot.id,
        kind=DocumentKind.FILE,
        title=filename,
        content_type=content_type,
        size_bytes=len(data),
        raw=data,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return DocumentRead.model_validate(document)


@router.post("/text", status_code=status.HTTP_201_CREATED)
async def create_text_document(
    payload: TextDocumentCreate, bot: BotDep, session: SessionDep
) -> DocumentRead:
    """Add knowledge typed in the dashboard, such as an FAQ entry or a policy."""
    await _check_quota(session, bot.id)
    raw = payload.content.encode()
    document = Document(
        bot_id=bot.id,
        kind=DocumentKind.TEXT,
        title=payload.title,
        content_type="text/plain",
        size_bytes=len(raw),
        raw=raw,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return DocumentRead.model_validate(document)


@router.post("/{document_id}/retry")
async def retry_document(document_id: uuid.UUID, bot: BotDep, session: SessionDep) -> DocumentRead:
    document = await _get_document(session, bot.id, document_id)
    if document.status != DocumentStatus.FAILED:
        raise AppError(
            status.HTTP_409_CONFLICT, "document_not_failed", "Only failed documents can be retried."
        )
    document.status = DocumentStatus.PENDING
    document.error = None
    await session.commit()
    await session.refresh(document)
    return DocumentRead.model_validate(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: uuid.UUID, bot: BotDep, session: SessionDep) -> None:
    document = await _get_document(session, bot.id, document_id)
    await session.delete(document)
    await session.commit()
