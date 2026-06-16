"""add unique constraint on results.model_input_id

Revision ID: a3f8b2c91d40
Revises: 7c2e1f4b8a90
Create Date: 2026-06-16 00:00:00.000000

Enforces the intended one-to-one relationship between model_inputs and
results at the database level. The ORM already declares this as a singular
``Mapped[ModelResult | None]`` relationship, but previously no unique
constraint prevented duplicate results for a single model_input.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "a3f8b2c91d40"
down_revision: Union[str, Sequence[str], None] = "7c2e1f4b8a90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_results_model_input_id", "results", ["model_input_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_results_model_input_id", "results", type_="unique")
