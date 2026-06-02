"""test runs and scored submissions

Revision ID: 002
Revises: 001
Create Date: 2026-06-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scored_submissions",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("submission_id", sa.UUID(as_uuid=True), sa.ForeignKey("submissions.id"), nullable=False),
        sa.Column("game", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("wins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("draws", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("losses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("matches_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_matches", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('pending','running','completed','failed')", name="chk_scored_status"),
    )

    op.add_column("matches", sa.Column("opponent", sa.Text(), nullable=True))
    op.add_column(
        "matches",
        sa.Column(
            "scored_submission_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("scored_submissions.id"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("matches", "scored_submission_id")
    op.drop_column("matches", "opponent")
    op.drop_table("scored_submissions")
