from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, model_validator

MAX_MESSAGES = 50
MAX_MESSAGE_CHARS = 4_000
MAX_TOTAL_CHARS = 16_000

MessageContent = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_MESSAGE_CHARS)
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: MessageContent


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    model: str | None = None

    @model_validator(mode="after")
    def _check_conversation(self) -> "ChatRequest":
        if self.messages[-1].role != "user":
            raise ValueError("The last message must come from the user.")
        if sum(len(m.content) for m in self.messages) > MAX_TOTAL_CHARS:
            raise ValueError(f"Conversation exceeds {MAX_TOTAL_CHARS} characters.")
        return self


class ModelList(BaseModel):
    default: str
    models: list[str]


class TokenEvent(BaseModel):
    text: str


class DoneEvent(BaseModel):
    model: str


class ErrorEvent(BaseModel):
    code: str
    message: str
