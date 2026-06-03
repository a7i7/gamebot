"""add user_player to matches

Revision ID: 004
Revises: 003
Create Date: 2026-06-02
"""

from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("user_player", sa.SmallInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("matches", "user_player")
