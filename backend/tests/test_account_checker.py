import httpx

from app.services import account_checker as checker


class _Resp:
    def __init__(self, status_code=200, text="", url="https://www.instagram.com/someone/"):
        self.status_code = status_code
        self.text = text
        self.url = url


def _patch_get(monkeypatch, resp=None, exc=None):
    def fake_get(*args, **kwargs):
        if exc:
            raise exc
        return resp
    monkeypatch.setattr(httpx, "get", fake_get)


# ── _classify ─────────────────────────────────────────────────────────────────

def test_deleted_prefix_skips_network(monkeypatch):
    _patch_get(monkeypatch, exc=AssertionError("should not be called"))
    assert checker._classify("__deleted__123") == "deleted"


def test_404_is_deleted(monkeypatch):
    _patch_get(monkeypatch, _Resp(404))
    assert checker._classify("gone") == "deleted"


def test_active_public_by_og_description(monkeypatch):
    html = '<meta property="og:description" content="1,234 Followers, 10 Following">'
    _patch_get(monkeypatch, _Resp(200, html))
    assert checker._classify("someone") == "active_public"


def test_active_public_by_biography(monkeypatch):
    _patch_get(monkeypatch, _Resp(200, '{"biography":"hi"}'))
    assert checker._classify("someone") == "active_public"


def test_generic_page_is_private_or_inactive(monkeypatch):
    _patch_get(monkeypatch, _Resp(200, "<html>Instagram</html>"))
    assert checker._classify("private_user") == "private_or_inactive"


# ── blocked / unknown ─────────────────────────────────────────────────────────

def test_rate_limit_is_blocked(monkeypatch):
    for code in (401, 403, 429):
        _patch_get(monkeypatch, _Resp(code))
        assert checker._classify("someone") == "blocked"


def test_login_redirect_is_blocked(monkeypatch):
    _patch_get(monkeypatch, _Resp(200, "<html>Log in</html>", url="https://www.instagram.com/accounts/login/"))
    assert checker._classify("someone") == "blocked"


def test_network_error_is_unknown(monkeypatch):
    _patch_get(monkeypatch, exc=httpx.ConnectTimeout("timeout"))
    assert checker._classify("someone") == "unknown"


def test_invalid_username_is_unknown_without_request(monkeypatch):
    _patch_get(monkeypatch, exc=AssertionError("should not be called"))
    assert checker._classify("bad/name?x=1") == "unknown"


# ── job runner ────────────────────────────────────────────────────────────────

def _run_job(monkeypatch, usernames, classify):
    monkeypatch.setattr(checker, "_classify", classify)
    checker._jobs["t"] = {
        "status": "running", "created_at": 0, "total": len(usernames), "checked": 0,
        "active_public": 0, "private_or_inactive": 0, "deleted": 0, "unknown": 0, "results": {},
    }
    monkeypatch.setattr(checker, "MAX_WORKERS", 1)
    checker._run("t", usernames)
    return checker._jobs.pop("t")


def test_job_done(monkeypatch):
    job = _run_job(monkeypatch, ["a", "b"], lambda u: "active_public")
    assert job["status"] == "done"
    assert job["results"] == {"a": "active_public", "b": "active_public"}
    assert job["active_public"] == 2


def test_job_blocked_keeps_partial_results(monkeypatch):
    job = _run_job(monkeypatch, ["a", "b", "c"], lambda u: "blocked" if u == "b" else "active_public")
    assert job["status"] == "blocked"
    assert job["results"] == {"a": "active_public"}


def test_purge_old_finished_jobs(monkeypatch):
    checker._jobs.clear()
    checker._jobs["old"] = {"status": "done", "created_at": 0}
    checker._jobs["running"] = {"status": "running", "created_at": 0}
    checker._purge_old_jobs()
    assert list(checker._jobs) == ["running"]
    checker._jobs.clear()
