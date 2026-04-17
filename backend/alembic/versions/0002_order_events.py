"""Add order events timeline.

Revision ID: 0002_order_events
Revises: 0001_initial
Create Date: 2026-04-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_order_events"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "order_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("message", sa.String(length=1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name=op.f("fk_order_events_order_id_orders")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_order_events_user_id_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_order_events")),
    )
    op.create_index(op.f("ix_order_events_order_id"), "order_events", ["order_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_order_events_order_id"), table_name="order_events")
    op.drop_table("order_events")
