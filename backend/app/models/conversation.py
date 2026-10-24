import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin
from app.db.types import str_enum


class Channel(enum.StrEnum):
    PLAYGROUND = "playground"
    WIDGET = "widget"
    MESSENGER = "messenger"


class MessageRole(enum.StrEnum):
    USER = "user"
    ASSISTANT = "assistant"


class Conversation(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (Index("ix_conversations_bot_id_updated_at", "bot_id", "updated_at"),)

    bot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bots.id", ondelete="CASCADE"))
    channel: Mapped[Channel] = mapped_column(str_enum(Channel))
    title: Mapped[str] = mapped_column(String(120))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[MessageRole] = mapped_column(str_enum(MessageRole))
    content: Mapped[str] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(100))
    # Documents the reply was grounded on: [{"document_id", "title"}].
    sources: Mapped[list[dict] | None] = mapped_column(JSONB)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
