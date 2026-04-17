"""Convert service prices from cents to rubles.

Revision ID: 0003_prices_from_cents_to_rubles
Revises: 0002_order_events
Create Date: 2026-04-16
"""

from typing import Sequence, Union

from alembic import op


revision: str = "0003_prices_from_cents_to_rubles"
down_revision: Union[str, None] = "0002_order_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE services SET price = price / 100 WHERE price >= 100")


def downgrade() -> None:
    op.execute("UPDATE services SET price = price * 100")
