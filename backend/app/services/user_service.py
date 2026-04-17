from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_password_hash
from app.models import Role, User
from app.schemas.user import UserCreate, UserUpdate


async def get_role_by_name(db: AsyncSession, role_name: str) -> Role | None:
    result = await db.execute(select(Role).where(Role.role_name == role_name))
    return result.scalar_one_or_none()


async def get_user_by_login(db: AsyncSession, login: str, include_deleted: bool = False) -> User | None:
    stmt = select(User).options(selectinload(User.role)).where(User.login == login)
    if not include_deleted:
        stmt = stmt.where(User.is_deleted.is_(False))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int, include_deleted: bool = False) -> User | None:
    stmt = select(User).options(selectinload(User.role)).where(User.id == user_id)
    if not include_deleted:
        stmt = stmt.where(User.is_deleted.is_(False))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession, include_deleted: bool = False) -> list[User]:
    stmt = select(User).options(selectinload(User.role)).order_by(User.id)
    if not include_deleted:
        stmt = stmt.where(User.is_deleted.is_(False))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_user(db: AsyncSession, payload: UserCreate) -> User:
    role = await get_role_by_name(db, payload.role_name)
    if role is None:
        raise ValueError("Роль не найдена")

    user = User(
        full_name=payload.full_name,
        login=payload.login,
        password_hash=get_password_hash(payload.password),
        role_id=role.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await get_user_by_id(db, user.id)


async def update_user(db: AsyncSession, user: User, payload: UserUpdate) -> User:
    data = payload.model_dump(exclude_unset=True)

    role_name = data.pop("role_name", None)
    if role_name is not None:
        role = await get_role_by_name(db, role_name)
        if role is None:
            raise ValueError("Роль не найдена")
        user.role_id = role.id

    password = data.pop("password", None)
    if password is not None:
        user.password_hash = get_password_hash(password)

    for key, value in data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return await get_user_by_id(db, user.id, include_deleted=True)


async def soft_delete_user(db: AsyncSession, user: User) -> User:
    user.is_deleted = True
    user.deleted_at = datetime.now(UTC)
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return await get_user_by_id(db, user.id, include_deleted=True)


async def restore_user(db: AsyncSession, user: User) -> User:
    user.is_deleted = False
    user.deleted_at = None
    user.is_active = True
    await db.commit()
    await db.refresh(user)
    return await get_user_by_id(db, user.id, include_deleted=True)
