from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services import account_checker as checker

router = APIRouter(prefix="/check", tags=["checker"])


class CheckRequest(BaseModel):
    usernames: list[str] = Field(max_length=10_000)


@router.post("/start")
def start_check(body: CheckRequest):
    if checker.active_jobs() >= checker.MAX_ACTIVE_JOBS:
        raise HTTPException(status_code=429, detail="Too many scans running — try again shortly")
    job_id = checker.start_check(body.usernames)
    return {"job_id": job_id}


@router.get("/{job_id}")
def check_status(job_id: str):
    job = checker.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
def cancel_check(job_id: str):
    checker.cancel_job(job_id)
    return {"detail": "cancellation requested"}
