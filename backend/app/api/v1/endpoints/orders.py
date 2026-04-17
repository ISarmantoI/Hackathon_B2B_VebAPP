from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User
from app.schemas.order import (
    OrderCreate,
    OrderEventCreate,
    OrderEventRead,
    OrderRead,
    OrderStatusUpdate,
    OrderUpdate,
)
from app.services.order_service import (
    add_order_note,
    create_order,
    get_order,
    list_order_events,
    list_orders,
    restore_order,
    soft_delete_order,
    update_order,
    update_order_status,
)


router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderRead])
async def get_orders(
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    return await list_orders(db, include_deleted=include_deleted)


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def post_order(
    payload: OrderCreate,
    current_user: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_order(db, payload, current_user)
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{order_id}/status", response_model=OrderRead)
async def patch_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    order = await get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    try:
        return await update_order_status(db, order, payload.status, current_user)
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{order_id}", response_model=OrderRead)
async def get_order_by_id(
    order_id: int,
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    order = await get_order(db, order_id, include_deleted=include_deleted)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return order


@router.patch("/{order_id}", response_model=OrderRead)
async def patch_order(
    order_id: int,
    payload: OrderUpdate,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    order = await get_order(db, order_id, include_deleted=True)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    try:
        return await update_order(db, order, payload)
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{order_id}", response_model=OrderRead)
async def delete_order(
    order_id: int,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    order = await get_order(db, order_id, include_deleted=True)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return await soft_delete_order(db, order)


@router.post("/{order_id}/restore", response_model=OrderRead)
async def restore_deleted_order(
    order_id: int,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    order = await get_order(db, order_id, include_deleted=True)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return await restore_order(db, order)


@router.get("/{order_id}/events", response_model=list[OrderEventRead])
async def get_order_events(
    order_id: int,
    _: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    order = await get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return await list_order_events(db, order_id)


@router.post("/{order_id}/events", response_model=OrderEventRead, status_code=status.HTTP_201_CREATED)
async def post_order_event(
    order_id: int,
    payload: OrderEventCreate,
    current_user: User = Depends(require_roles("Admin", "Manager")),
    db: AsyncSession = Depends(get_db),
):
    order = await get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return await add_order_note(db, order, payload, current_user)
