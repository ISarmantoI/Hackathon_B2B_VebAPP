from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import (
    create_user,
    get_user_by_id,
    list_users,
    restore_user,
    soft_delete_user,
    update_user,
)


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
async def get_users(
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin")),
    db: AsyncSession = Depends(get_db),
):
    return await list_users(db, include_deleted=include_deleted)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def post_user(
    payload: UserCreate,
    _: User = Depends(require_roles("Admin")),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_user(db, payload)
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует") from exc


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    include_deleted: bool = Query(default=False),
    _: User = Depends(require_roles("Admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_id(db, user_id, include_deleted=include_deleted)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def patch_user(
    user_id: int,
    payload: UserUpdate,
    _: User = Depends(require_roles("Admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_id(db, user_id, include_deleted=True)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    try:
        return await update_user(db, user, payload)
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует") from exc


@router.delete("/{user_id}", response_model=UserRead)
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_roles("Admin")),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя архивировать самого себя")

    user = await get_user_by_id(db, user_id, include_deleted=True)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return await soft_delete_user(db, user)


@router.post("/{user_id}/restore", response_model=UserRead)
async def restore_deleted_user(
    user_id: int,
    _: User = Depends(require_roles("Admin")),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_id(db, user_id, include_deleted=True)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return await restore_user(db, user)
