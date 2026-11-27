"""add models, the catalogue of models announced by workers

Revision ID: e1b7c4a9d302
Revises: 5fba0c16b695
Create Date: 2026-11-27 11:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e1b7c4a9d302"
down_revision: Union[str, Sequence[str], None] = "5fba0c16b695"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "models",
        sa.Column("model_id", sa.String(), nullable=False),
        sa.Column("descriptor", sa.JSON(), nullable=False),
        sa.Column("build_time", sa.DateTime(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), nullable=False),
        sa.Column("descriptor_seen_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id"),
    )
    op.create_index(
        op.f("ix_models_last_seen_at"), "models", ["last_seen_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_models_last_seen_at"), table_name="models")
    op.drop_table("models")
