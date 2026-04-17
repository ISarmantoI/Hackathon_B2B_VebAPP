from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin


class Service(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str] = mapped_column(String(1000))
    price: Mapped[int] = mapped_column(Integer)

    orders: Mapped[list["Order"]] = relationship(back_populates="service")
