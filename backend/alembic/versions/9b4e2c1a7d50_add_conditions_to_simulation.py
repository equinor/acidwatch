"""add conditions to simulation

Revision ID: 9b4e2c1a7d50
Revises: 01aaa143d690
Create Date: 2026-05-06 00:00:00.000000

"""

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "9b4e2c1a7d50"
down_revision: Union[str, Sequence[str], None] = "01aaa143d690"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_CONDITION_KEYS = ("temperature", "pressure")


def _as_dict(value: Any) -> dict:
    if value is None:
        return {}
    if isinstance(value, str):
        return json.loads(value or "{}")
    return dict(value)


def upgrade() -> None:
    op.add_column(
        "simulations",
        sa.Column(
            "conditions",
            sa.JSON(),
            nullable=True,
        ),
    )

    # Backfill: lift temperature/pressure from each model_input's parameters
    # up to the parent simulation's new conditions column.
    bind = op.get_bind()
    simulations = sa.table(
        "simulations",
        sa.column("id", sa.Uuid()),
        sa.column("conditions", sa.JSON()),
    )
    model_inputs = sa.table(
        "model_inputs",
        sa.column("id", sa.Uuid()),
        sa.column("simulation_id", sa.Uuid()),
        sa.column("parameters", sa.JSON()),
    )

    rows = bind.execute(
        sa.select(
            model_inputs.c.id, model_inputs.c.simulation_id, model_inputs.c.parameters
        )
    ).all()

    sim_conditions: dict = {}
    for mi_id, sim_id, params in rows:
        params = _as_dict(params)
        extracted = {k: params.pop(k) for k in _CONDITION_KEYS if k in params}
        if extracted:
            # Last writer wins if model_inputs disagree; they should match in practice.
            sim_conditions.setdefault(sim_id, {}).update(extracted)
            bind.execute(
                sa.update(model_inputs)
                .where(model_inputs.c.id == mi_id)
                .values(parameters=params)
            )

    for sim_id, conditions in sim_conditions.items():
        bind.execute(
            sa.update(simulations)
            .where(simulations.c.id == sim_id)
            .values(conditions=conditions)
        )


def downgrade() -> None:
    # Push conditions back into each model_input's parameters before dropping the column.
    bind = op.get_bind()
    simulations = sa.table(
        "simulations",
        sa.column("id", sa.Uuid()),
        sa.column("conditions", sa.JSON()),
    )
    model_inputs = sa.table(
        "model_inputs",
        sa.column("id", sa.Uuid()),
        sa.column("simulation_id", sa.Uuid()),
        sa.column("parameters", sa.JSON()),
    )

    sim_rows = bind.execute(sa.select(simulations.c.id, simulations.c.conditions)).all()
    for sim_id, conditions in sim_rows:
        conditions = _as_dict(conditions)
        if not conditions:
            continue
        mi_rows = bind.execute(
            sa.select(model_inputs.c.id, model_inputs.c.parameters).where(
                model_inputs.c.simulation_id == sim_id
            )
        ).all()
        for mi_id, params in mi_rows:
            merged = {**conditions, **_as_dict(params)}
            bind.execute(
                sa.update(model_inputs)
                .where(model_inputs.c.id == mi_id)
                .values(parameters=merged)
            )

    op.drop_column("simulations", "conditions")
