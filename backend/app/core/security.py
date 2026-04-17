import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import get_settings


PBKDF2_ITERATIONS = 120_000


def verify_password(plain_password: str, password_hash: str) -> bool:
    algorithm, iterations, salt, expected_hash = password_hash.split("$", maxsplit=3)
    if algorithm != "pbkdf2_sha256":
        raise ValueError("Неподдерживаемый алгоритм хеширования пароля")

    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        base64.b64decode(salt.encode("utf-8")),
        int(iterations),
    )
    candidate = base64.b64encode(derived_key).decode("utf-8")
    return hmac.compare_digest(candidate, expected_hash)


def get_password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return "pbkdf2_sha256${iterations}${salt}${hash_value}".format(
        iterations=PBKDF2_ITERATIONS,
        salt=base64.b64encode(salt).decode("utf-8"),
        hash_value=base64.b64encode(derived_key).decode("utf-8"),
    )


def create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    return create_token(
        subject=subject,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    return create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
