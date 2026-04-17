from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Client, Order, OrderEvent, OrderStatus, Service, User
from app.schemas.order import OrderCreate, OrderEventCreate, OrderUpdate


ALLOWED_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.NEW: {OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED},
    OrderStatus.IN_PROGRESS: {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
}


def _with_relations():
    return [
        selectinload(Order.client),
        selectinload(Order.service),
        selectinload(Order.user).selectinload(User.role),
        selectinload(Order.events).selectinload(OrderEvent.user),
    ]


async def list_orders(db: AsyncSession, include_deleted: bool = False) -> list[Order]:
    stmt = select(Order).options(*_with_relations()).order_by(Order.id.desc())
    if not include_deleted:
        stmt = stmt.where(Order.is_deleted.is_(False))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_order(db: AsyncSession, order_id: int, include_deleted: bool = False) -> Order | None:
    stmt = select(Order).options(*_with_relations()).where(Order.id == order_id)
    if not include_deleted:
        stmt = stmt.where(Order.is_deleted.is_(False))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_order_events(db: AsyncSession, order_id: int) -> list[OrderEvent]:
    result = await db.execute(
        select(OrderEvent)
        .options(selectinload(OrderEvent.user))
        .where(OrderEvent.order_id == order_id)
        .order_by(OrderEvent.created_at.desc(), OrderEvent.id.desc())
    )
    return list(result.scalars().all())


async def _create_event(
    db: AsyncSession,
    order_id: int,
    user_id: int,
    event_type: str,
    message: str,
) -> OrderEvent:
    event = OrderEvent(
        order_id=order_id,
        user_id=user_id,
        event_type=event_type,
        message=message,
    )
    db.add(event)
    await db.flush()
    return event


async def create_order(db: AsyncSession, payload: OrderCreate, current_user: User) -> Order:
    client = await db.get(Client, payload.client_id)
    service = await db.get(Service, payload.service_id)
    if client is None or client.is_deleted:
        raise ValueError("Клиент не найден")
    if service is None or service.is_deleted:
        raise ValueError("Услуга не найдена")

    order = Order(
        client_id=client.id,
        service_id=service.id,
        user_id=current_user.id,
        status=OrderStatus.NEW,
    )
    db.add(order)
    await db.flush()
    await _create_event(
        db=db,
        order_id=order.id,
        user_id=current_user.id,
        event_type="created",
        message=f"Заказ создан менеджером {current_user.full_name}.",
    )
    await db.commit()
    return await get_order(db, order.id)


async def update_order_status(db: AsyncSession, order: Order, next_status: OrderStatus, current_user: User) -> Order:
    if next_status not in ALLOWED_STATUS_TRANSITIONS[order.status]:
        raise ValueError(f"Переход статуса из {order.status.value} в {next_status.value} запрещен")

    previous_status = order.status
    order.status = next_status
    await _create_event(
        db=db,
        order_id=order.id,
        user_id=current_user.id,
        event_type="status_changed",
        message=f"Статус изменен: {previous_status.value} -> {next_status.value}.",
    )
    await db.commit()
    return await get_order(db, order.id)


async def update_order(db: AsyncSession, order: Order, payload: OrderUpdate) -> Order:
    data = payload.model_dump(exclude_unset=True)

    client_id = data.get("client_id")
    if client_id is not None:
        client = await db.get(Client, client_id)
        if client is None or client.is_deleted:
            raise ValueError("Клиент не найден")
        order.client_id = client_id

    service_id = data.get("service_id")
    if service_id is not None:
        service = await db.get(Service, service_id)
        if service is None or service.is_deleted:
            raise ValueError("Услуга не найдена")
        order.service_id = service_id

    await db.commit()
    return await get_order(db, order.id)


async def add_order_note(
    db: AsyncSession,
    order: Order,
    payload: OrderEventCreate,
    current_user: User,
) -> OrderEvent:
    await _create_event(
        db=db,
        order_id=order.id,
        user_id=current_user.id,
        event_type="comment",
        message=payload.message.strip(),
    )
    await db.commit()
    events = await list_order_events(db, order.id)
    return events[0]


async def soft_delete_order(db: AsyncSession, order: Order) -> Order:
    order.is_deleted = True
    order.deleted_at = datetime.now(UTC)
    await db.commit()
    return await get_order(db, order.id, include_deleted=True)


async def restore_order(db: AsyncSession, order: Order) -> Order:
    order.is_deleted = False
    order.deleted_at = None
    await db.commit()
    return await get_order(db, order.id, include_deleted=True)
