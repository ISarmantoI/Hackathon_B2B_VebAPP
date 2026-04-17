import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.db.session import get_db
from app.models import User
from app.schemas.auth import AuthResponse, LoginRequest
from app.schemas.common import MessageResponse
from app.services.auth_service import authenticate_user
from app.services.user_service import get_user_by_id


router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, user_id: int) -> None:
    settings = get_settings()
    access_token = create_access_token(str(user_id))
    refresh_token = create_refresh_token(str(user_id))
    response.set_cookie(
        key=settings.access_cookie_name,
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(settings.access_cookie_name, path="/")
    response.delete_cookie(settings.refresh_cookie_name, path="/")


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, payload.login, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    _set_auth_cookies(response, user.id)
    return AuthResponse(message="Вход выполнен успешно", user=user)


@router.post("/refresh", response_model=AuthResponse)
async def refresh_session(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    token = request.cookies.get(settings.refresh_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Отсутствует refresh-токен",
        )

    try:
        payload = decode_token(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный refresh-токен",
        ) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный тип токена",
        )

    user = await get_user_by_id(db, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или деактивирован",
        )

    _set_auth_cookies(response, user.id)
    return AuthResponse(message="Сессия обновлена", user=user)


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    _clear_auth_cookies(response)
    return MessageResponse(message="Выход выполнен")


@router.get("/me", response_model=AuthResponse)
async def me(current_user: User = Depends(get_current_user)):
    return AuthResponse(message="Текущий пользователь загружен", user=current_user)
