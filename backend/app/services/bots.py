import uuid

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.models import Bot
from app.schemas.bot import BotCreate, BotUpdate


def _check_model(model: str | None, settings: Settings) -> None:
    if model is not None and model not in settings.llm_models:
        raise AppError(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "unknown_model",
            f"Model '{model}' is not available.",
        )


async def list_bots(session: AsyncSession, organization_id: uuid.UUID) -> list[Bot]:
    result = await session.scalars(
        select(Bot).where(Bot.organization_id == organization_id).order_by(Bot.created_at.desc())
    )
    return list(result)


async def get_bot(session: AsyncSession, organization_id: uuid.UUID, bot_id: uuid.UUID) -> Bot:
    # Bots of other organizations are reported as missing, never as forbidden.
    bot = await session.scalar(
        select(Bot).where(Bot.id == bot_id, Bot.organization_id == organization_id)
    )
    if bot is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "bot_not_found", "Assistant not found.")
    return bot


async def create_bot(
    session: AsyncSession, organization_id: uuid.UUID, data: BotCreate, settings: Settings
) -> Bot:
    _check_model(data.model, settings)
    bot = Bot(organization_id=organization_id, **data.model_dump())
    session.add(bot)
    await session.flush()
    return bot


async def update_bot(session: AsyncSession, bot: Bot, data: BotUpdate, settings: Settings) -> Bot:
    changes = data.model_dump(exclude_unset=True)
    _check_model(changes.get("model"), settings)
    for field, value in changes.items():
        setattr(bot, field, value)
    await session.flush()
    return bot
