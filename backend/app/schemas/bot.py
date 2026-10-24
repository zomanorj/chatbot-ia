import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

Language = Literal["fr", "mg", "en"]
BotName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Instructions = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]
WelcomeMessage = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]


class BotCreate(BaseModel):
    name: BotName
    instructions: Instructions = ""
    language: Language = "fr"
    welcome_message: WelcomeMessage = ""
    model: str | None = None


class BotUpdate(BaseModel):
    name: BotName | None = None
    instructions: Instructions | None = None
    language: Language | None = None
    welcome_message: WelcomeMessage | None = None
    model: str | None = None


class BotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    instructions: str
    language: Language
    welcome_message: str
    model: str | None
    created_at: datetime
    updated_at: datetime
