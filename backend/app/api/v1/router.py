from fastapi import APIRouter

from app.api.v1.routes import auth, bots, chat, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(bots.router)
api_router.include_router(chat.router)
