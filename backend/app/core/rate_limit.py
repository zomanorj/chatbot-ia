import math
import time

from fastapi import Depends, Request, status
from limits import parse_many
from limits.aio.strategies import MovingWindowRateLimiter
from limits.storage import storage_from_string

from app.core.config import get_settings
from app.core.errors import AppError


class RateLimiter:
    def __init__(self, storage_uri: str) -> None:
        options = {"implementation": "redispy"} if "redis" in storage_uri else {}
        self._strategy = MovingWindowRateLimiter(storage_from_string(storage_uri, **options))

    async def check(self, limit: str, scope: str, key: str) -> None:
        for item in parse_many(limit):
            if not await self._strategy.hit(item, scope, key):
                stats = await self._strategy.get_window_stats(item, scope, key)
                retry_after = max(1, math.ceil(stats.reset_time - time.time()))
                raise AppError(
                    status.HTTP_429_TOO_MANY_REQUESTS,
                    "rate_limited",
                    "Too many requests. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )


def client_ip(request: Request) -> str:
    # Uvicorn resolves X-Forwarded-For when the proxy is trusted (FORWARDED_ALLOW_IPS).
    return request.client.host if request.client else "unknown"


def rate_limit(scope: str, setting: str):
    """Dependency enforcing the limit named by a Settings attribute, per client IP."""

    async def dependency(request: Request) -> None:
        limit = getattr(get_settings(), setting)
        await request.app.state.rate_limiter.check(limit, scope, client_ip(request))

    return Depends(dependency)
