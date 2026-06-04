from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services import account_checker as checker

router = APIRouter(prefix="/check", tags=["checker"])


class CheckRequest(BaseModel):
    usernames: list[str]


@router.post("/start")
def start_check(body: CheckRequest):
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
