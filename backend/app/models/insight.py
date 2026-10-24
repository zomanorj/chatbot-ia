import uuid

from sqlalchemy import Boolean, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class Lead(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Contact details a customer left in a conversation."""

    __tablename__ = "leads"
    __table_args__ = (UniqueConstraint("conversation_id", "contact"),)

    bot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bots.id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE")
    )
    contact: Mapped[str] = mapped_column(String(320))
    contact_type: Mapped[str] = mapped_column(String(10))
    message: Mapped[str] = mapped_column(Text)


class UnansweredQuestion(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    """Customer question for which the knowledge base had no relevant passage."""

    __tablename__ = "unanswered_questions"

    bot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bots.id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE")
    )
    question: Mapped[str] = mapped_column(Text)
    best_score: Mapped[float | None] = mapped_column(Float)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
