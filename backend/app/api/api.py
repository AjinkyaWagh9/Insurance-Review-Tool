from fastapi import APIRouter
from app.api.endpoints import motor, term, health, utils, analyze, lead

api_router = APIRouter()

api_router.include_router(motor.router, prefix="/motor", tags=["motor"])
api_router.include_router(term.router, prefix="/term", tags=["term"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(utils.router, prefix="/utils", tags=["utils"])
api_router.include_router(analyze.router, tags=["analyze"])
api_router.include_router(lead.router, prefix="/leads", tags=["leads"])



