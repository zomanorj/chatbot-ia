from datetime import UTC, datetime, timedelta

from fastapi import status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import (
    DUMMY_HASH,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models import Membership, Organization, RefreshToken, Role, User

# Two tabs refreshing at once is a race, not a theft: only older reuse revokes the family.
REUSE_GRACE_PERIOD = timedelta(seconds=10)


def _invalid_credentials() -> AppError:
    return AppError(
        status.HTTP_401_UNAUTHORIZED, "invalid_credentials", "Incorrect email or password."
    )


def _invalid_session() -> AppError:
    return AppError(status.HTTP_401_UNAUTHORIZED, "invalid_session", "Your session has expired.")


async def register(
    session: AsyncSession, *, email: str, password: str, full_name: str, organization_name: str
) -> User:
    if await session.scalar(select(User.id).where(User.email == email)):
        raise AppError(
            status.HTTP_409_CONFLICT, "email_taken", "An account already exists with this email."
        )

    # Argon2 is CPU-bound by design: keep it off the event loop.
    user = User(
        email=email,
        full_name=full_name,
        password_hash=await run_in_threadpool(hash_password, password),
    )
    organization = Organization(name=organization_name)
    session.add_all(
        [user, organization, Membership(user=user, organization=organization, role=Role.OWNER)]
    )
    try:
        await session.flush()
    except IntegrityError as exc:
        raise AppError(
            status.HTTP_409_CONFLICT, "email_taken", "An account already exists with this email."
        ) from exc
    return user


async def authenticate(session: AsyncSession, *, email: str, password: str) -> User:
    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        await run_in_threadpool(verify_password, password, DUMMY_HASH)
        raise _invalid_credentials()
    if not await run_in_threadpool(verify_password, password, user.password_hash):
        raise _invalid_credentials()
    if not user.is_active:
        raise _invalid_credentials()
    return user


async def issue_refresh_token(session: AsyncSession, user: User, settings: Settings) -> str:
    token = generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days),
        )
    )
    await session.flush()
    return token


async def rotate_refresh_token(
    session: AsyncSession, token: str, settings: Settings
) -> tuple[User, str]:
    """Single-use refresh tokens. Replaying a used token revokes every session of the user."""
    now = datetime.now(UTC)
    stored = await session.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_refresh_token(token))
        .with_for_update()
    )
    if stored is None or stored.expires_at <= now:
        raise _invalid_session()

    if stored.revoked_at is not None:
        if now - stored.revoked_at < REUSE_GRACE_PERIOD:
            raise _invalid_session()
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == stored.user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await session.commit()
        raise _invalid_session()

    stored.revoked_at = now
    user = await session.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise _invalid_session()
    return user, await issue_refresh_token(session, user, settings)


async def revoke_refresh_token(session: AsyncSession, token: str) -> None:
    await session.execute(
        update(RefreshToken)
        .where(
            RefreshToken.token_hash == hash_refresh_token(token),
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC))
    )
