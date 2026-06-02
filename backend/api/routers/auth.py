from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.deps import get_current_user
from auth.hashing import hash_password, verify_password
from auth.jwt import create_access_token
from db.engine import get_session
from db.models import User
from db.repos import users as users_repo
from api.models import LoginRequest, MeResponse, SignupRequest, TokenResponse

router = APIRouter()


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(
    req: SignupRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    existing = await users_repo.get_by_email(session, req.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = await users_repo.create_user(session, req.email, hash_password(req.password))
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    user = await users_repo.get_by_email(session, req.email)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=str(current_user.id),
        email=current_user.email,
        created_at=current_user.created_at,
    )
