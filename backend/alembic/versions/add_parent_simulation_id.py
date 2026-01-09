"""add parent_simulation_id

Revision ID: add_parent_simulation_id
Revises: c35588effcc4
Create Date: 2026-01-09 09:18:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_parent_simulation_id"
down_revision: Union[str, Sequence[str], None] = "c35588effcc4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add parent_simulation_id column to simulations table."""
    op.add_column(
        "simulations",
        sa.Column("parent_simulation_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_simulations_parent_simulation_id",
        "simulations",
        "simulations",
        ["parent_simulation_id"],
        ["id"],
    )


def downgrade() -> None:
    """Remove parent_simulation_id column from simulations table."""
    op.drop_constraint(
        "fk_simulations_parent_simulation_id", "simulations", type_="foreignkey"
    )
    op.drop_column("simulations", "parent_simulation_id")
