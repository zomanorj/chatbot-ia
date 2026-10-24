import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.models import DocumentKind, DocumentStatus


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: DocumentKind
    title: str
    content_type: str
    size_bytes: int
    status: DocumentStatus
    error: str | None
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class TextDocumentCreate(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    content: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50_000)
    ]
