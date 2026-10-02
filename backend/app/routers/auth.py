from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user, hash_password, verify_password
from ..db import get_db
from ..models import User

router = APIRouter(prefix="/auth", tags=["auth"])

_DUMMY_HASH = hash_password("not-a-real-password")


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


def _out(user: User) -> dict:
    return {"id": user.id, "email": user.email}


@router.post("/register", status_code=201)
def register(body: Credentials, request: Request, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    request.session["user_id"] = user.id
    return _out(user)


@router.post("/login")
def login(body: Credentials, request: Request, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    ok = verify_password(user.password_hash if user else _DUMMY_HASH, body.password)
    if not (user and ok):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    request.session["user_id"] = user.id
    return _out(user)


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"detail": "logged out"}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return _out(user)
