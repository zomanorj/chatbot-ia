import enum

from sqlalchemy import Enum


def str_enum(enum_cls: type[enum.StrEnum]) -> Enum:
    """VARCHAR + CHECK constraint: portable, and new values need no ALTER TYPE."""
    return Enum(
        enum_cls,
        native_enum=False,
        create_constraint=True,
        length=20,
        values_callable=lambda members: [m.value for m in members],
    )
