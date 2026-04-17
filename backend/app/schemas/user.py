from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ORMModel


class RoleRead(ORMModel):
    id: int
    role_name: str


class UserSummary(ORMModel):
    id: int
    full_name: str
    login: str


class UserRead(UserSummary):
    is_active: bool
    is_deleted: bool
    deleted_at: datetime | None
    role: RoleRead


class UserCreate(ORMModel):
    full_name: str = Field(min_length=2, max_length=255)
    login: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)
    role_name: str

    @field_validator("full_name", "login")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("role_name")
    @classmethod
    def validate_role_name(cls, value: str) -> str:
        if value not in {"Admin", "Manager"}:
            raise ValueError("Роль должна быть Admin или Manager")
        return value


class UserUpdate(ORMModel):
    login: str | None = Field(default=None, min_length=3, max_length=100)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    role_name: str | None = None
    is_active: bool | None = None

    @field_validator("full_name", "login")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return value.strip()

    @field_validator("role_name")
    @classmethod
    def validate_optional_role_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if value not in {"Admin", "Manager"}:
            raise ValueError("Роль должна быть Admin или Manager")
        return value
