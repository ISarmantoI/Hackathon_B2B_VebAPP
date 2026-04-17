"""Add soft delete columns for core entities.

Revision ID: 0004_soft_delete_columns
Revises: 0003_prices_from_cents_to_rubles
Create Date: 2026-04-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_soft_delete_columns"
down_revision: Union[str, None] = "0003_prices_from_cents_to_rubles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_soft_delete_columns(table_name: str) -> None:
    op.add_column(table_name, sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column(table_name, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f(f"ix_{table_name}_is_deleted"), table_name, ["is_deleted"], unique=False)
    op.alter_column(table_name, "is_deleted", server_default=None)


def _drop_soft_delete_columns(table_name: str) -> None:
    op.drop_index(op.f(f"ix_{table_name}_is_deleted"), table_name=table_name)
    op.drop_column(table_name, "deleted_at")
    op.drop_column(table_name, "is_deleted")


def upgrade() -> None:
    _add_soft_delete_columns("clients")
    _add_soft_delete_columns("services")
    _add_soft_delete_columns("orders")
    _add_soft_delete_columns("users")


def downgrade() -> None:
    _drop_soft_delete_columns("users")
    _drop_soft_delete_columns("orders")
    _drop_soft_delete_columns("services")
    _drop_soft_delete_columns("clients")
