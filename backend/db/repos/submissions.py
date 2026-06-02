import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Submission


async def create_submission(
    session: AsyncSession,
    user_id: uuid.UUID,
    game: str,
    lang: str,
    code: str,
) -> Submission:
    submission = Submission(user_id=user_id, game=game, lang=lang, code=code)
    session.add(submission)
    await session.commit()
    await session.refresh(submission)
    return submission


async def get_submission(session: AsyncSession, submission_id: uuid.UUID) -> Submission | None:
    result = await session.execute(select(Submission).where(Submission.id == submission_id))
    return result.scalar_one_or_none()
