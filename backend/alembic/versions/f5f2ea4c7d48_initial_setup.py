"""initial setup

Revision ID: f5f2ea4c7d48
Revises:
Create Date: 2025-10-08 09:36:41.094557

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f5f2ea4c7d48"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "scenarios",
        sa.Column(
            "id", sa.Uuid, primary_key=True, default=sa.text("gen_random_uuid()")
        ),
        sa.Column("created_at", sa.DateTime, default=sa.text("now()")),
        sa.Column(
            "updated_at",
            sa.DateTime,
            default=sa.text("now()"),
            onupdate=sa.text("now()"),
        ),
        sa.Column("owner_id", sa.Uuid, nullable=True),
        sa.Column("model_id", sa.String, nullable=False),
        sa.Column("concentrations", sa.JSON, nullable=False),
        sa.Column("parameters", sa.JSON, nullable=False),
    )

    op.create_table(
        "results",
        sa.Column(
            "id", sa.Uuid, primary_key=True, default=sa.text("gen_random_uuid()")
        ),
        sa.Column("created_at", sa.DateTime, default=sa.text("now()")),
        sa.Column(
            "updated_at",
            sa.DateTime,
            default=sa.text("now()"),
            onupdate=sa.text("now()"),
        ),
        sa.Column(
            "scenario_id", sa.Uuid, sa.ForeignKey("scenarios.id"), nullable=False
        ),
        sa.Column("concentrations", sa.JSON, nullable=False),
        sa.Column("panels", sa.JSON, nullable=False),
        sa.Column("errors", sa.JSON, nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
