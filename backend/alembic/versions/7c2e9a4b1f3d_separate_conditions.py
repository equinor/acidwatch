"""separate conditions (temperature, pressure) on simulations

Revision ID: 7c2e9a4b1f3d
Revises: 01aaa143d690
Create Date: 2026-04-30 06:45:00.000000

Lifts `temperature` and `pressure` out of every model_input's `parameters`
JSON blob and stores them as first-class columns on `simulations`. See
issue equinor/acidwatch#636 — conditions describe the system (alongside
concentrations), not individual model tuning.

Strategy:
  1. Add nullable `temperature`/`pressure` columns to `simulations`.
  2. Copy values from the first model_input per simulation that has them
     (they were always meant to be the same across the chain).
  3. Strip `temperature`/`pressure` keys from every model_input's
     `parameters` JSON.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "7c2e9a4b1f3d"
down_revision: Union[str, Sequence[str], None] = "01aaa143d690"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "simulations",
        sa.Column("temperature", sa.Float(), nullable=True),
    )
    op.add_column(
        "simulations",
        sa.Column("pressure", sa.Float(), nullable=True),
    )

    # Lift temperature/pressure from any model_input that has them. Across a
    # simulation's chain these values were always meant to be identical, so
    # picking the lowest created_at is safe. Columns are `json` (not jsonb)
    # so we cast to jsonb for key-existence and key-removal operators.
    op.execute("""
        UPDATE simulations s
        SET temperature = (
            SELECT (mi.parameters::jsonb->>'temperature')::float
            FROM model_inputs mi
            WHERE mi.simulation_id = s.id
              AND mi.parameters::jsonb ? 'temperature'
            ORDER BY mi.created_at ASC
            LIMIT 1
        )
    """)
    op.execute("""
        UPDATE simulations s
        SET pressure = (
            SELECT (mi.parameters::jsonb->>'pressure')::float
            FROM model_inputs mi
            WHERE mi.simulation_id = s.id
              AND mi.parameters::jsonb ? 'pressure'
            ORDER BY mi.created_at ASC
            LIMIT 1
        )
    """)

    # Strip the lifted keys out of each model_input's parameters JSON.
    op.execute("""
        UPDATE model_inputs
        SET parameters = ((parameters::jsonb) - 'temperature' - 'pressure')::json
        WHERE parameters::jsonb ? 'temperature'
           OR parameters::jsonb ? 'pressure'
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Best-effort restore: write the simulation's temperature/pressure back
    # into every model_input's parameters JSON, then drop the columns.
    op.execute("""
        UPDATE model_inputs mi
        SET parameters = (
            (mi.parameters::jsonb)
            || jsonb_build_object('temperature', s.temperature)
            || jsonb_build_object('pressure', s.pressure)
        )::json
        FROM simulations s
        WHERE mi.simulation_id = s.id
          AND s.temperature IS NOT NULL
          AND s.pressure IS NOT NULL
    """)
    op.drop_column("simulations", "pressure")
    op.drop_column("simulations", "temperature")
