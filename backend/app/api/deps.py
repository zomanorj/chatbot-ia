import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.security import decode_access_token
from app.models import Membership, Role, User
from app.services.llm import LLMProvider

bearer_scheme = HTTPBearer(auto_error=False)


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.session_factory() as session:
        yield session


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def get_llm(request: Request) -> LLMProvider | None:
    return getattr(request.app.state, "llm", None)


SettingsDep = Annotated[Settings, Depends(get_settings)]
SessionDep = Annotated[AsyncSession, Depends(get_db_session)]
RedisDep = Annotated[Redis, Depends(get_redis)]
LLMDep = Annotated[LLMProvider | None, Depends(get_llm)]


def _unauthenticated(message: str = "Authentication required.") -> AppError:
    return AppError(
        status.HTTP_401_UNAUTHORIZED,
        "not_authenticated",
        message,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    session: SessionDep,
    settings: SettingsDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise _unauthenticated()
    user_id = decode_access_token(credentials.credentials, settings)
    user = await session.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        raise _unauthenticated("Invalid or expired access token.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@dataclass(frozen=True)
class OrgContext:
    user: User
    organization_id: uuid.UUID
    role: Role


async def get_org_context(
    user: CurrentUser,
    session: SessionDep,
    x_organization_id: Annotated[uuid.UUID | None, Header()] = None,
) -> OrgContext:
    """Active organization: the X-Organization-ID header, or the user's first membership."""
    query = select(Membership).where(Membership.user_id == user.id)
    if x_organization_id:
        query = query.where(Membership.organization_id == x_organization_id)
    membership = await session.scalar(query.order_by(Membership.created_at).limit(1))
    if membership is None:
        raise AppError(
            status.HTTP_403_FORBIDDEN,
            "organization_forbidden",
            "You do not have access to this organization.",
        )
    return OrgContext(user=user, organization_id=membership.organization_id, role=membership.role)


OrgDep = Annotated[OrgContext, Depends(get_org_context)]


def user_rate_limit(scope: str, setting: str):
    """Rate limit keyed by the authenticated user instead of the client IP."""

    async def dependency(request: Request, user: CurrentUser, settings: SettingsDep) -> None:
        limit = getattr(settings, setting)
        await request.app.state.rate_limiter.check(limit, scope, f"user:{user.id}")

    return Depends(dependency)
