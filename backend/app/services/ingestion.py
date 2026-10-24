import logging
from datetime import UTC, datetime, timedelta

import anyio
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.models import Chunk, Document, DocumentStatus
from app.services.chunking import chunk_blocks
from app.services.embeddings import Embedder
from app.services.extraction import ExtractionError, extract_blocks

logger = logging.getLogger(__name__)

# A document stuck in "processing" this long belongs to a crashed worker.
STALE_AFTER = timedelta(minutes=10)


async def claim_next_document(session: AsyncSession) -> Document | None:
    """Take the oldest queued document. SKIP LOCKED lets several workers run safely."""
    now = datetime.now(UTC)
    document = await session.scalar(
        select(Document)
        .where(
            or_(
                Document.status == DocumentStatus.PENDING,
                and_(
                    Document.status == DocumentStatus.PROCESSING,
                    Document.processing_started_at < now - STALE_AFTER,
                ),
            )
        )
        .order_by(Document.created_at)
        .limit(1)
        .with_for_update(skip_locked=True)
        .options(undefer(Document.raw))
    )
    if document is None:
        return None
    document.status = DocumentStatus.PROCESSING
    document.processing_started_at = now
    await session.commit()
    return document


async def process_document(session: AsyncSession, embedder: Embedder, document: Document) -> None:
    try:
        blocks = await anyio.to_thread.run_sync(extract_blocks, document.content_type, document.raw)
        texts = chunk_blocks(blocks)
        # The title gives each passage context ("Tarifs livraison", "Catalogue été"...).
        vectors = await embedder.embed_passages([f"{document.title}\n{text}" for text in texts])
    except ExtractionError as exc:
        await _finish(session, document, DocumentStatus.FAILED, error=exc.code)
        return
    except Exception:
        logger.exception("Failed to process document %s", document.id)
        await _finish(session, document, DocumentStatus.FAILED, error="processing_failed")
        return

    await session.execute(delete(Chunk).where(Chunk.document_id == document.id))
    session.add_all(
        Chunk(
            document_id=document.id,
            bot_id=document.bot_id,
            position=position,
            content=text,
            embedding=vector,
        )
        for position, (text, vector) in enumerate(zip(texts, vectors, strict=True))
    )
    await _finish(session, document, DocumentStatus.READY, chunk_count=len(texts))


async def _finish(
    session: AsyncSession,
    document: Document,
    status: DocumentStatus,
    *,
    error: str | None = None,
    chunk_count: int = 0,
) -> None:
    document.status = status
    document.error = error
    document.chunk_count = chunk_count
    document.processing_started_at = None
    try:
        await session.commit()
    except SQLAlchemyError:
        # Typically the document was deleted while it was being processed.
        await session.rollback()
        logger.warning("Could not save result for document %s", document.id)
