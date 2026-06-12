"""add sweeps

Revision ID: a7f3c9d21b84
Revises: 7c2e1f4b8a90
Create Date: 2026-06-12 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a7f3c9d21b84"
down_revision: Union[str, Sequence[str], None] = "7c2e1f4b8a90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sweeps",
        sa.Column("owner_id", sa.Uuid(), nullable=True),
        sa.Column("swept_substance", sa.String(), nullable=False),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column(
        "simulations",
        sa.Column("sweep_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "simulations",
        sa.Column("sweep_value_index", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        op.f("simulations_sweep_id_fkey"),
        "simulations",
        "sweeps",
        ["sweep_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("simulations_sweep_id_fkey"), "simulations", type_="foreignkey"
    )
    op.drop_column("simulations", "sweep_value_index")
    op.drop_column("simulations", "sweep_id")
    op.drop_table("sweeps")
