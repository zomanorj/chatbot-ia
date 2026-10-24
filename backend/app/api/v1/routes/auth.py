from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep, SettingsDep
from app.core.config import Settings
from app.core.errors import AppError
from app.core.rate_limit import rate_limit
from app.core.security import create_access_token
from app.models import Membership, Organization, User
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    OrganizationRead,
    RegisterRequest,
    TokenResponse,
    UserRead,
)
from app.services import auth as auth_service

REFRESH_COOKIE = "mpanampy_refresh"
REFRESH_COOKIE_PATH = "/api/v1/auth"

router = APIRouter(prefix="/auth", tags=["auth"])
RefreshCookie = Annotated[str | None, Cookie(alias=REFRESH_COOKIE)]


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.refresh_token_ttl_days * 86_400,
        path=REFRESH_COOKIE_PATH,
        domain=settings.cookie_domain,
        secure=settings.secure_cookies,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


def _clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_COOKIE_PATH,
        domain=settings.cookie_domain,
        secure=settings.secure_cookies,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


def _token_response(user: User, settings: Settings) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, settings),
        expires_in=settings.access_token_ttl_minutes * 60,
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    dependencies=[rate_limit("auth", "auth_rate_limit")],
)
async def register(
    payload: RegisterRequest, response: Response, session: SessionDep, settings: SettingsDep
) -> TokenResponse:
    """Create an account and its organization, then open a session."""
    user = await auth_service.register(session, **payload.model_dump())
    refresh = await auth_service.issue_refresh_token(session, user, settings)
    await session.commit()
    _set_refresh_cookie(response, refresh, settings)
    return _token_response(user, settings)


@router.post("/login", dependencies=[rate_limit("auth", "auth_rate_limit")])
async def login(
    payload: LoginRequest, response: Response, session: SessionDep, settings: SettingsDep
) -> TokenResponse:
    user = await auth_service.authenticate(session, email=payload.email, password=payload.password)
    refresh = await auth_service.issue_refresh_token(session, user, settings)
    await session.commit()
    _set_refresh_cookie(response, refresh, settings)
    return _token_response(user, settings)


@router.post("/refresh")
async def refresh(
    response: Response, session: SessionDep, settings: SettingsDep, token: RefreshCookie = None
) -> TokenResponse:
    """Exchange the refresh cookie for a new access token. The cookie is rotated."""
    if not token:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "invalid_session", "No active session.")
    try:
        user, new_refresh = await auth_service.rotate_refresh_token(session, token, settings)
    except AppError:
        _clear_refresh_cookie(response, settings)
        raise
    await session.commit()
    _set_refresh_cookie(response, new_refresh, settings)
    return _token_response(user, settings)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response, session: SessionDep, settings: SettingsDep, token: RefreshCookie = None
) -> None:
    if token:
        await auth_service.revoke_refresh_token(session, token)
        await session.commit()
    _clear_refresh_cookie(response, settings)


@router.get("/me")
async def me(user: CurrentUser, session: SessionDep) -> MeResponse:
    rows = await session.execute(
        select(Organization, Membership.role)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Membership.user_id == user.id)
        .order_by(Membership.created_at)
    )
    return MeResponse(
        user=UserRead.model_validate(user),
        organizations=[
            OrganizationRead(id=org.id, name=org.name, role=role) for org, role in rows.all()
        ],
    )
