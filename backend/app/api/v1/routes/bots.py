import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import OrgDep, SessionDep, SettingsDep
from app.models import Bot
from app.schemas.bot import BotCreate, BotRead, BotUpdate
from app.schemas.conversation import ConversationDetail, ConversationSummary
from app.services import bots as bot_service
from app.services import conversations as conversation_service

router = APIRouter(prefix="/bots", tags=["bots"])


async def get_org_bot(bot_id: uuid.UUID, org: OrgDep, session: SessionDep) -> Bot:
    return await bot_service.get_bot(session, org.organization_id, bot_id)


BotDep = Annotated[Bot, Depends(get_org_bot)]


@router.get("")
async def list_bots(org: OrgDep, session: SessionDep) -> list[BotRead]:
    bots = await bot_service.list_bots(session, org.organization_id)
    return [BotRead.model_validate(bot) for bot in bots]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_bot(
    payload: BotCreate, org: OrgDep, session: SessionDep, settings: SettingsDep
) -> BotRead:
    bot = await bot_service.create_bot(session, org.organization_id, payload, settings)
    await session.commit()
    await session.refresh(bot)
    return BotRead.model_validate(bot)


@router.get("/{bot_id}")
async def get_bot(bot: BotDep) -> BotRead:
    return BotRead.model_validate(bot)


@router.patch("/{bot_id}")
async def update_bot(
    payload: BotUpdate, bot: BotDep, session: SessionDep, settings: SettingsDep
) -> BotRead:
    await bot_service.update_bot(session, bot, payload, settings)
    await session.commit()
    await session.refresh(bot)
    return BotRead.model_validate(bot)


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bot(bot: BotDep, session: SessionDep) -> None:
    await session.delete(bot)
    await session.commit()


@router.get("/{bot_id}/conversations")
async def list_conversations(bot: BotDep, session: SessionDep) -> list[ConversationSummary]:
    conversations = await conversation_service.list_conversations(session, bot.id)
    return [ConversationSummary.model_validate(c) for c in conversations]


@router.get("/{bot_id}/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: uuid.UUID, bot: BotDep, session: SessionDep
) -> ConversationDetail:
    conversation = await conversation_service.get_conversation(
        session, bot.id, conversation_id, with_messages=True
    )
    return ConversationDetail.model_validate(conversation)


@router.delete("/{bot_id}/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: uuid.UUID, bot: BotDep, session: SessionDep) -> None:
    conversation = await conversation_service.get_conversation(
        session, bot.id, conversation_id, with_messages=False
    )
    await session.delete(conversation)
    await session.commit()
