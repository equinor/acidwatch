"""add system table and refactor simulation chain

Revision ID: add_system_table
Revises: add_parent_simulation_id
Create Date: 2026-01-09 13:56:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_system_table"
down_revision: Union[str, Sequence[str], None] = "add_parent_simulation_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add System table and refactor Simulation to remove concentrations."""
    # Create systems table
    op.create_table(
        "systems",
        sa.Column("owner_id", sa.Uuid(), nullable=True),
        sa.Column("concentrations", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Add system_id column to simulations
    op.add_column(
        "simulations",
        sa.Column("system_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_simulations_system_id",
        "simulations",
        "systems",
        ["system_id"],
        ["id"],
    )

    # Remove concentrations column from simulations
    # Note: This is a breaking change - existing data will be lost
    op.drop_column("simulations", "concentrations")


def downgrade() -> None:
    """Restore old schema."""
    # Re-add concentrations column to simulations
    op.add_column(
        "simulations",
        sa.Column("concentrations", sa.JSON(), nullable=False),
    )

    # Drop system_id foreign key and column
    op.drop_constraint("fk_simulations_system_id", "simulations", type_="foreignkey")
    op.drop_column("simulations", "system_id")

    # Drop systems table
    op.drop_table("systems")
