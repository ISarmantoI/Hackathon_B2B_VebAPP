"""
B2B Order Management Platform — Error Auditor
Usage:
  python audit.py [--base-url URL] [--format json|txt] [--out FILE]
Defaults: base_url=http://localhost, format=json, out=audit_report.json
"""

import argparse
import json
import sys
import textwrap
from datetime import datetime, timezone

def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DEFAULT_BASE = "http://localhost"
ADMIN = {"login": "admin", "password": "admin123"}
MANAGER = {"login": "manager", "password": "manager123"}
WRONG_CREDS = {"login": "nobody", "password": "wrong"}

FINDINGS: list[dict] = []


def find(category: str, severity: str, endpoint: str, method: str,
         description: str, expected=None, actual=None, detail: str = "") -> None:
    FINDINGS.append({
        "category": category,
        "severity": severity,          # CRITICAL / HIGH / MEDIUM / LOW / INFO
        "method": method,
        "endpoint": endpoint,
        "description": description,
        "expected": expected,
        "actual": actual,
        "detail": detail,
        "ts": _now(),
    })


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def s(cookies=None) -> requests.Session:
    sess = requests.Session()
    if cookies:
        sess.cookies.update(cookies)
    return sess


def login(base: str, creds: dict) -> tuple[requests.Session, dict | None]:
    """Return (session_with_cookies, user_dict | None)."""
    sess = requests.Session()
    try:
        r = sess.post(f"{base}/api/v1/auth/login", json=creds, timeout=10)
    except requests.ConnectionError:
        return sess, None
    if r.status_code == 200:
        return sess, r.json().get("user")
    return sess, None


def check(label: str, r: requests.Response, expected_status: int,
          endpoint: str, method: str = "GET",
          severity: str = "HIGH", category: str = "API") -> bool:
    if r.status_code != expected_status:
        try:
            detail = json.dumps(r.json(), ensure_ascii=False)[:300]
        except Exception:
            detail = r.text[:300]
        find(category, severity, endpoint, method,
             f"{label}: unexpected status code",
             expected=expected_status, actual=r.status_code, detail=detail)
        return False
    return True


# ---------------------------------------------------------------------------
# Test suites
# ---------------------------------------------------------------------------

def audit_health(base: str) -> None:
    for path, name in [
        ("/api/v1/health", "Liveness"),
        ("/api/v1/ready",  "Readiness"),
        ("/metrics",       "Prometheus metrics"),
    ]:
        try:
            r = requests.get(f"{base}{path}", timeout=10)
            check(name, r, 200, path, severity="CRITICAL", category="Observability")
        except requests.ConnectionError as exc:
            find("Observability", "CRITICAL", path, "GET",
                 f"{name} endpoint unreachable", detail=str(exc))


def audit_auth(base: str) -> None:
    # Wrong credentials → 401
    try:
        r = requests.post(f"{base}/api/v1/auth/login", json=WRONG_CREDS, timeout=10)
        check("Wrong-creds login", r, 401, "/api/v1/auth/login",
              "POST", "HIGH", "Auth") if r.status_code != 422 else None
    except requests.ConnectionError as exc:
        find("Auth", "CRITICAL", "/api/v1/auth/login", "POST",
             "Cannot reach login endpoint", detail=str(exc))
        return

    # Empty body → 422
    r = requests.post(f"{base}/api/v1/auth/login", json={}, timeout=10)
    check("Empty-body login", r, 422, "/api/v1/auth/login",
          "POST", "MEDIUM", "Auth")

    # /me without token → 401
    r = requests.get(f"{base}/api/v1/auth/me", timeout=10)
    check("/me without token", r, 401, "/api/v1/auth/me",
          "GET", "HIGH", "Auth")

    # Refresh without cookie → 401
    r = requests.post(f"{base}/api/v1/auth/refresh", timeout=10)
    check("Refresh without token", r, 401, "/api/v1/auth/refresh",
          "POST", "HIGH", "Auth")

    # Valid login
    sess_admin, user = login(base, ADMIN)
    if user is None:
        find("Auth", "CRITICAL", "/api/v1/auth/login", "POST",
             "Admin login failed — all auth-dependent checks skipped",
             expected=200, actual="login error")
        return

    # /me with token
    r = sess_admin.get(f"{base}/api/v1/auth/me", timeout=10)
    check("/me with valid token", r, 200, "/api/v1/auth/me",
          "GET", "HIGH", "Auth")

    # Logout
    r = sess_admin.post(f"{base}/api/v1/auth/logout", timeout=10)
    check("Logout", r, 200, "/api/v1/auth/logout",
          "POST", "MEDIUM", "Auth")

    # /me after logout → 401
    r = sess_admin.get(f"{base}/api/v1/auth/me", timeout=10)
    check("/me after logout", r, 401, "/api/v1/auth/me",
          "GET", "MEDIUM", "Auth")


def audit_orders(base: str) -> None:
    sess_admin, _ = login(base, ADMIN)
    if _ is None:
        find("Orders", "CRITICAL", "/api/v1/orders", "GET",
             "Admin login failed — orders checks skipped")
        return

    sess_anon = requests.Session()
    sess_mgr, _ = login(base, MANAGER)

    # Unauthenticated list → 401
    r = sess_anon.get(f"{base}/api/v1/orders", timeout=10)
    check("Anon list orders", r, 401, "/api/v1/orders",
          "GET", "HIGH", "Auth")

    # List orders as admin → 200
    r = sess_admin.get(f"{base}/api/v1/orders", timeout=10)
    check("Admin list orders", r, 200, "/api/v1/orders",
          "GET", "HIGH", "Orders")

    # Non-existent order → 404
    r = sess_admin.get(f"{base}/api/v1/orders/999999", timeout=10)
    check("Get non-existent order", r, 404, "/api/v1/orders/999999",
          "GET", "MEDIUM", "Orders")

    # Invalid order id → 422
    r = sess_admin.get(f"{base}/api/v1/orders/not-a-number", timeout=10)
    check("Get order with invalid id", r, 422, "/api/v1/orders/not-a-number",
          "GET", "MEDIUM", "Validation")

    # Create order — missing required fields → 422
    r = sess_admin.post(f"{base}/api/v1/orders", json={}, timeout=10)
    check("Create order empty body", r, 422, "/api/v1/orders",
          "POST", "MEDIUM", "Validation")

    # Create minimal valid order
    payload = {
        "client_id": 1,
        "service_id": 1,
    }
    r = sess_admin.post(f"{base}/api/v1/orders", json=payload, timeout=10)
    if r.status_code == 201:
        order_id = r.json().get("id")

        # Status patch — invalid transition
        r2 = sess_admin.patch(
            f"{base}/api/v1/orders/{order_id}/status",
            json={"status": "Cancelled"},
            timeout=10,
        )
        # Expect 200 or 400 (business rule), anything else is an error
        if r2.status_code not in (200, 400):
            find("Orders", "MEDIUM", f"/api/v1/orders/{order_id}/status", "PATCH",
                 "Unexpected status code on status transition",
                 expected="200 or 400", actual=r2.status_code)

        # Soft-delete
        r3 = sess_admin.delete(f"{base}/api/v1/orders/{order_id}", timeout=10)
        check("Soft-delete order", r3, 200, f"/api/v1/orders/{order_id}",
              "DELETE", "MEDIUM", "Orders")

        # Restore
        r4 = sess_admin.post(
            f"{base}/api/v1/orders/{order_id}/restore", timeout=10)
        check("Restore order", r4, 200, f"/api/v1/orders/{order_id}/restore",
              "POST", "MEDIUM", "Orders")
    else:
        find("Orders", "HIGH", "/api/v1/orders", "POST",
             "Could not create order with minimal payload",
             expected=201, actual=r.status_code,
             detail=r.text[:300])


def audit_users(base: str) -> None:
    sess_admin, _ = login(base, ADMIN)
    if _ is None:
        return

    r = sess_admin.get(f"{base}/api/v1/users", timeout=10)
    check("Admin list users", r, 200, "/api/v1/users",
          "GET", "HIGH", "Users")

    sess_mgr, _ = login(base, MANAGER)
    if _ is not None:
        r = sess_mgr.get(f"{base}/api/v1/users", timeout=10)
        if r.status_code not in (200, 403):
            find("Users", "MEDIUM", "/api/v1/users", "GET",
                 "Manager list users returned unexpected status",
                 expected="200 or 403", actual=r.status_code)

    # Non-existent user
    r = sess_admin.get(f"{base}/api/v1/users/999999", timeout=10)
    check("Get non-existent user", r, 404, "/api/v1/users/999999",
          "GET", "MEDIUM", "Users")


def audit_clients(base: str) -> None:
    sess_admin, _ = login(base, ADMIN)
    if _ is None:
        return

    r = sess_admin.get(f"{base}/api/v1/clients", timeout=10)
    check("Admin list clients", r, 200, "/api/v1/clients",
          "GET", "HIGH", "Clients")

    r = sess_admin.get(f"{base}/api/v1/clients/999999", timeout=10)
    check("Get non-existent client", r, 404, "/api/v1/clients/999999",
          "GET", "MEDIUM", "Clients")

    # Create client — missing fields → 422
    r = sess_admin.post(f"{base}/api/v1/clients", json={}, timeout=10)
    check("Create client empty body", r, 422, "/api/v1/clients",
          "POST", "MEDIUM", "Validation")


def audit_services(base: str) -> None:
    sess_admin, _ = login(base, ADMIN)
    if _ is None:
        return

    r = sess_admin.get(f"{base}/api/v1/services", timeout=10)
    check("Admin list services", r, 200, "/api/v1/services",
          "GET", "HIGH", "Services")

    r = sess_admin.get(f"{base}/api/v1/services/999999", timeout=10)
    check("Get non-existent service", r, 404, "/api/v1/services/999999",
          "GET", "MEDIUM", "Services")


def audit_security(base: str) -> None:
    # Ensure docs are NOT exposed in production-like scenario (info only)
    r = requests.get(f"{base}/api/docs", timeout=10)
    if r.status_code == 200:
        find("Security", "INFO", "/api/docs", "GET",
             "Swagger UI is publicly accessible",
             detail="Consider disabling in production via DOCS_URL=None")

    r = requests.get(f"{base}/api/openapi.json", timeout=10)
    if r.status_code == 200:
        find("Security", "INFO", "/api/openapi.json", "GET",
             "OpenAPI schema is publicly accessible")

    # SQL-injection probe in query param (should not cause 500)
    sess_admin, _ = login(base, ADMIN)
    if _ is not None:
        r = sess_admin.get(
            f"{base}/api/v1/orders?include_deleted=' OR '1'='1", timeout=10)
        if r.status_code == 500:
            find("Security", "CRITICAL", "/api/v1/orders", "GET",
                 "Possible SQL-injection: server returned 500 on crafted input",
                 detail=r.text[:300])


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def render_txt(findings: list[dict]) -> str:
    lines = [
        "=" * 70,
        "B2B AUDIT REPORT",
        f"Generated : {_now()}",
        f"Total     : {len(findings)} findings",
        "=" * 70,
    ]
    for i, f in enumerate(findings, 1):
        lines += [
            "",
            f"[{i}] [{f['severity']}] {f['category']} — {f['method']} {f['endpoint']}",
            f"    {f['description']}",
        ]
        if f.get("expected") is not None:
            lines.append(f"    Expected : {f['expected']}  |  Actual : {f['actual']}")
        if f.get("detail"):
            wrapped = textwrap.fill(f["detail"], width=66,
                                    initial_indent="    ", subsequent_indent="    ")
            lines.append(wrapped)
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="B2B Error Auditor")
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    parser.add_argument("--format", choices=["json", "txt"], default="json")
    parser.add_argument("--out", default=None,
                        help="Output file (default: audit_report.json or .txt)")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    fmt  = args.format
    out  = args.out or f"audit_report.{fmt}"

    print(f"[*] Auditing {base} …")

    audit_health(base)
    audit_auth(base)
    audit_orders(base)
    audit_users(base)
    audit_clients(base)
    audit_services(base)
    audit_security(base)

    print(f"[*] {len(FINDINGS)} finding(s) collected")

    if fmt == "json":
        report = {
            "generated_at": _now(),
            "base_url": base,
            "total": len(FINDINGS),
            "findings": FINDINGS,
        }
        text = json.dumps(report, ensure_ascii=False, indent=2)
    else:
        text = render_txt(FINDINGS)

    with open(out, "w", encoding="utf-8") as fh:
        fh.write(text)

    print(f"[+] Report saved → {out}")

    critical = sum(1 for f in FINDINGS if f["severity"] == "CRITICAL")
    if critical:
        print(f"[!] {critical} CRITICAL finding(s) found!", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
