import pytest
from httpx import AsyncClient


API_PREFIX = "/api/v1"


async def login(client: AsyncClient, login_name: str, password: str) -> None:
    response = await client.post(
        f"{API_PREFIX}/auth/login",
        json={"login": login_name, "password": password},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_and_ready(async_client: AsyncClient) -> None:
    health = await async_client.get(f"{API_PREFIX}/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    ready = await async_client.get(f"{API_PREFIX}/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_clients_crud_soft_delete(async_client: AsyncClient) -> None:
    await login(async_client, "manager", "manager123")

    created = await async_client.post(
        f"{API_PREFIX}/clients",
        json={"inn": "7701234567", "company_name": "ООО Тест", "phone": "+79991234567"},
    )
    assert created.status_code == 201
    client_id = created.json()["id"]

    patched = await async_client.patch(
        f"{API_PREFIX}/clients/{client_id}",
        json={"company_name": "ООО Тест Обновлен"},
    )
    assert patched.status_code == 200
    assert patched.json()["company_name"] == "ООО Тест Обновлен"

    archived = await async_client.delete(f"{API_PREFIX}/clients/{client_id}")
    assert archived.status_code == 200
    assert archived.json()["is_deleted"] is True

    hidden_list = await async_client.get(f"{API_PREFIX}/clients")
    assert all(item["id"] != client_id for item in hidden_list.json())

    restored = await async_client.post(f"{API_PREFIX}/clients/{client_id}/restore")
    assert restored.status_code == 200
    assert restored.json()["is_deleted"] is False


@pytest.mark.asyncio
async def test_services_and_orders_crud(async_client: AsyncClient) -> None:
    await login(async_client, "admin", "admin123")

    create_service = await async_client.post(
        f"{API_PREFIX}/services",
        json={"title": "Новая услуга", "description": "Описание услуги", "price": 12000},
    )
    assert create_service.status_code == 201
    service_id = create_service.json()["id"]

    update_service = await async_client.patch(
        f"{API_PREFIX}/services/{service_id}",
        json={"price": 15000},
    )
    assert update_service.status_code == 200
    assert update_service.json()["price"] == 15000

    create_client = await async_client.post(
        f"{API_PREFIX}/clients",
        json={"inn": "7705551234", "company_name": "ООО Клиент", "phone": "+79990001122"},
    )
    assert create_client.status_code == 201
    client_id = create_client.json()["id"]

    create_order = await async_client.post(
        f"{API_PREFIX}/orders",
        json={"client_id": client_id, "service_id": service_id},
    )
    assert create_order.status_code == 201
    order_id = create_order.json()["id"]

    patch_order = await async_client.patch(
        f"{API_PREFIX}/orders/{order_id}",
        json={"service_id": service_id},
    )
    assert patch_order.status_code == 200

    archive_order = await async_client.delete(f"{API_PREFIX}/orders/{order_id}")
    assert archive_order.status_code == 200
    assert archive_order.json()["is_deleted"] is True

    restore_order = await async_client.post(f"{API_PREFIX}/orders/{order_id}/restore")
    assert restore_order.status_code == 200
    assert restore_order.json()["is_deleted"] is False


@pytest.mark.asyncio
async def test_users_crud_soft_delete(async_client: AsyncClient) -> None:
    await login(async_client, "admin", "admin123")

    create_user = await async_client.post(
        f"{API_PREFIX}/users",
        json={
            "full_name": "Новый Пользователь",
            "login": "new_user",
            "password": "new_user_123",
            "role_name": "Manager",
        },
    )
    assert create_user.status_code == 201
    user_id = create_user.json()["id"]

    update_user = await async_client.patch(
        f"{API_PREFIX}/users/{user_id}",
        json={"full_name": "Обновленный Пользователь", "is_active": False},
    )
    assert update_user.status_code == 200
    assert update_user.json()["is_active"] is False

    archive_user = await async_client.delete(f"{API_PREFIX}/users/{user_id}")
    assert archive_user.status_code == 200
    assert archive_user.json()["is_deleted"] is True

    restore_user = await async_client.post(f"{API_PREFIX}/users/{user_id}/restore")
    assert restore_user.status_code == 200
    assert restore_user.json()["is_deleted"] is False
