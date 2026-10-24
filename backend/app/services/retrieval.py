import uuid
from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chunk, Document
from app.services.embeddings import Embedder


@dataclass(frozen=True)
class Passage:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    title: str
    content: str
    score: float


async def search(
    session: AsyncSession,
    embedder: Embedder,
    bot_id: uuid.UUID,
    queries: Sequence[str],
    *,
    limit: int,
) -> list[Passage]:
    """Cosine search over the bot's passages. Several phrasings are merged by best score."""
    # Keeps scanning the HNSW index until enough rows pass the bot filter (pgvector >= 0.8).
    await session.execute(text("SET LOCAL hnsw.iterative_scan = relaxed_order"))
    best: dict[uuid.UUID, Passage] = {}

    for query in dict.fromkeys(q for q in queries if q.strip()):
        vector = await embedder.embed_query(query)
        distance = Chunk.embedding.cosine_distance(vector)
        rows = await session.execute(
            select(Chunk.id, Chunk.document_id, Document.title, Chunk.content, distance)
            .join(Document, Document.id == Chunk.document_id)
            .where(Chunk.bot_id == bot_id)
            .order_by(distance)
            .limit(limit)
        )
        for chunk_id, document_id, title, content, dist in rows:
            score = 1.0 - float(dist)
            if chunk_id not in best or score > best[chunk_id].score:
                best[chunk_id] = Passage(chunk_id, document_id, title, content, score)

    return sorted(best.values(), key=lambda p: p.score, reverse=True)[:limit]
