"""add grid simulations

Revision ID: a7f3c9d21b84
Revises: b5d2e3f14a70
Create Date: 2026-06-12 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a7f3c9d21b84"
down_revision: Union[str, Sequence[str], None] = "b5d2e3f14a70"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "grid_simulations",
        sa.Column("owner_id", sa.Uuid(), nullable=True),
        sa.Column("axes", sa.JSON(), nullable=False),
        sa.Column("simulation_ids", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("grid_simulations")
