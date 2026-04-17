import json
import logging
import time
import uuid

import sentry_sdk
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.api.v1.router import api_router
from app.core.config import get_settings


settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("b2b.api")

REQUEST_COUNT = Counter(
    "b2b_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "b2b_http_request_latency_seconds",
    "HTTP request latency",
    ["method", "path"],
)

app = FastAPI(
    title=settings.app_name,
    docs_url=settings.docs_url,
    openapi_url=settings.openapi_url,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
        environment=settings.environment,
    )


def _translate_validation_error(error_type: str, ctx: dict | None) -> str:
    context = ctx or {}
    if error_type == "string_too_short":
        return f"Минимальная длина поля — {context.get('min_length')} символов"
    if error_type == "string_too_long":
        return f"Максимальная длина поля — {context.get('max_length')} символов"
    if error_type in {"missing", "field_required"}:
        return "Поле обязательно для заполнения"
    if error_type in {"int_parsing", "float_parsing"}:
        return "Некорректный числовой формат"
    if error_type == "greater_than":
        return f"Значение должно быть больше {context.get('gt')}"
    if error_type == "greater_than_equal":
        return f"Значение должно быть не меньше {context.get('ge')}"
    if error_type == "less_than":
        return f"Значение должно быть меньше {context.get('lt')}"
    if error_type == "less_than_equal":
        return f"Значение должно быть не больше {context.get('le')}"
    return "Некорректное значение поля"


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    translated_errors: list[dict[str, str]] = []
    for item in exc.errors():
        field = str(item.get("loc", ["body", "unknown"])[-1])
        translated_errors.append(
            {
                "field": field,
                "msg": _translate_validation_error(item.get("type", ""), item.get("ctx")),
            }
        )
    return JSONResponse(status_code=422, content={"detail": translated_errors})


@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()

    response: Response
    try:
        response = await call_next(request)
    except Exception as exc:  # noqa: BLE001
        elapsed = time.perf_counter() - start
        REQUEST_COUNT.labels(method=request.method, path=request.url.path, status="500").inc()
        REQUEST_LATENCY.labels(method=request.method, path=request.url.path).observe(elapsed)
        logger.exception(
            json.dumps(
                {
                    "event": "http_request_failed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "latency_ms": round(elapsed * 1000, 2),
                    "error": str(exc),
                },
                ensure_ascii=False,
            )
        )
        raise

    elapsed = time.perf_counter() - start
    status_code = str(response.status_code)
    REQUEST_COUNT.labels(method=request.method, path=request.url.path, status=status_code).inc()
    REQUEST_LATENCY.labels(method=request.method, path=request.url.path).observe(elapsed)

    response.headers["X-Request-ID"] = request_id
    logger.info(
        json.dumps(
            {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "latency_ms": round(elapsed * 1000, 2),
            },
            ensure_ascii=False,
        )
    )
    return response


@app.get("/metrics")
async def metrics():
    if not settings.enable_metrics:
        return Response(status_code=404)
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "docs": settings.docs_url,
        "api_prefix": settings.api_v1_prefix,
    }
