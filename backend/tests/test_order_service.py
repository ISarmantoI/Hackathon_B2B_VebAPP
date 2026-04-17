import unittest

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models import Client, Order, OrderStatus, Role, Service, User
from app.schemas.order import OrderCreate, OrderEventCreate
from app.services.order_service import add_order_note, create_order, get_order, list_order_events, update_order_status


class OrderServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        self.session_maker = async_sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)

        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        self.session = self.session_maker()
        self.user = await self._create_user()
        self.client = Client(inn="7701234567", company_name="ООО Ромашка", phone="+79990000000")
        self.service = Service(title="Автоматизация", description="CRM + интеграции", price=150000)
        self.session.add_all([self.client, self.service])
        await self.session.commit()

    async def asyncTearDown(self) -> None:
        await self.session.close()
        await self.engine.dispose()

    async def _create_user(self) -> User:
        role = Role(role_name="Admin")
        user = User(
            role=role,
            full_name="Demo Admin",
            login="admin",
            password_hash="hash",
            is_active=True,
        )
        self.session.add_all([role, user])
        await self.session.commit()
        return user

    async def test_create_order_creates_timeline_event(self) -> None:
        order = await create_order(
            self.session,
            OrderCreate(client_id=self.client.id, service_id=self.service.id),
            self.user,
        )

        self.assertEqual(order.status, OrderStatus.NEW)

        events = await list_order_events(self.session, order.id)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].event_type, "created")
        self.assertIn("Заказ создан", events[0].message)

    async def test_status_change_creates_history_record(self) -> None:
        created_order = await create_order(
            self.session,
            OrderCreate(client_id=self.client.id, service_id=self.service.id),
            self.user,
        )
        order = await get_order(self.session, created_order.id)
        assert order is not None

        updated_order = await update_order_status(self.session, order, OrderStatus.IN_PROGRESS, self.user)

        self.assertEqual(updated_order.status, OrderStatus.IN_PROGRESS)

        events = await list_order_events(self.session, updated_order.id)
        self.assertEqual(events[0].event_type, "status_changed")
        self.assertIn("new -> in_progress", events[0].message)

    async def test_invalid_transition_raises_error(self) -> None:
        created_order = await create_order(
            self.session,
            OrderCreate(client_id=self.client.id, service_id=self.service.id),
            self.user,
        )
        order = await get_order(self.session, created_order.id)
        assert order is not None
        order = await update_order_status(self.session, order, OrderStatus.IN_PROGRESS, self.user)
        order = await update_order_status(self.session, order, OrderStatus.COMPLETED, self.user)

        with self.assertRaises(ValueError):
            await update_order_status(self.session, order, OrderStatus.CANCELLED, self.user)

    async def test_add_order_note_saves_comment(self) -> None:
        created_order = await create_order(
            self.session,
            OrderCreate(client_id=self.client.id, service_id=self.service.id),
            self.user,
        )
        order = await get_order(self.session, created_order.id)
        assert order is not None

        event = await add_order_note(
            self.session,
            order,
            OrderEventCreate(message="Клиент подтвердил бюджет."),
            self.user,
        )

        self.assertEqual(event.event_type, "comment")
        self.assertEqual(event.message, "Клиент подтвердил бюджет.")
