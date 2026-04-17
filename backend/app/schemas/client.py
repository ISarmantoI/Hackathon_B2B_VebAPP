from datetime import datetime
import re

from pydantic import Field, field_validator

from app.schemas.common import ORMModel


class ClientBase(ORMModel):
    inn: str = Field(min_length=10, max_length=12)
    company_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=5, max_length=50)

    @field_validator("inn")
    @classmethod
    def validate_inn(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("ИНН должен содержать только цифры")
        if len(value) not in {10, 12}:
            raise ValueError("ИНН должен состоять из 10 или 12 цифр")
        return value

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Название компании должно быть не короче 2 символов")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.fullmatch(r"[0-9+\-() ]+", cleaned):
            raise ValueError("Телефон должен содержать только цифры и базовые разделители")

        digits = "".join(char for char in cleaned if char.isdigit())
        if len(digits) < 10 or len(digits) > 11:
            raise ValueError("Телефон должен содержать 10 или 11 цифр")

        return cleaned


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ORMModel):
    inn: str | None = Field(default=None, min_length=10, max_length=12)
    company_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, min_length=5, max_length=50)

    @field_validator("inn")
    @classmethod
    def validate_optional_inn(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.isdigit():
            raise ValueError("ИНН должен содержать только цифры")
        if len(value) not in {10, 12}:
            raise ValueError("ИНН должен состоять из 10 или 12 цифр")
        return value

    @field_validator("company_name")
    @classmethod
    def validate_optional_company_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Название компании должно быть не короче 2 символов")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_optional_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        if not re.fullmatch(r"[0-9+\-() ]+", cleaned):
            raise ValueError("Телефон должен содержать только цифры и базовые разделители")

        digits = "".join(char for char in cleaned if char.isdigit())
        if len(digits) < 10 or len(digits) > 11:
            raise ValueError("Телефон должен содержать 10 или 11 цифр")

        return cleaned


class ClientRead(ClientBase):
    id: int
    is_deleted: bool
    deleted_at: datetime | None
