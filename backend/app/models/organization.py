import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import str_enum

if TYPE_CHECKING:
    from app.models.user import User


class Role(enum.StrEnum):
    OWNER = "owner"
    MEMBER = "member"


class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(120))

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )


class Membership(CreatedAtMixin, Base):
    __tablename__ = "memberships"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[Role] = mapped_column(str_enum(Role))

    user: Mapped["User"] = relationship(back_populates="memberships")
    organization: Mapped[Organization] = relationship(back_populates="memberships")
