import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt

_SECRET = os.environ.get("SECRET_KEY", "dev-secret-change-me")
_EXPIRE_DAYS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
_ALGORITHM = "HS256"


def create_access_token(user_id: uuid.UUID, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=_EXPIRE_DAYS),
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)


def decode_token(token: str) -> uuid.UUID:
    payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
    return uuid.UUID(payload["sub"])
