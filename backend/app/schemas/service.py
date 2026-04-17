from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ORMModel


class ServiceBase(ORMModel):
    title: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=2, max_length=1000)
    price: int = Field(ge=0)

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(ORMModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, min_length=2, max_length=1000)
    price: int | None = Field(default=None, ge=0)

    @field_validator("title", "description")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return value.strip()


class ServiceRead(ServiceBase):
    id: int
    is_deleted: bool
    deleted_at: datetime | None
