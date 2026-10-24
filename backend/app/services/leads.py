import re
import uuid

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Lead

# Malagasy mobile numbers: 03X XX XXX XX, optionally with +261 / 261 instead of the leading 0.
_PHONE = re.compile(
    r"(?<![\w+/-])(?:\+?261[\s.-]?|0)(3[2-9])[\s.-]?(\d{2})[\s.-]?(\d{3})[\s.-]?(\d{2})(?!\d)"
)
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-zA-Z]{2,}")


def detect_contacts(text: str) -> list[tuple[str, str]]:
    """Return (type, normalized value) pairs found in a customer message."""
    contacts = [("phone", "+261 {} {} {} {}".format(*m.groups())) for m in _PHONE.finditer(text)]
    contacts += [("email", m.group(0).lower()) for m in _EMAIL.finditer(text)]
    return list(dict.fromkeys(contacts))


async def record_leads(
    session: AsyncSession, *, bot_id: uuid.UUID, conversation_id: uuid.UUID, message: str
) -> int:
    contacts = detect_contacts(message)
    for contact_type, contact in contacts:
        await session.execute(
            insert(Lead)
            .values(
                id=uuid.uuid4(),
                bot_id=bot_id,
                conversation_id=conversation_id,
                contact=contact,
                contact_type=contact_type,
                message=message,
            )
            .on_conflict_do_nothing(index_elements=["conversation_id", "contact"])
        )
    return len(contacts)
