import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Bot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bots"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(80))
    instructions: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(2), default="fr")
    welcome_message: Mapped[str] = mapped_column(String(300), default="")
    model: Mapped[str | None] = mapped_column(String(100))
