from fastapi import APIRouter

from app.api.v1.endpoints import auth, clients, health, orders, services, users


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(services.router)
api_router.include_router(orders.router)
api_router.include_router(users.router)
