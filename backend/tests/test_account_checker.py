import httpx

from app.services import account_checker as checker


class _Resp:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


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
