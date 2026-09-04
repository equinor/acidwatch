"""restructure grid simulations to use a simulation-side reference

Revision ID: 5fba0c16b695
Revises: a7f3c9d21b84
Create Date: 2026-09-04 13:18:59.644067

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "5fba0c16b695"
down_revision: Union[str, Sequence[str], None] = "a7f3c9d21b84"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("simulations", sa.Column("grid_id", sa.Uuid(), nullable=True))
    op.add_column(
        "simulations", sa.Column("grid_position", sa.Integer(), nullable=True)
    )
    op.create_index(
        op.f("ix_simulations_grid_id"), "simulations", ["grid_id"], unique=False
    )
    op.create_foreign_key(None, "simulations", "grid_simulations", ["grid_id"], ["id"])

    # Backfill grid_id/grid_position from the old simulation_ids array,
    # preserving the order each id appeared in.
    op.execute("""
        UPDATE simulations
        SET grid_id = grids.id,
            grid_position = members.position - 1
        FROM grid_simulations AS grids,
             json_array_elements_text(grids.simulation_ids)
                WITH ORDINALITY AS members(simulation_id, position)
        WHERE simulations.id = members.simulation_id::uuid
    """)

    op.drop_column("grid_simulations", "simulation_ids")


def downgrade() -> None:
    op.add_column(
        "grid_simulations",
        sa.Column("simulation_ids", sa.JSON(), nullable=True),
    )

    op.execute("""
        UPDATE grid_simulations
        SET simulation_ids = COALESCE(members.ids, '[]'::jsonb)
        FROM (
            SELECT grid_id, jsonb_agg(id::text ORDER BY grid_position) AS ids
            FROM simulations
            WHERE grid_id IS NOT NULL
            GROUP BY grid_id
        ) AS members
        WHERE grid_simulations.id = members.grid_id
    """)
    op.execute("""
        UPDATE grid_simulations
        SET simulation_ids = '[]'::jsonb
        WHERE simulation_ids IS NULL
    """)
    op.alter_column("grid_simulations", "simulation_ids", nullable=False)

    op.drop_constraint(
        op.f("simulations_grid_id_fkey"), "simulations", type_="foreignkey"
    )
    op.drop_index(op.f("ix_simulations_grid_id"), table_name="simulations")
    op.drop_column("simulations", "grid_position")
    op.drop_column("simulations", "grid_id")
