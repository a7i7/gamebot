"""add moves column to matches

Revision ID: 006
Revises: 005
Create Date: 2026-06-04
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("moves", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("matches", "moves")
