from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User
from app.schemas.service import ServiceCreate, ServiceRead, ServiceUpdate
from app.services.service_service import (
    create_service,
    get_service,
    list_services,
    restore_service,
    soft_delete_service,
    update_service,
)


router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceRead])
async def get_services(
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    return await list_services(db, include_deleted=include_deleted)


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def post_service(
    payload: ServiceCreate,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_service(db, payload)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Не удалось создать услугу") from exc


@router.get("/{service_id}", response_model=ServiceRead)
async def get_service_by_id(
    service_id: int,
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    service = await get_service(db, service_id, include_deleted=include_deleted)
    if service is None:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return service


@router.patch("/{service_id}", response_model=ServiceRead)
async def patch_service(
    service_id: int,
    payload: ServiceUpdate,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    service = await get_service(db, service_id, include_deleted=True)
    if service is None:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return await update_service(db, service, payload)


@router.delete("/{service_id}", response_model=ServiceRead)
async def delete_service(
    service_id: int,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    service = await get_service(db, service_id, include_deleted=True)
    if service is None:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return await soft_delete_service(db, service)


@router.post("/{service_id}/restore", response_model=ServiceRead)
async def restore_deleted_service(
    service_id: int,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    service = await get_service(db, service_id, include_deleted=True)
    if service is None:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return await restore_service(db, service)
