from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import current_user
from ..db import get_db
from ..models import Snapshot, Status, User

router = APIRouter(tags=["data"])


class SnapshotIn(BaseModel):
    file_hash: str = Field(min_length=1, max_length=64)
    # Same shape the frontend builds in AppContext.addSnapshot (followers, following, blocked, ...)
    data: dict


class StatusesIn(BaseModel):
    statuses: dict[str, str] = Field(max_length=20_000)


def _snap_out(s: Snapshot) -> dict:
    return {**s.data, "id": s.id, "file_hash": s.file_hash, "uploaded_at": s.uploaded_at.isoformat()}


@router.get("/snapshots")
def list_snapshots(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Snapshot).where(Snapshot.user_id == user.id).order_by(Snapshot.uploaded_at, Snapshot.id)
    ).all()
    return [_snap_out(s) for s in rows]


@router.post("/snapshots", status_code=201)
def add_snapshot(body: SnapshotIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    existing = db.scalar(
        select(Snapshot).where(Snapshot.user_id == user.id, Snapshot.file_hash == body.file_hash)
    )
    if existing:
        raise HTTPException(status_code=409, detail="This file was already uploaded")
    snap = Snapshot(user_id=user.id, file_hash=body.file_hash, data=body.data)
    db.add(snap)
    try:
        db.commit()
    except IntegrityError:  # the same file was uploaded concurrently
        db.rollback()
        raise HTTPException(status_code=409, detail="This file was already uploaded")
    return _snap_out(snap)


@router.get("/statuses")
def get_statuses(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Status).where(Status.user_id == user.id)).all()
    return {r.username: r.status for r in rows}


@router.put("/statuses")
def put_statuses(body: StatusesIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    existing = {r.username: r for r in db.scalars(select(Status).where(Status.user_id == user.id))}
    for username, status in body.statuses.items():
        if username in existing:
            existing[username].status = status
        else:
            db.add(Status(user_id=user.id, username=username, status=status))
    db.commit()
    return {"detail": "saved"}


@router.delete("/history")
def clear_history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(Snapshot).where(Snapshot.user_id == user.id))
    db.execute(delete(Status).where(Status.user_id == user.id))
    db.commit()
    return {"detail": "cleared"}
