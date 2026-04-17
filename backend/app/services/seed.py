from sqlalchemy import select

from app.core.config import Settings
from app.core.security import get_password_hash
from app.db.session import async_session_maker
from app.models import Role, Service, User


async def seed_initial_data(settings: Settings) -> None:
    if not settings.seed_data:
        return

    async with async_session_maker() as db:
        role_names = ["Admin", "Manager"]
        result = await db.execute(select(Role))
        existing_roles = {role.role_name: role for role in result.scalars().all()}

        for role_name in role_names:
            if role_name not in existing_roles:
                role = Role(role_name=role_name)
                db.add(role)
                await db.flush()
                existing_roles[role_name] = role

        result = await db.execute(select(User))
        existing_users = {user.login: user for user in result.scalars().all()}
        existing_logins = set(existing_users.keys())

        if settings.first_superuser_login not in existing_logins:
            db.add(
                User(
                    full_name=settings.first_superuser_full_name,
                    login=settings.first_superuser_login,
                    password_hash=get_password_hash(settings.first_superuser_password),
                    role_id=existing_roles["Admin"].id,
                )
            )
        else:
            superuser = existing_users[settings.first_superuser_login]
            # На случай если админ был ошибочно архивирован вручную.
            superuser.full_name = settings.first_superuser_full_name
            superuser.is_active = True
            superuser.is_deleted = False
            superuser.deleted_at = None

        if settings.seed_demo_manager_login not in existing_logins:
            db.add(
                User(
                    full_name=settings.seed_demo_manager_full_name,
                    login=settings.seed_demo_manager_login,
                    password_hash=get_password_hash(settings.seed_demo_manager_password),
                    role_id=existing_roles["Manager"].id,
                )
            )

        result = await db.execute(select(Service))
        if not result.scalars().first():
            db.add_all(
                [
                    Service(
                        title="Аудит IT-инфраструктуры",
                        description="Полный аудит текущей инфраструктуры компании.",
                        price=50000,
                    ),
                    Service(
                        title="Настройка серверов",
                        description="Настройка Linux и Windows серверов под задачи клиента.",
                        price=25000,
                    ),
                    Service(
                        title="Техническая поддержка",
                        description="Ежемесячная поддержка и сопровождение сервисов.",
                        price=15000,
                    ),
                ]
            )

        await db.commit()
