import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import VECTOR
from sqlalchemy import DateTime, ForeignKey, Index, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, deferred, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import str_enum

EMBEDDING_DIM = 384


class DocumentKind(enum.StrEnum):
    FILE = "file"
    TEXT = "text"


class DocumentStatus(enum.StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Document(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "documents"
    # Partial index: the worker only ever scans the queue of unfinished documents.
    __table_args__ = (
        Index(
            "ix_documents_queue",
            "status",
            "created_at",
            postgresql_where="status IN ('pending', 'processing')",
        ),
    )

    bot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bots.id", ondelete="CASCADE"), index=True)
    kind: Mapped[DocumentKind] = mapped_column(str_enum(DocumentKind))
    title: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    # Original bytes, kept so documents can be re-indexed when the pipeline changes.
    raw: Mapped[bytes] = deferred(mapped_column(LargeBinary))
    status: Mapped[DocumentStatus] = mapped_column(
        str_enum(DocumentStatus), default=DocumentStatus.PENDING
    )
    error: Mapped[str | None] = mapped_column(String(255))
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    processing_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan", passive_deletes=True
    )


class Chunk(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "chunks"
    __table_args__ = (
        Index(
            "ix_chunks_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    # Denormalized so similarity search filters on one table.
    bot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bots.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(VECTOR(EMBEDDING_DIM))

    document: Mapped[Document] = relationship(back_populates="chunks")
