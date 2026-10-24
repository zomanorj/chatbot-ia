import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

MAX_MESSAGE_CHARS = 4_000
MAX_HISTORY_CHARS = 16_000
MAX_HISTORY_MESSAGES = 30

MessageContent = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_MESSAGE_CHARS)
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatTurnRequest(BaseModel):
    content: MessageContent
    conversation_id: uuid.UUID | None = None
    model: str | None = None


class ModelList(BaseModel):
    default: str
    models: list[str]


class ConversationEvent(BaseModel):
    id: uuid.UUID
    title: str


class TokenEvent(BaseModel):
    text: str


class DoneEvent(BaseModel):
    model: str
    message_id: uuid.UUID | None


class ErrorEvent(BaseModel):
    code: str
    message: str
