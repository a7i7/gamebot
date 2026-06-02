import uuid

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.jwt import decode_token
from db.engine import get_session
from db.models import User
from db.repos import users as users_repo
from sqlalchemy.ext.asyncio import AsyncSession

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    token = credentials.credentials
    try:
        user_id = decode_token(token)
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = await users_repo.get_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
