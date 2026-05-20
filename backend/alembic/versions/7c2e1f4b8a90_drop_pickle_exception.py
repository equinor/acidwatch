"""drop results.python_exception (PickleType)

Revision ID: 7c2e1f4b8a90
Revises: 9b4e2c1a7d50
Create Date: 2026-05-19 00:00:00.000000

Removes the ``python_exception`` column on ``results``, which used
SQLAlchemy ``PickleType``. Loading that column unpickled arbitrary bytes
from the database on every result read, which is an insecure-
deserialization sink (RCE primitive given any DB write capability).

The column was not used by application logic, so the existing pickled blobs are discarded.
Full exception details are logged to Application Insights via ``logger.exception`` instead
of being persisted in the database.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "7c2e1f4b8a90"
down_revision: Union[str, Sequence[str], None] = "9b4e2c1a7d50"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("results", "python_exception")


def downgrade() -> None:
    # Restore the column shape for compatibility, but not the data:
    # re-creating PickleType data would require reintroducing the
    # deserialization sink that this migration exists to remove.
    op.add_column(
        "results",
        sa.Column("python_exception", sa.PickleType(), nullable=True),
    )
