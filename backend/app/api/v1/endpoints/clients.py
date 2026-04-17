from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services.client_service import (
    create_client,
    get_client,
    list_clients,
    restore_client,
    soft_delete_client,
    update_client,
)


router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientRead])
async def get_clients(
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    return await list_clients(db, include_deleted=include_deleted)


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
async def post_client(
    payload: ClientCreate,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_client(db, payload)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Клиент с таким ИНН уже существует") from exc


@router.get("/{client_id}", response_model=ClientRead)
async def get_client_by_id(
    client_id: int,
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    client = await get_client(db, client_id, include_deleted=include_deleted)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return client


@router.patch("/{client_id}", response_model=ClientRead)
async def patch_client(
    client_id: int,
    payload: ClientUpdate,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    client = await get_client(db, client_id, include_deleted=True)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    try:
        return await update_client(db, client, payload)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Клиент с таким ИНН уже существует") from exc


@router.delete("/{client_id}", response_model=ClientRead)
async def delete_client(
    client_id: int,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    client = await get_client(db, client_id, include_deleted=True)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return await soft_delete_client(db, client)


@router.post("/{client_id}/restore", response_model=ClientRead)
async def restore_deleted_client(
    client_id: int,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    client = await get_client(db, client_id, include_deleted=True)
    if client is None:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return await restore_client(db, client)
