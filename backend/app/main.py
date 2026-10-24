from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.rate_limit import RateLimiter
from app.db.session import create_engine, create_session_factory
from app.services.llm import GroqProvider


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    engine = create_engine(settings.database_url)
    app.state.session_factory = create_session_factory(engine)
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
    app.state.rate_limiter = RateLimiter(settings.rate_limit_storage_uri)
    app.state.llm = (
        GroqProvider(settings.groq_api_key.get_secret_value()) if settings.groq_api_key else None
    )
    yield
    if app.state.llm:
        await app.state.llm.aclose()
    await app.state.redis.aclose()
    await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.app_name} API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
