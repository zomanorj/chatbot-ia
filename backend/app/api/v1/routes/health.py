import logging

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.api.deps import RedisDep, SessionDep
from app.schemas.health import Liveness, Readiness, Status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=Liveness)
async def liveness() -> Liveness:
    return Liveness(status="ok")


@router.get(
    "/ready",
    response_model=Readiness,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": Readiness}},
)
async def readiness(session: SessionDep, redis: RedisDep, response: Response) -> Readiness:
    checks: dict[str, Status] = {}

    try:
        await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        logger.exception("Database readiness check failed")
        checks["database"] = "error"

    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception:
        logger.exception("Redis readiness check failed")
        checks["redis"] = "error"

    healthy = all(value == "ok" for value in checks.values())
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return Readiness(status="ok" if healthy else "error", checks=checks)
