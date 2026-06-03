"""add missing indexes for scored_submissions and matches

Revision ID: 005
Revises: 004
Create Date: 2026-06-03
"""

from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # scored_submissions: FK and sort column were unindexed
    op.create_index("idx_scored_submissions_submission_id", "scored_submissions", ["submission_id"])
    op.create_index("idx_scored_submissions_created_at", "scored_submissions", ["created_at"], postgresql_ops={"created_at": "DESC"})

    # matches: scored_submission_id lookup and sort column were unindexed
    op.create_index("idx_matches_scored_submission_id", "matches", ["scored_submission_id"])
    op.create_index("idx_matches_created_at", "matches", ["created_at"], postgresql_ops={"created_at": "DESC"})


def downgrade() -> None:
    op.drop_index("idx_matches_created_at", table_name="matches")
    op.drop_index("idx_matches_scored_submission_id", table_name="matches")
    op.drop_index("idx_scored_submissions_created_at", table_name="scored_submissions")
    op.drop_index("idx_scored_submissions_submission_id", table_name="scored_submissions")
