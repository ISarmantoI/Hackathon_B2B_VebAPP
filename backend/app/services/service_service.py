from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Service
from app.schemas.service import ServiceCreate, ServiceUpdate


async def list_services(db: AsyncSession, include_deleted: bool = False) -> list[Service]:
    stmt = select(Service).order_by(Service.title)
    if not include_deleted:
        stmt = stmt.where(Service.is_deleted.is_(False))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_service(db: AsyncSession, service_id: int, include_deleted: bool = False) -> Service | None:
    stmt = select(Service).where(Service.id == service_id)
    if not include_deleted:
        stmt = stmt.where(Service.is_deleted.is_(False))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_service(db: AsyncSession, payload: ServiceCreate) -> Service:
    service = Service(**payload.model_dump())
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service


async def update_service(db: AsyncSession, service: Service, payload: ServiceUpdate) -> Service:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, key, value)
    await db.commit()
    await db.refresh(service)
    return service


async def soft_delete_service(db: AsyncSession, service: Service) -> Service:
    service.is_deleted = True
    service.deleted_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(service)
    return service


async def restore_service(db: AsyncSession, service: Service) -> Service:
    service.is_deleted = False
    service.deleted_at = None
    await db.commit()
    await db.refresh(service)
    return service
