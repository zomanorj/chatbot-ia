import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import Channel, MessageRole
from app.schemas.chat import Source


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    channel: Channel
    created_at: datetime
    updated_at: datetime


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: MessageRole
    content: str
    model: str | None
    sources: list[Source] | None
    created_at: datetime


class ConversationDetail(ConversationSummary):
    messages: list[MessageRead]
