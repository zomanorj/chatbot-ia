import uuid

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import AppError
from app.models import Conversation

LIST_LIMIT = 50


async def list_conversations(session: AsyncSession, bot_id: uuid.UUID) -> list[Conversation]:
    result = await session.scalars(
        select(Conversation)
        .where(Conversation.bot_id == bot_id)
        .order_by(Conversation.updated_at.desc())
        .limit(LIST_LIMIT)
    )
    return list(result)


async def get_conversation(
    session: AsyncSession, bot_id: uuid.UUID, conversation_id: uuid.UUID, *, with_messages: bool
) -> Conversation:
    query = select(Conversation).where(
        Conversation.id == conversation_id, Conversation.bot_id == bot_id
    )
    if with_messages:
        query = query.options(selectinload(Conversation.messages))
    conversation = await session.scalar(query)
    if conversation is None:
        raise AppError(
            status.HTTP_404_NOT_FOUND, "conversation_not_found", "Conversation not found."
        )
    return conversation
