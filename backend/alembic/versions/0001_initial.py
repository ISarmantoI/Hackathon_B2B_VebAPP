"""Initial schema.

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


order_status = sa.Enum(
    "new",
    "in_progress",
    "completed",
    "cancelled",
    name="order_status",
)


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role_name", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_roles")),
        sa.UniqueConstraint("role_name", name=op.f("uq_roles_role_name")),
    )
    op.create_index(op.f("ix_roles_role_name"), "roles", ["role_name"], unique=False)

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inn", sa.String(length=12), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_clients")),
        sa.UniqueConstraint("inn", name=op.f("uq_clients_inn")),
    )
    op.create_index(op.f("ix_clients_company_name"), "clients", ["company_name"], unique=False)
    op.create_index(op.f("ix_clients_inn"), "clients", ["inn"], unique=False)

    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_services")),
    )
    op.create_index(op.f("ix_services_title"), "services", ["title"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("login", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], name=op.f("fk_users_role_id_roles")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("login", name=op.f("uq_users_login")),
    )
    op.create_index(op.f("ix_users_login"), "users", ["login"], unique=False)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("status", order_status, nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], name=op.f("fk_orders_client_id_clients")),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], name=op.f("fk_orders_service_id_services")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_orders_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_orders")),
    )


def downgrade() -> None:
    op.drop_table("orders")
    op.drop_index(op.f("ix_users_login"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_services_title"), table_name="services")
    op.drop_table("services")
    op.drop_index(op.f("ix_clients_inn"), table_name="clients")
    op.drop_index(op.f("ix_clients_company_name"), table_name="clients")
    op.drop_table("clients")
    op.drop_index(op.f("ix_roles_role_name"), table_name="roles")
    op.drop_table("roles")
