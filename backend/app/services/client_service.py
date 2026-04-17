from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Client
from app.schemas.client import ClientCreate, ClientUpdate


async def list_clients(db: AsyncSession, include_deleted: bool = False) -> list[Client]:
    stmt = select(Client).order_by(Client.company_name)
    if not include_deleted:
        stmt = stmt.where(Client.is_deleted.is_(False))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_client(db: AsyncSession, client_id: int, include_deleted: bool = False) -> Client | None:
    stmt = select(Client).where(Client.id == client_id)
    if not include_deleted:
        stmt = stmt.where(Client.is_deleted.is_(False))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_client(db: AsyncSession, payload: ClientCreate) -> Client:
    client = Client(**payload.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


async def update_client(db: AsyncSession, client: Client, payload: ClientUpdate) -> Client:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    await db.commit()
    await db.refresh(client)
    return client


async def soft_delete_client(db: AsyncSession, client: Client) -> Client:
    client.is_deleted = True
    client.deleted_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(client)
    return client


async def restore_client(db: AsyncSession, client: Client) -> Client:
    client.is_deleted = False
    client.deleted_at = None
    await db.commit()
    await db.refresh(client)
    return client
