"""replace concentrations with phases

Revision ID: b5d2e3f14a70
Revises: a3f8b2c91d40
Create Date: 2026-06-17 00:00:00.000000

Renames the ``concentrations`` JSON column to ``phases`` on both
``simulations`` and ``results``, and transforms existing flat
concentration dicts into the new phase-list structure:

    {"H2O": 500} → [{"kind": "co2-rich", "fraction": 1.0, "concentrations": {"H2O": 500}}]
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b5d2e3f14a70"
down_revision: Union[str, Sequence[str], None] = "a3f8b2c91d40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("simulations", "results"):
        op.alter_column(table, "concentrations", new_column_name="phases")
        op.execute(f"""
            UPDATE {table}
            SET phases = jsonb_build_array(
                jsonb_build_object(
                    'kind', 'co2-rich',
                    'fraction', 1.0,
                    'concentrations', phases::jsonb
                )
            )::json
        """)


def downgrade() -> None:
    for table in ("simulations", "results"):
        op.execute(f"""
            UPDATE {table}
            SET phases = (phases::jsonb -> 0 -> 'concentrations')::json
        """)
        op.alter_column(table, "phases", new_column_name="concentrations")
