from app.core.security import verify_password
from app.models import User
from app.services.user_service import get_user_by_login


async def authenticate_user(db, login: str, password: str) -> User | None:
    user = await get_user_by_login(db, login)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
