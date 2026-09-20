"""Tests for GCAL — General Connector Abstraction Layer (wave 1).

Requires a running CouchDB on localhost:5984 (the project default) for the
store. Uses an isolated ``gcal_test_`` DB prefix — dropped at import for a
clean slate.

Provider calls never touch the network: handlers run against injected fake
transports (``transport=`` for HTTP, ``smtp_factory=`` for SMTP, ``tmp_path``
for files), and server-level tests patch ``srv.base.default_transport`` so
the full gateway path runs hermetic.

Covers wave 1: the registry, base helpers, all six connectors (goldens per
action), the connection lifecycle (connect → test → execute → disconnect →
reconnect-hint → delete), use-driven health, masking, audit, settings, self
monitoring, export, and the API index.
"""
import json
import os

os.environ["COUCHDB_DB_PREFIX"] = "gcal_test_"
os.environ.setdefault("COUCHDB_URL", "http://localhost:5984")
os.environ.setdefault("COUCHDB_USER", "admin")
os.environ.setdefault("COUCHDB_PASSWORD", "admin")

# Drop any stale test DB before the server module creates & seeds it.
import couchdb  # noqa: E402

_srv = couchdb.Server(os.environ["COUCHDB_URL"])
_srv.resource.credentials = (os.environ["COUCHDB_USER"], os.environ["COUCHDB_PASSWORD"])
try:
    if "gcal_test_gcal" in _srv:
        _srv.delete("gcal_test_gcal")
    _couch_ok = True
except Exception:  # pragma: no cover - CouchDB unreachable
    _couch_ok = False

import pytest  # noqa: E402

if not _couch_ok:  # pragma: no cover
    pytest.skip("CouchDB not reachable on localhost:5984", allow_module_level=True)

import importlib.util  # noqa: E402
import sys  # noqa: E402

_HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("gcal_server", os.path.join(_HERE, "server.py"))
srv = importlib.util.module_from_spec(_spec)
sys.modules["gcal_server"] = srv
_spec.loader.exec_module(srv)

import base as gbase  # noqa: E402  (tool root is on sys.path via server.py)
from connectors import github as gh  # noqa: E402
from connectors import rss as rssmod  # noqa: E402


@pytest.fixture
def client():
    for d in srv.store.all():
        srv.store.delete(d["id"])
    srv.store.seed([srv.SEED_PATH])
    srv._ensure_settings_doc()
    app = srv.app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ── hermetic transports ──────────────────────────────────────────────────────

def _fake(routes):
    """Fake HTTP transport: {(method, url_prefix): (status, headers, body)}."""
    calls = []

    def transport(method, url, headers, body, timeout_s):
        calls.append({"method": method, "url": url, "headers": headers,
                      "body": body})
        for (m, prefix), resp in routes.items():
            if method == m and url.startswith(prefix):
                if isinstance(resp, Exception):
                    raise resp
                return resp
        return (404, {}, "not found")

    transport.calls = calls
    return transport


RSS_XML = """<?xml version="1.0"?>
<rss version="2.0"><channel><title>Demo</title><link>http://x</link>
<item><title>One</title><link>http://x/1</link><pubDate>today</pubDate>
<description>first</description></item>
<item><title>Two</title><link>http://x/2</link><pubDate>yesterday</pubDate>
<description>second</description></item></channel></rss>"""

ATOM_XML = """<feed xmlns="http://www.w3.org/2005/Atom"><title>A</title>
<entry><title>E1</title><link href="http://x/e1"/><updated>now</updated>
<summary>sum</summary></entry></feed>"""

GITHUB_SEARCH = (200, {"content-type": "application/json"},
                 json.dumps({"total_count": 1, "items": [
                     {"full_name": "a/b", "description": "d",
                      "stargazers_count": 3, "html_url": "http://x"}]}))
GITHUB_RATE = (200, {"content-type": "application/json"},
               json.dumps({"resources": {"core": {"limit": 60, "remaining": 59}}}))
GITHUB_QUOTA_OUT = (403, {"x-ratelimit-remaining": "0"}, "quota out")
COUCH_INFO = (200, {"content-type": "application/json"},
              json.dumps({"db_name": "t", "doc_count": 3}))
COUCH_FIND = (200, {"content-type": "application/json"},
              json.dumps({"docs": [{"_id": "a", "x": 1}]}))
COUCH_PUT = (201, {"content-type": "application/json"},
             json.dumps({"ok": True, "id": "a", "rev": "1-x"}))


class _FakeSMTP:
    def __init__(self, fail=None):
        self.fail = fail
        self.sent = []
        self.logins = []

    def starttls(self, context=None):
        pass

    def login(self, user, password):
        self.logins.append((user, password))
        if isinstance(self.fail, gbase.AdapterError):
            raise self.fail

    def noop(self):
        if isinstance(self.fail, Exception) and not isinstance(
                self.fail, gbase.AdapterError):
            raise self.fail
        return (250, "ok")

    def send_message(self, msg):
        if self.fail:
            raise self.fail
        self.sent.append(msg)
        return {}

    def quit(self):
        pass


def _smtp_factory_for(box):
    def factory(host, port, security, timeout_s):
        box["client"] = _FakeSMTP()
        return box["client"]
    return factory


# ── registry + base ──────────────────────────────────────────────────────────

class TestRegistry:
    def test_six_live_connectors(self):
        reg = {r["id"]: r for r in srv.connectors.registry()}
        assert set(reg) == {"http", "rss", "github", "couchdb", "files",
                            "smtp"}
        for r in reg.values():
            assert r["status"] == "live"
            assert r["auth_scheme"] in ("none", "bearer", "basic", "api_key")
            assert r["actions"], r["id"]
            for a in r["actions"]:
                assert a["kind"] in ("action", "search", "find_or_create")
                assert a["params"]

    def test_base_validate_and_mask(self):
        schema = [{"name": "host", "type": "text", "required": True},
                  {"name": "port", "type": "number", "required": False,
                   "default": 25}]
        clean, err = gbase.validate_fields(schema, {"host": "h"})
        assert err is None and clean == {"host": "h", "port": 25}
        _, err = gbase.validate_fields(schema, {})
        assert "host" in err
        assert gbase.mask({"token": "abc", "nested": {"k": "v"}, "n": 0}) == {
            "token": "●●●", "nested": {"k": "●●●"}, "n": 0}

    def test_base_classify_defaults(self):
        h = srv.connectors.get("http")
        assert h.classify({"ok": True}) == "ok"
        assert h.classify({"ok": False, "status": 401}) == "auth_failure"
        assert h.classify({"ok": False, "status": 404}) == "bad_params"
        assert h.classify({"ok": False, "status": 500}) == "retryable"


# ── connector goldens (handler level, hermetic) ──────────────────────────────

class TestHttp:
    def test_request_injects_bearer_and_resolves_relative(self):
        h = srv.connectors.get("http")
        conn = {"id": "c", "settings": {"base_url": "https://api.x.test/v1"},
                "credentials": {"scheme": "bearer", "token": "sekret"}}
        fake = _fake({("GET", "https://api.x.test/v1/things"): (200, {}, "[]")})
        res = h.execute(conn, "request",
                        {"method": "GET", "url": "/things?a=b"}, transport=fake)
        assert res["status"] == 200
        assert fake.calls[0]["headers"]["Authorization"] == "Bearer sekret"
        assert fake.calls[0]["url"] == "https://api.x.test/v1/things?a=b"

    def test_request_error_classifies(self):
        h = srv.connectors.get("http")
        conn = {"id": "c", "settings": {}, "credentials": {}}
        fake = _fake({("GET", "https://x.test/"): (404, {}, "nope")})
        try:
            h.execute(conn, "request", {"url": "https://x.test/"}, transport=fake)
            assert False, "should raise"
        except gbase.AdapterError as exc:
            assert exc.kind == "bad_params"


class TestRss:
    def test_parse_rss_and_atom(self):
        meta, entries = rssmod.parse_feed(RSS_XML)
        assert meta["title"] == "Demo" and len(entries) == 2
        assert entries[0]["title"] == "One"
        _, entries = rssmod.parse_feed(ATOM_XML)
        assert entries[0]["link"] == "http://x/e1"

    def test_parse_malformed_is_bad_params(self):
        try:
            rssmod.parse_feed("<rss><broken")
            assert False, "should raise"
        except gbase.AdapterError as exc:
            assert exc.kind == "bad_params"

    def test_read_honors_max_items(self):
        h = srv.connectors.get("rss")
        conn = {"id": "c", "settings": {"feed_url": "http://x.test/f",
                                        "max_items": 20}, "credentials": {}}
        fake = _fake({("GET", "http://x.test/f"): (200, {}, RSS_XML)})
        res = h.execute(conn, "read", {"max_items": 1}, transport=fake)
        assert res["total"] == 2 and len(res["entries"]) == 1


class TestGithub:
    def test_search_repos(self):
        h = srv.connectors.get("github")
        conn = {"id": "c", "settings": {}, "credentials": {}}
        fake = _fake({("GET", "https://api.github.com/search/repositories"): GITHUB_SEARCH})
        res = h.execute(conn, "search_repos", {"q": "x"}, transport=fake)
        assert res["repos"][0]["full_name"] == "a/b"
        assert "Authorization" not in fake.calls[0]["headers"]

    def test_quota_exhaustion_is_retryable(self):
        assert gh.Handler().classify(
            {"ok": False, "status": 403,
             "headers": {"x-ratelimit-remaining": "0"}}) == "retryable"
        assert gh.Handler().classify(
            {"ok": False, "status": 401, "headers": {}}) == "auth_failure"

    def test_write_requires_confirm(self):
        h = srv.connectors.get("github")
        conn = {"id": "c", "settings": {}, "credentials": {"token": "t"}}
        try:
            h.execute(conn, "dispatch", {"repo": "a/b", "event_type": "e"},
                      transport=_fake({}))
            assert False, "should raise"
        except gbase.AdapterError as exc:
            assert "confirm" in str(exc)


class TestCouchdb:
    def test_search_and_put(self):
        h = srv.connectors.get("couchdb")
        conn = {"id": "c", "settings": {"base_url": "http://db:5984",
                                        "database": "t"},
                "credentials": {"username": "a", "password": "b"}}
        fake = _fake({("POST", "http://db:5984/t/_find"): COUCH_FIND,
                      ("PUT", "http://db:5984/t/a"): COUCH_PUT})
        res = h.execute(conn, "search", {"selector": '{"type":"x"}'},
                        transport=fake)
        assert res["docs"][0]["_id"] == "a"
        assert fake.calls[0]["headers"]["Authorization"].startswith("Basic ")
        res = h.execute(conn, "put", {"doc": '{"id": "a", "x": 1}'},
                        transport=fake)
        assert res["rev"] == "1-x"

    def test_delete_requires_confirm(self):
        h = srv.connectors.get("couchdb")
        conn = {"id": "c", "settings": {"database": "t"}, "credentials": {}}
        try:
            h.execute(conn, "delete", {"doc_id": "a", "rev": "1-x"},
                      transport=_fake({}))
            assert False, "should raise"
        except gbase.AdapterError as exc:
            assert "confirm" in str(exc)


class TestFiles:
    def test_list_and_read(self, tmp_path):
        (tmp_path / "a.md").write_text("hello", encoding="utf-8")
        (tmp_path / "sub").mkdir()
        h = srv.connectors.get("files")
        conn = {"id": "c", "settings": {"root": str(tmp_path)}, "credentials": {}}
        assert {e["name"] for e in h.execute(conn, "list", {})["entries"]} >= {"a.md", "sub"}
        assert h.execute(conn, "read", {"path": "a.md"})["content"] == "hello"

    def test_escape_refused(self, tmp_path):
        h = srv.connectors.get("files")
        conn = {"id": "c", "settings": {"root": str(tmp_path)}, "credentials": {}}
        try:
            h.execute(conn, "read", {"path": "../../etc/passwd"})
            assert False, "should raise"
        except gbase.AdapterError as exc:
            assert "escapes" in str(exc)


class TestSmtp:
    def test_send_records_message(self):
        box = {}
        h = srv.connectors.get("smtp")
        conn = {"id": "c", "settings": {"host": "m.test", "username": "u"},
                "credentials": {"password": "p"}}
        res = h.execute(conn, "send", {"to": "a@x.test", "subject": "s", "body": "b"},
                        smtp_factory=_smtp_factory_for(box))
        assert res["sent"] and box["client"].logins == [("u", "p")]
        assert box["client"].sent[0]["To"] == "a@x.test"

    def test_bad_recipient_and_auth(self):
        h = srv.connectors.get("smtp")
        conn = {"id": "c", "settings": {"host": "m.test"}, "credentials": {}}
        try:
            h.execute(conn, "send", {"to": "not-an-address", "body": "b"},
                      smtp_factory=_smtp_factory_for({}))
            assert False, "should raise"
        except gbase.AdapterError as exc:
            assert exc.kind == "bad_params"

        import smtplib
        box = {}

        def failing_factory(host, port, security, timeout_s):
            client = _FakeSMTP()

            def login(u, p):
                raise smtplib.SMTPAuthenticationError(535, "no")
            client.login = login
            box["client"] = client
            return client

        auth_conn = {"id": "c", "settings": {"host": "m.test", "username": "u"},
                     "credentials": {}}
        try:
            h.execute(auth_conn, "send", {"to": "a@x.test", "body": "b"},
                      smtp_factory=failing_factory)
            assert False, "should raise"
        except gbase.AdapterError as exc:
            assert exc.kind == "auth_failure"


# ── connections: the lifecycle (server level, hermetic gateway) ─────────────

def _patch_transport(monkeypatch, routes):
    monkeypatch.setattr(srv.base, "default_transport", _fake(routes))


class TestConnections:
    def _mk(self, client, **over):
        body = {"connector_id": over.pop("connector_id", "github"),
                "name": over.pop("name", "GH"),
                "settings": over.pop("settings", {}),
                "credentials": over.pop("credentials", {})}
        body.update(over)
        return client.post("/api/connections", json=body)

    def test_create_connected_and_masked(self, client):
        res = self._mk(client, credentials={"token": "sekret"})
        assert res.status_code == 201
        doc = res.get_json()
        assert doc["id"].startswith("CON-")
        assert doc["state"] == "connected"
        assert doc["credentials"] == {"token": "●●●"}
        assert "sekret" not in json.dumps(doc)

    def test_create_validates(self, client):
        assert self._mk(client, connector_id="nope").status_code == 400
        assert self._mk(client, name="").status_code == 400
        assert client.post("/api/connections", json={}).status_code == 400
        res = self._mk(client, connector_id="rss", settings={})
        assert res.status_code == 400  # feed_url required

    def test_test_ok_and_error(self, client, monkeypatch):
        _patch_transport(monkeypatch, {
            ("GET", "https://api.github.com/rate_limit"): GITHUB_RATE})
        doc = self._mk(client).get_json()
        res = client.post(f"/api/connections/{doc['id']}/test")
        assert res.status_code == 200
        assert res.get_json()["last_test"]["result"] == "ok"

        _patch_transport(monkeypatch, {
            ("GET", "https://api.github.com/rate_limit"): (500, {}, "down")})
        res = client.post(f"/api/connections/{doc['id']}/test")
        assert res.get_json()["last_test"]["result"] == "error"

    def test_execute_gates_and_logs(self, client, monkeypatch):
        _patch_transport(monkeypatch, {
            ("GET", "https://api.github.com/search/repositories"): GITHUB_SEARCH})
        doc = self._mk(client).get_json()
        res = client.post("/api/execute", json={
            "connection_id": doc["id"], "action": "search_repos",
            "params": {"q": "x"}})
        assert res.status_code == 200
        body = res.get_json()
        assert body["result"]["repos"][0]["full_name"] == "a/b"
        runs = client.get(
            f"/api/executions?connection_id={doc['id']}").get_json()
        assert len(runs) == 1 and runs[0]["status"] == "ok"
        detail = client.get(f"/api/connections/{doc['id']}").get_json()
        assert detail["executions_total"] == 1
        assert detail["last_used_at"]

    def test_disconnect_reconnect_cycle(self, client, monkeypatch):
        _patch_transport(monkeypatch, {
            ("GET", "https://api.github.com/search/repositories"): GITHUB_SEARCH})
        doc = self._mk(client, credentials={"token": "sekret"}).get_json()
        res = client.post(f"/api/connections/{doc['id']}/disconnect")
        assert res.status_code == 200
        disc = res.get_json()
        assert disc["state"] == "disconnected"
        assert disc["credentials"] == {}
        # use while disconnected → 409 with the reconnect hint
        res = client.post("/api/execute", json={
            "connection_id": doc["id"], "action": "search_repos",
            "params": {"q": "x"}})
        assert res.status_code == 409
        assert "reconnect" in res.get_json()
        # settings + history kept
        assert client.get("/api/audit?action=connection.disconnect").get_json()
        # delete keeps the execution log
        client.post(f"/api/connections/{doc['id']}/disconnect")
        assert client.delete(f"/api/connections/{doc['id']}").status_code == 200
        assert client.get(f"/api/connections/{doc['id']}").status_code == 404

    def test_health_trips_on_failures(self, client, monkeypatch):
        client.put("/api/settings", json={"max_consecutive_failures": 1})
        _patch_transport(monkeypatch, {
            ("GET", "https://api.github.com/search/repositories"): (500, {}, "down")})
        doc = self._mk(client).get_json()
        res = client.post("/api/execute", json={
            "connection_id": doc["id"], "action": "search_repos",
            "params": {"q": "x"}})
        assert res.status_code == 502
        assert client.get(f"/api/connections/{doc['id']}").get_json()["state"] == "error"

    def test_auth_failure_trips_immediately(self, client, monkeypatch):
        _patch_transport(monkeypatch, {
            ("GET", "https://api.github.com/search/repositories"): (401, {}, "bad")})
        doc = self._mk(client, credentials={"token": "dead"}).get_json()
        client.post("/api/execute", json={
            "connection_id": doc["id"], "action": "search_repos",
            "params": {"q": "x"}})
        assert client.get(f"/api/connections/{doc['id']}").get_json()["state"] == "error"

    def test_execute_unknown_action(self, client):
        doc = self._mk(client).get_json()
        assert client.post("/api/execute", json={
            "connection_id": doc["id"], "action": "nope"}).status_code == 400

    def test_bad_params_answers_400(self, client, tmp_path):
        res = client.post("/api/connections", json={
            "connector_id": "files", "name": "T",
            "settings": {"root": str(tmp_path)}})
        cid = res.get_json()["id"]
        res = client.post("/api/execute", json={
            "connection_id": cid, "action": "read",
            "params": {"path": "../../x"}})
        assert res.status_code == 400
        assert res.get_json()["class"] == "bad_params"

    def test_executions_filters_and_clear(self, client, monkeypatch):
        _patch_transport(monkeypatch, {
            ("GET", "https://api.github.com/search/repositories"): GITHUB_SEARCH})
        doc = self._mk(client).get_json()
        client.post("/api/execute", json={
            "connection_id": doc["id"], "action": "search_repos",
            "params": {"q": "x"}})
        assert client.get("/api/executions?status=ok").get_json()
        assert client.get("/api/executions?q=search_repos").get_json()
        one = client.get("/api/executions").get_json()[0]
        assert client.get(f"/api/executions/{one['id']}").status_code == 200
        assert client.get("/api/executions/EXE-nope").status_code == 404
        res = client.delete("/api/executions")
        assert res.get_json()["deleted"] >= 1
        assert client.get("/api/executions").get_json() == []

    def test_oauth_endpoints_501_until_wave2(self, client):
        doc = self._mk(client).get_json()
        assert client.get(f"/api/connections/{doc['id']}/auth/start").status_code == 501
        assert client.get(f"/api/connections/{doc['id']}/auth/callback").status_code == 501


# ── audit, settings, self, export, index ─────────────────────────────────────

class TestSystem:
    def test_audit_records_mutations(self, client):
        doc = client.post("/api/connections", json={
            "connector_id": "rss", "name": "F",
            "settings": {"feed_url": "http://x.test/f"}}).get_json()
        client.post(f"/api/connections/{doc['id']}/disconnect")
        actions = [e["action"] for e in client.get("/api/audit").get_json()]
        assert "connection.create" in actions
        assert "connection.disconnect" in actions
        by_action = client.get("/api/audit?action=connection.create").get_json()
        assert by_action[0]["entity_id"] == doc["id"]

    def test_settings_defaults_and_validation(self, client):
        body = client.get("/api/settings").get_json()
        assert body["settings"]["max_consecutive_failures"] == 3
        assert len(body["environment"]["connectors"]) == 6
        assert client.put("/api/settings",
                          json={"default_timeout_s": "soon"}).status_code == 400
        res = client.put("/api/settings", json={"execution_retention": 999999})
        assert res.status_code == 200
        assert res.get_json()["execution_retention"] == 100000  # clamped
        audit = client.get("/api/audit?action=settings.update").get_json()
        assert audit

    def test_self_blob(self, client):
        client.post("/api/connections", json={
            "connector_id": "rss", "name": "F",
            "settings": {"feed_url": "http://x.test/f"}})
        blob = client.get("/api/self").get_json()
        assert blob["store"]["db"].endswith("gcal")
        assert blob["connections"]["total"] >= 1
        assert len(blob["engine"]["connectors"]) == 6
        assert "uptime_s" in blob

    def test_overview_payload(self, client):
        client.post("/api/connections", json={
            "connector_id": "rss", "name": "F",
            "settings": {"feed_url": "http://x.test/f"}})
        o = client.get("/api/overview").get_json()
        assert o["connections"]["total"] >= 1
        assert o["registry"]
        assert "recent" in o

    def test_export_bundle_masks_credentials(self, client):
        client.post("/api/connections", json={
            "connector_id": "github", "name": "G",
            "credentials": {"token": "sekret"}})
        bundle = client.get("/api/export").get_json()
        assert len(bundle["connections"]) >= 1
        assert "sekret" not in json.dumps(bundle)
        assert "settings" in bundle

    def test_api_index_and_plate(self, client):
        res = client.get("/api")
        assert res.status_code == 200
        assert res.get_json()["name"].startswith("GCAL")
        assert client.get("/api/connectors").get_json()
        res = client.get("/")
        assert res.status_code == 200
        assert b"GCAL" in res.data
