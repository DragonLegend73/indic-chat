"""
Auth Router — Password-based JWT authentication for teacher dashboard.
"""

import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from jose import jwt, JWTError

from app.config import get_settings

logger = logging.getLogger("indic-chat.auth")
router = APIRouter()
settings = get_settings()


class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/auth/login")
async def login(req: LoginRequest):
    """Authenticate teacher with password, return JWT."""
    if req.password != settings.TEACHER_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": "teacher", "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    return TokenResponse(
        access_token=token,
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


async def require_teacher(request: Request):
    """Dependency: verify JWT token for protected routes."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = auth[7:]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub") != "teacher":
            raise HTTPException(status_code=403, detail="Not authorized")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
