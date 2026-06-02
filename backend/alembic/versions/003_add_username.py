"""add username to users

Revision ID: 003
Revises: 002
Create Date: 2026-06-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nullable first, backfill from email prefix, then add unique constraint
    op.add_column("users", sa.Column("username", sa.Text(), nullable=True))
    op.execute("UPDATE users SET username = split_part(email, '@', 1) || '_' || LEFT(gen_random_uuid()::text, 8) WHERE username IS NULL")
    op.alter_column("users", "username", nullable=False)
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "username")
