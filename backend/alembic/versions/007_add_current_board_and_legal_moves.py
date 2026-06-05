"""add current_board and current_legal_moves to matches

Revision ID: 007
Revises: 006
Create Date: 2026-06-05
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("current_board", JSONB, nullable=True))
    op.add_column("matches", sa.Column("current_legal_moves", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("matches", "current_legal_moves")
    op.drop_column("matches", "current_board")
