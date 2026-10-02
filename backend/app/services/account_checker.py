"""
Classifies Instagram accounts via public HTTP (no login needed).

3-tier classification:
  deleted              → username starts with __deleted__ or 404
  active_public        → og:description contains follower count
  private_or_inactive  → generic page (private OR deactivated — indistinguishable)

Results are stored in the in-memory job dict under 'results': {username: status}.
The frontend reads them when the job finishes and persists to IndexedDB.
"""

import re
import threading
import uuid
import httpx
from concurrent.futures import ThreadPoolExecutor

MAX_WORKERS = 8

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


# ── Public API ────────────────────────────────────────────────────────────────

def start_check(usernames: list[str]) -> str:
    """Start a background HTTP classification job for the given usernames."""
    job_id = uuid.uuid4().hex[:10]
    _jobs[job_id] = {
        "status":              "running",
        "total":               len(usernames),
        "checked":             0,
        "active_public":       0,
        "private_or_inactive": 0,
        "deleted":             0,
        "results":             {},
    }
    threading.Thread(target=_run, args=(job_id, usernames), daemon=True).start()
    return job_id


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def cancel_job(job_id: str):
    if job_id in _jobs:
        _jobs[job_id]["cancelled"] = True


# ── HTTP classification ───────────────────────────────────────────────────────

def _classify(username: str) -> str:
    if username.startswith("__deleted__"):
        return "deleted"
    try:
        r = httpx.get(
            f"https://www.instagram.com/{username}/",
            headers=_HEADERS,
            follow_redirects=True,
            timeout=8,
        )
        if r.status_code == 404:
            return "deleted"
        if _OG_FOLLOWERS_RE.search(r.text) or "biography" in r.text.lower():
            return "active_public"
        return "private_or_inactive"
    except Exception:
        return "private_or_inactive"


# ── Background runner ─────────────────────────────────────────────────────────

def _run(job_id: str, usernames: list[str]):
    job = _jobs[job_id]
    lock = threading.Lock()

    def do_check(username: str):
        if job.get("cancelled"):
            return username, "private_or_inactive"
        status = _classify(username)
        with lock:
            job["checked"] += 1
            job[status] = job.get(status, 0) + 1
            job["results"][username] = status
        return username, status

    try:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            list(pool.map(do_check, usernames))
        job["status"] = "cancelled" if job.get("cancelled") else "done"
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
