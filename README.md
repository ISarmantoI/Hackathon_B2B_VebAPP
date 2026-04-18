# B2B Order Management Platform

## Быстрый старт

### Через Docker (рекомендуется)

```bash
docker compose up -d --build
```

Приложение будет доступно на **http://localhost**

| Роль | Логин | Пароль |
|------|-------|--------|
| Администратор | `admin` | `admin123` |
| Менеджер | `manager` | `manager123` |

### Dev-режим (с hot-reload)

```bash
docker compose --profile dev up -d --build
```

- Фронтенд: http://localhost:5173
- Бэкенд API: http://localhost:8000
- Swagger: http://localhost:8000/api/docs

### Локально без Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

> `npm install` обязателен после клонирования — папка `node_modules` не хранится в репозитории.

## Стек

| Слой | Технологии |
|------|-----------|
| Backend | Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic |
| Frontend | Vue 3, Pinia, Vue Router, shadcn-vue, Tailwind CSS |
| Инфраструктура | Docker, nginx, Prometheus |

## Quality Pipeline

- Backend unit + integration tests:
  - `cd backend && python -m pytest -q`
  - `cd backend && python -m unittest discover -s tests -v`
- Frontend build + typecheck:
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run build`
- Frontend e2e smoke:
  - `cd frontend && npx playwright install chromium`
  - `cd frontend && npm run test:e2e`
- Docker smoke:
  - `docker compose up -d --build`
  - `docker compose down -v`

## Observability Endpoints

- Liveness: `GET /api/v1/health`
- Readiness: `GET /api/v1/ready`
- Metrics: `GET /metrics`

## CI

GitHub Actions workflow is located in `.github/workflows/ci.yml` and enforces quality gates:

- backend-tests
- frontend-build
- e2e-smoke
- docker-build-smoke
