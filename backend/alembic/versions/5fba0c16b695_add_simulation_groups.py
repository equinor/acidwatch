"""add simulation groups

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
    op.rename_table("grid_simulations", "simulation_groups")
    op.alter_column("simulation_groups", "axes", nullable=True)

    op.add_column("simulations", sa.Column("group_id", sa.Uuid(), nullable=True))
    op.add_column("simulations", sa.Column("group_position", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_simulations_group_id"), "simulations", ["group_id"], unique=False
    )
    op.create_foreign_key(
        None, "simulations", "simulation_groups", ["group_id"], ["id"]
    )

    # Backfill group_id/group_position from the old simulation_ids array,
    # preserving the order each id appeared in.
    op.execute("""
        UPDATE simulations
        SET group_id = groups.id,
            group_position = members.position - 1
        FROM simulation_groups AS groups,
             jsonb_array_elements_text(groups.simulation_ids::jsonb)
                WITH ORDINALITY AS members(simulation_id, position)
        WHERE simulations.id = members.simulation_id::uuid
    """)

    op.drop_column("simulation_groups", "simulation_ids")


def downgrade() -> None:
    op.add_column(
        "simulation_groups",
        sa.Column("simulation_ids", sa.JSON(), nullable=True),
    )

    op.execute("""
        UPDATE simulation_groups
        SET simulation_ids = COALESCE(members.ids, '[]'::jsonb)
        FROM (
            SELECT group_id, jsonb_agg(id::text ORDER BY group_position) AS ids
            FROM simulations
            WHERE group_id IS NOT NULL
            GROUP BY group_id
        ) AS members
        WHERE simulation_groups.id = members.group_id
    """)
    op.execute("""
        UPDATE simulation_groups
        SET simulation_ids = '[]'::jsonb
        WHERE simulation_ids IS NULL
    """)
    op.alter_column("simulation_groups", "simulation_ids", nullable=False)

    op.drop_constraint(
        op.f("simulations_group_id_fkey"), "simulations", type_="foreignkey"
    )
    op.drop_index(op.f("ix_simulations_group_id"), table_name="simulations")
    op.drop_column("simulations", "group_position")
    op.drop_column("simulations", "group_id")

    op.alter_column("simulation_groups", "axes", nullable=False)
    op.rename_table("simulation_groups", "grid_simulations")
