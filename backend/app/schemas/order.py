from datetime import datetime

from pydantic import Field

from app.models.order import OrderStatus
from app.schemas.client import ClientRead
from app.schemas.common import ORMModel
from app.schemas.service import ServiceRead
from app.schemas.user import UserSummary


class OrderCreate(ORMModel):
    client_id: int = Field(gt=0)
    service_id: int = Field(gt=0)


class OrderUpdate(ORMModel):
    client_id: int | None = Field(default=None, gt=0)
    service_id: int | None = Field(default=None, gt=0)


class OrderStatusUpdate(ORMModel):
    status: OrderStatus


class OrderEventCreate(ORMModel):
    message: str = Field(min_length=2, max_length=1000)


class OrderEventRead(ORMModel):
    id: int
    event_type: str
    message: str
    created_at: datetime
    user: UserSummary


class OrderRead(ORMModel):
    id: int
    status: OrderStatus
    is_deleted: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    client: ClientRead
    service: ServiceRead
    user: UserSummary
