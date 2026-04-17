from pydantic import Field

from app.schemas.common import MessageResponse, ORMModel
from app.schemas.user import UserRead


class LoginRequest(ORMModel):
    login: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class AuthResponse(MessageResponse):
    user: UserRead
