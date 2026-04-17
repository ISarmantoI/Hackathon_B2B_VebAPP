from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Role, Service, User


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def seeded_db(db_session: AsyncSession) -> AsyncGenerator[AsyncSession, None]:
    admin_role = Role(role_name="Admin")
    manager_role = Role(role_name="Manager")
    db_session.add_all([admin_role, manager_role])
    await db_session.flush()

    db_session.add_all(
        [
            User(
                role_id=admin_role.id,
                full_name="System Administrator",
                login="admin",
                password_hash=get_password_hash("admin123"),
                is_active=True,
            ),
            User(
                role_id=manager_role.id,
                full_name="Manager",
                login="manager",
                password_hash=get_password_hash("manager123"),
                is_active=True,
            ),
            Service(
                title="Audit",
                description="Infra audit",
                price=50000,
            ),
        ]
    )
    await db_session.commit()
    yield db_session


@pytest.fixture
async def async_client(seeded_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db():
        yield seeded_db

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.pop(get_db, None)
