"""
Classifies Instagram accounts via public HTTP (no login needed).

4-tier classification:
  deleted              → username starts with __deleted__ or 404
  active_public        → og:description contains follower count
  private_or_inactive  → generic page (private OR deactivated — indistinguishable)
  unknown              → invalid username or network failure (never reported as inactive)

If Instagram rate-limits or demands a login (429 / 401 / 403 / login redirect) the
job stops with status "blocked" and keeps the partial results.

Results are stored in the in-memory job dict under 'results': {username: status}.
The frontend reads them when the job finishes and persists to IndexedDB.
"""

import re
import threading
import time
import uuid
import httpx
from concurrent.futures import ThreadPoolExecutor

MAX_WORKERS = 8
MAX_ACTIVE_JOBS = 3
JOB_TTL_SECONDS = 3600

_jobs: dict[str, dict] = {}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

_OG_FOLLOWERS_RE = re.compile(r'og:description.*?content="[^"]*Followers', re.IGNORECASE | re.DOTALL)
_USERNAME_RE     = re.compile(r'^[A-Za-z0-9._]{1,64}$')
_BLOCKED_CODES   = {401, 403, 429}

_BLOCKED = "blocked"  # internal sentinel — never stored as a username status


# ── Public API ────────────────────────────────────────────────────────────────

def start_check(usernames: list[str]) -> str:
    """Start a background HTTP classification job for the given usernames."""
    _purge_old_jobs()
    job_id = uuid.uuid4().hex[:10]
    _jobs[job_id] = {
        "status":              "running",
        "created_at":          time.time(),
        "total":               len(usernames),
        "checked":             0,
        "active_public":       0,
        "private_or_inactive": 0,
        "deleted":             0,
        "unknown":             0,
        "results":             {},
    }
    threading.Thread(target=_run, args=(job_id, usernames), daemon=True).start()
    return job_id


def active_jobs() -> int:
    return sum(1 for j in _jobs.values() if j["status"] == "running")


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def cancel_job(job_id: str):
    if job_id in _jobs:
        _jobs[job_id]["cancelled"] = True


def _purge_old_jobs():
    cutoff = time.time() - JOB_TTL_SECONDS
    for job_id in [k for k, j in _jobs.items() if j["status"] != "running" and j["created_at"] < cutoff]:
        _jobs.pop(job_id, None)


# ── HTTP classification ───────────────────────────────────────────────────────

def _classify(username: str) -> str:
    if username.startswith("__deleted__"):
        return "deleted"
    if not _USERNAME_RE.match(username):
        return "unknown"
    try:
        r = httpx.get(
            f"https://www.instagram.com/{username}/",
            headers=_HEADERS,
            follow_redirects=True,
            timeout=8,
        )
        if r.status_code == 404:
            return "deleted"
        if r.status_code in _BLOCKED_CODES or "accounts/login" in str(r.url):
            return _BLOCKED
        if _OG_FOLLOWERS_RE.search(r.text) or "biography" in r.text.lower():
            return "active_public"
        return "private_or_inactive"
    except Exception:
        return "unknown"


# ── Background runner ─────────────────────────────────────────────────────────

def _run(job_id: str, usernames: list[str]):
    job = _jobs[job_id]
    lock = threading.Lock()

    def do_check(username: str):
        if job.get("cancelled") or job.get("blocked"):
            return username, "unknown"
        status = _classify(username)
        if status == _BLOCKED:
            job["blocked"] = True
            return username, "unknown"
        with lock:
            job["checked"] += 1
            job[status] = job.get(status, 0) + 1
            job["results"][username] = status
        return username, status

    try:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            list(pool.map(do_check, usernames))
        if job.get("cancelled"):
            job["status"] = "cancelled"
        elif job.get("blocked"):
            job["status"] = "blocked"
        else:
            job["status"] = "done"
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
