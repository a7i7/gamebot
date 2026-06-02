"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-31

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text, nullable=False),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_users_email", "users", ["email"], unique=True)

    op.create_table(
        "submissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("game", sa.Text, nullable=False),
        sa.Column("lang", sa.Text, nullable=False),
        sa.Column("code", sa.Text, nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_submissions_user_game", "submissions", ["user_id", "game", "submitted_at"])

    op.create_table(
        "matches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("game", sa.Text, nullable=False),
        sa.Column("player1_submission_id", UUID(as_uuid=True), sa.ForeignKey("submissions.id"), nullable=False),
        sa.Column("player2_submission_id", UUID(as_uuid=True), sa.ForeignKey("submissions.id"), nullable=True),
        sa.Column("status", sa.Text, nullable=False, server_default="pending"),
        sa.Column("winner_player", sa.SmallInteger, nullable=True),
        sa.Column("is_draw", sa.Boolean, nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("turns", sa.Integer, nullable=True),
        sa.Column("final_board", JSONB, nullable=True),
        sa.Column("bot_logs", JSONB, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('pending','running','completed','failed')", name="chk_status"),
    )
    op.create_index("idx_matches_p1", "matches", ["player1_submission_id"])


def downgrade() -> None:
    op.drop_table("matches")
    op.drop_table("submissions")
    op.drop_table("users")
