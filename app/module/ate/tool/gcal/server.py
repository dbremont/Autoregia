"""
General Connector Abstraction Layer (GCAL) — server.

The connector manager of the Agent Toolbox Ecosystem (spec/gcal/spec.md):
a registry of connector definitions, the use-driven connection lifecycle
(disconnected → connected ⇄ error, with disconnect/reconnect as first-class
operations), and the execution gateway — every run gated on state, logged
as evidence, and health-tracked. The manager resolves ``connector_id →
handler`` and dispatches into ``connectors/``; per-system specifics
(connection models, setup forms, error mapping) live in the handlers
behind the uniform contract in ``base.py``.

Wave 1: six live connectors (http, rss, github, couchdb, files, smtp).
OAuth2 (gmail, drive, calendar) and notion arrive in later waves; their
endpoints already exist and answer 501 until then.

Three layers over one CouchDB database (``gcal``, typed documents):

- **Connections** — configured instances: settings + vaulted credentials,
  lifecycle state, health counters, usage stamps. Credentials are masked
  to presence flags at every API edge.
- **Executions** — the append-only evidence log of runs.
- **Audit + settings** — every mutation recorded (never pruned); persisted,
  editable defaults for timeouts, health policy, and retention.

Run (standalone):  python3 gcal/server.py
Mounted (unified): /ate/tool/gcal/  (via ../server.py TOOLS)
"""
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, request, send_from_directory

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(  # app/ — for support.storage
    os.path.dirname(os.path.dirname(os.path.dirname(_HERE)))))
sys.path.insert(0, _HERE)  # for `import base` / `import connectors`

from support.storage import Store  # noqa: E402
import base  # noqa: E402
import connectors  # noqa: E402

app = Flask(__name__, static_folder=os.path.join(_HERE, "static"))

SEED_PATH = os.path.join(_HERE, "data", "seed.json")
BOOTED_AT = time.time()

DISCONNECTED, AWAITING_CONSENT, CONNECTED, ERROR = (
    "disconnected", "awaiting_consent", "connected", "error")

store = Store("gcal", seed_paths=[SEED_PATH])
store.ensure_indexes([
    {"name": "idx-type", "fields": ["type"]},
    {"name": "idx-connections", "fields": ["type", "connector_id", "state"]},
    {"name": "idx-executions", "fields": ["type", "connection_id", "created_at"]},
    {"name": "idx-audit", "fields": ["type", "ts"]},
])

# Persisted, editable settings — consulted by the gateway. Anything not
# listed here is environment-derived and shown read-only in the UI.
DEFAULT_SETTINGS = {
    "default_timeout_s": 20,
    "max_consecutive_failures": 3,  # trips a connection into `error`
    "execution_retention": 500,     # max execution docs kept (0 = unlimited)
    "response_limit": 4096,         # max response body chars per execution
}
_SETTINGS_SPEC = {  # key: (python type, min, max)
    "default_timeout_s": (int, 1, 300),
    "max_consecutive_failures": (int, 1, 20),
    "execution_retention": (int, 0, 100_000),
    "response_limit": (int, 512, 100_000),
}


def _now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _new_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


# ── audit ────────────────────────────────────────────────────────────────────

def _audit(action, entity_type, entity_id, summary, details=None):
    """Append one audit record. Called on every mutation; never deleted."""
    store.put({
        "id": _new_id("AUD"),
        "type": "audit",
        "ts": _now(),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "actor": "operator",  # single-operator system; no auth layer yet
        "summary": summary,
        "details": details or {},
    })


# ── settings ─────────────────────────────────────────────────────────────────

def get_settings():
    """Effective settings: defaults overlaid with the persisted doc."""
    merged = dict(DEFAULT_SETTINGS)
    doc = store.get("settings") or {}
    for key in DEFAULT_SETTINGS:
        if key in doc:
            merged[key] = doc[key]
    return merged


def _validate_settings(body):
    """Returns (clean_settings, error)."""
    merged = get_settings()
    for key, (cast, lo, hi) in _SETTINGS_SPEC.items():
        if key not in body:
            continue
        try:
            val = cast(body[key])
        except (TypeError, ValueError):
            return None, f"{key} must be an integer"
        merged[key] = max(lo, min(val, hi))
    return merged, None


def _ensure_settings_doc():
    if not store.exists("settings"):
        store.put({"id": "settings", "type": "settings",
                   "created_at": _now(), **DEFAULT_SETTINGS})


# ── connections ──────────────────────────────────────────────────────────────

def _connection_or_none(connection_id):
    doc = store.get(connection_id) if connection_id else None
    if doc and doc.get("type") == "connection":
        return doc
    return None


def _masked(doc):
    """The connection as the API serves it: vaulted credentials reduced to
    presence flags — no secret ever crosses the edge."""
    view = dict(doc)
    view["credentials"] = base.mask(doc.get("credentials") or {})
    return view


def _usage(connection_id):
    """Usage projection over the execution log."""
    runs = store.find({"type": "execution", "connection_id": connection_id})
    runs.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)) \
        .isoformat().replace("+00:00", "Z")
    return {
        "executions_total": len(runs),
        "executions_24h": sum(1 for r in runs if r.get("created_at", "") >= cutoff),
        "last_used_at": runs[0]["created_at"] if runs else None,
        "recent": runs[:5],
    }


def _connection_detail(doc):
    view = _masked(doc)
    view.update(_usage(doc["id"]))
    return view


def _touch_health(doc, outcome_class, ok):
    """The use-driven health engine: successes clear, failures count, and
    the trip threshold comes from settings."""
    if ok:
        doc["consecutive_failures"] = 0
        if doc.get("state") == ERROR:
            doc["state"] = CONNECTED
    else:
        doc["consecutive_failures"] = int(doc.get("consecutive_failures") or 0) + 1
        if outcome_class == base.AUTH_FAILURE:
            doc["state"] = ERROR
        elif doc["consecutive_failures"] >= int(get_settings()["max_consecutive_failures"]):
            doc["state"] = ERROR
    doc["last_used_at"] = _now()
    doc["updated_at"] = doc["last_used_at"]


def _log_execution(connection, action_id, params, outcome, outcome_class,
                   result=None, error=None):
    doc = {
        "id": _new_id("EXE"),
        "type": "execution",
        "connection_id": connection["id"],
        "connector_id": connection["connector_id"],
        "action": action_id,
        "params": params or {},
        "status": "ok" if outcome_class == base.OK and outcome.get("ok", True) else "error",
        "class": outcome_class,
        "http_status": outcome.get("status"),
        "duration_ms": outcome.get("duration_ms"),
        "request": {"method": outcome.get("method"), "url": outcome.get("url")},
        "response": base.truncate_body(
            outcome.get("body") if isinstance(outcome.get("body"), str)
            else (json_dumps(outcome.get("body")) if outcome.get("body") is not None else ""),
            int(get_settings()["response_limit"])),
        "error": error,
        "result": result,
        "created_at": _now(),
    }
    store.put(doc)
    _prune_executions()
    return doc


def json_dumps(value):
    import json as _json
    try:
        return _json.dumps(value, default=str)[:100_000]
    except (TypeError, ValueError):
        return str(value)[:100_000]


def _prune_executions():
    """Enforce the execution-retention setting; returns the number pruned."""
    retention = int(get_settings().get("execution_retention") or 0)
    if retention <= 0:
        return 0
    runs = store.find({"type": "execution"})
    if len(runs) <= retention:
        return 0
    runs.sort(key=lambda r: r.get("created_at", ""))
    excess = runs[:len(runs) - retention]
    for r in excess:
        store.delete(r["id"])
    return len(excess)


def _execute_action(connection, action_id, params):
    """The execution gateway: gate on state, dispatch to the handler,
    classify, update health, log. Broken access answers 409 with the
    handler's reconnect hint — never a bare failure."""
    handler = connectors.get(connection["connector_id"])
    if not handler:
        return jsonify({"error": f"connector '{connection['connector_id']}' "
                                 "is not registered"}), 501
    if connection.get("state") != CONNECTED:
        hint = handler.reconnect_hint(connection)
        return jsonify({
            "error": f"connection '{connection['id']}' is {connection.get('state')} — "
                     "reconnect before running",
            "reconnect": hint,
        }), 409
    action = handler.action(action_id)
    if not action:
        return jsonify({"error": f"unknown action '{action_id}'"}), 400
    started = time.time()
    try:
        result = handler.execute(connection, action_id, params or {})
        outcome = {"ok": True, "duration_ms": int((time.time() - started) * 1000)}
        outcome_class = base.OK
        error = None
    except base.AdapterError as exc:
        outcome = {"ok": False, "status": exc.status,
                   "duration_ms": int((time.time() - started) * 1000)}
        outcome_class = exc.kind
        error = str(exc)
        result = None
    _touch_health(connection, outcome_class, outcome["ok"])
    store.put(connection)
    logged = _log_execution(connection, action_id, params or {}, outcome,
                            outcome_class, result=result, error=error)
    if outcome["ok"]:
        return jsonify({"ok": True, "execution_id": logged["id"],
                        "result": result,
                        "duration_ms": outcome["duration_ms"]}), 200
    status = 400 if outcome_class == base.BAD_PARAMS else 502
    return jsonify({"error": error, "class": outcome_class,
                    "execution_id": logged["id"]}), status


# ── API index ────────────────────────────────────────────────────────────────

_ensure_settings_doc()


@app.route("/api")
def api_index():
    return jsonify({
        "name": "GCAL — General Connector Abstraction Layer",
        "version": "0.1.0",
        "phase": "wave 1 — six live connectors, full lifecycle, gateway",
        "endpoints": {
            "connectors": "/api/connectors",
            "connections": "/api/connections",
            "connection": "/api/connections/<id>",
            "test": "POST /api/connections/<id>/test",
            "disconnect": "POST /api/connections/<id>/disconnect",
            "auth_start": "GET /api/connections/<id>/auth/start",
            "auth_callback": "GET /api/connections/<id>/auth/callback",
            "execute": "POST /api/execute",
            "executions": "/api/executions",
            "overview": "/api/overview",
            "audit": "/api/audit",
            "settings": "/api/settings",
            "self": "/api/self",
            "export": "/api/export",
        },
        "engine": {
            "auth_schemes": ["none", "bearer", "basic", "api_key", "oauth2"],
            "action_kinds": ["action", "search", "find_or_create"],
        },
    })


@app.route("/api/connectors", methods=["GET"])
def list_connectors():
    return jsonify(connectors.registry())


# ── connections ──────────────────────────────────────────────────────────────

def _connector_or_400(connector_id):
    handler = connectors.get(connector_id) if connector_id else None
    if not handler:
        return None, f"connector '{connector_id}' is not registered"
    return handler, None


@app.route("/api/connections", methods=["POST"])
def create_connection():
    """Connect: validate setup through the handler. Key/none schemes land
    `connected` at once; oauth2 lands `disconnected` until consent (wave 2)."""
    body = request.get_json(force=True, silent=True) or {}
    handler, err = _connector_or_400(body.get("connector_id"))
    if err:
        return jsonify({"error": err}), 400
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    try:
        settings, credentials = handler.connect(body.get("settings"),
                                                body.get("credentials"))
    except base.AdapterError as exc:
        return jsonify({"error": str(exc)}), 400
    now = _now()
    doc = {
        "id": _new_id("CON"),
        "type": "connection",
        "connector_id": handler.ID,
        "name": name,
        "settings": settings,
        "credentials": credentials,
        "state": CONNECTED if handler.AUTH_SCHEME != "oauth2" else DISCONNECTED,
        "consecutive_failures": 0,
        "last_used_at": None,
        "last_tested_at": None,
        "last_test": None,
        "last_connected_at": now,
        "created_at": now,
        "updated_at": now,
    }
    store.put(doc)
    _audit("connection.create", "connection", doc["id"],
           f"connection '{name}' → connector '{handler.ID}' ({doc['state']})",
           details={"connector_id": handler.ID, "state": doc["state"]})
    return jsonify(_connection_detail(doc)), 201


@app.route("/api/connections", methods=["GET"])
def list_connections():
    docs = store.find({"type": "connection"})
    connector_id = request.args.get("connector_id")
    state = request.args.get("state")
    if connector_id:
        docs = [d for d in docs if d.get("connector_id") == connector_id]
    if state:
        docs = [d for d in docs if d.get("state") == state]
    docs.sort(key=lambda d: d["id"])
    return jsonify([_masked(d) for d in docs])


@app.route("/api/connections/<connection_id>", methods=["GET"])
def get_connection(connection_id):
    doc = _connection_or_none(connection_id)
    if not doc:
        return jsonify({"error": "connection not found"}), 404
    return jsonify(_connection_detail(doc))


@app.route("/api/connections/<connection_id>", methods=["DELETE"])
def delete_connection(connection_id):
    """Hard remove: the connection doc and its vaulted credentials. The
    execution log is kept — past runs remain visible."""
    doc = _connection_or_none(connection_id)
    if not doc:
        return jsonify({"error": "connection not found"}), 404
    store.delete(connection_id)
    _audit("connection.delete", "connection", connection_id,
           f"connection '{doc.get('name')}' deleted (credentials purged)")
    return jsonify({"ok": True, "deleted": connection_id})


@app.route("/api/connections/<connection_id>/test", methods=["POST"])
def test_connection(connection_id):
    """Health check behind the Test button. Can trip `error`."""
    doc = _connection_or_none(connection_id)
    if not doc:
        return jsonify({"error": "connection not found"}), 404
    if doc.get("state") == DISCONNECTED:
        return jsonify({"error": "connection is disconnected — reconnect "
                                 "before testing"}), 409
    handler = connectors.get(doc["connector_id"])
    if not handler:
        return jsonify({"error": "connector is not registered"}), 501
    started = time.time()
    try:
        detail = handler.test(doc) or {}
        doc["last_test"] = {"result": "ok", "detail": detail}
        doc["consecutive_failures"] = 0
        if doc.get("state") == ERROR:
            doc["state"] = CONNECTED
        ok = True
        error = None
    except base.AdapterError as exc:
        doc["last_test"] = {"result": "error", "detail": str(exc)}
        doc["consecutive_failures"] = int(doc.get("consecutive_failures") or 0) + 1
        if exc.kind == base.AUTH_FAILURE or \
                doc["consecutive_failures"] >= int(get_settings()["max_consecutive_failures"]):
            doc["state"] = ERROR
        ok = False
        error = str(exc)
    doc["last_tested_at"] = _now()
    doc["updated_at"] = doc["last_tested_at"]
    store.put(doc)
    _audit("connection.test", "connection", connection_id,
           f"test {'ok' if ok else 'error'} on '{doc.get('name')}'",
           details={"ok": ok, "error": error})
    return jsonify(_connection_detail(doc))


@app.route("/api/connections/<connection_id>/disconnect", methods=["POST"])
def disconnect_connection(connection_id):
    """Disconnect: revoke provider-side best-effort, void the vaulted
    credentials, keep settings + history. Reconnect re-uses the settings."""
    doc = _connection_or_none(connection_id)
    if not doc:
        return jsonify({"error": "connection not found"}), 404
    if doc.get("state") == DISCONNECTED:
        return jsonify(_connection_detail(doc))
    handler = connectors.get(doc["connector_id"])
    revoked = False
    if handler:
        try:
            revoked = bool((handler.disconnect(doc) or {}).get("revoked"))
        except base.AdapterError:
            revoked = False
    doc["credentials"] = {}
    doc["state"] = DISCONNECTED
    doc["consecutive_failures"] = 0
    doc["updated_at"] = _now()
    store.put(doc)
    _audit("connection.disconnect", "connection", connection_id,
           f"connection '{doc.get('name')}' disconnected "
           f"({'revoked' if revoked else 'credentials voided locally'})",
           details={"revoked": revoked})
    return jsonify(_connection_detail(doc))


@app.route("/api/connections/<connection_id>/auth/start", methods=["GET"])
def auth_start(connection_id):
    doc = _connection_or_none(connection_id)
    if not doc:
        return jsonify({"error": "connection not found"}), 404
    handler = connectors.get(doc["connector_id"])
    if not handler or handler.AUTH_SCHEME != "oauth2":
        return jsonify({"error": "the oauth2 flow arrives with wave 2 — "
                                 "this connector does not use it"}), 501
    return jsonify({"error": "not implemented yet"}), 501


@app.route("/api/connections/<connection_id>/auth/callback", methods=["GET"])
def auth_callback(connection_id):
    return jsonify({"error": "not implemented yet — wave 2"}), 501


# ── executions ───────────────────────────────────────────────────────────────

@app.route("/api/execute", methods=["POST"])
def execute_action():
    body = request.get_json(force=True, silent=True) or {}
    connection = _connection_or_none(body.get("connection_id"))
    if not connection:
        return jsonify({"error": "connection not found"}), 404
    action_id = body.get("action")
    if not action_id:
        return jsonify({"error": "action is required"}), 400
    return _execute_action(connection, action_id, body.get("params"))


@app.route("/api/executions", methods=["GET"])
def list_executions():
    runs = store.find({"type": "execution"})
    connection_id = request.args.get("connection_id")
    status = request.args.get("status")
    q = request.args.get("q")
    if connection_id:
        runs = [r for r in runs if r.get("connection_id") == connection_id]
    if status:
        runs = [r for r in runs if r.get("status") == status]
    if q:
        needle = q.lower()
        runs = [r for r in runs
                if needle in (r.get("action") or "").lower()
                or needle in (r.get("error") or "").lower()
                or needle in r["id"].lower()]
    runs.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    try:
        offset = max(0, int(request.args.get("offset", 0)))
        limit = max(1, min(int(request.args.get("limit", 50)), 200))
    except ValueError:
        offset, limit = 0, 50
    return jsonify(runs[offset:offset + limit])


@app.route("/api/executions/<execution_id>", methods=["GET"])
def get_execution(execution_id):
    run = store.get(execution_id)
    if not run or run.get("type") != "execution":
        return jsonify({"error": "execution not found"}), 404
    return jsonify(run)


@app.route("/api/executions", methods=["DELETE"])
def clear_executions():
    deleted = 0
    for run in store.find({"type": "execution"}):
        if store.delete(run["id"]):
            deleted += 1
    _audit("executions.clear", "execution", "*",
           f"cleared the execution log ({deleted} docs)")
    return jsonify({"ok": True, "deleted": deleted})


# ── overview (the dashboard payload) ─────────────────────────────────────────

@app.route("/api/overview", methods=["GET"])
def overview():
    connections = store.find({"type": "connection"})
    by_state, by_connector = {}, {}
    for c in connections:
        by_state[c.get("state", "?")] = by_state.get(c.get("state", "?"), 0) + 1
        by_connector[c.get("connector_id", "?")] = \
            by_connector.get(c.get("connector_id", "?"), 0) + 1
    runs = store.find({"type": "execution"})
    by_status = {}
    for r in runs:
        by_status[r.get("status", "?")] = by_status.get(r.get("status", "?"), 0) + 1
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)) \
        .isoformat().replace("+00:00", "Z")
    last_24h = sum(1 for r in runs if r.get("created_at", "") >= cutoff)
    runs.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return jsonify({
        "generated_at": _now(),
        "connections": {"total": len(connections), "by_state": by_state,
                        "by_connector": by_connector},
        "executions": {"total": len(runs), "by_status": by_status,
                       "last_24h": last_24h},
        "registry": [{"id": r["id"], "status": r["status"],
                      "auth_scheme": r["auth_scheme"]}
                     for r in connectors.registry()],
        "recent": runs[:8],
    })


# ── audit ────────────────────────────────────────────────────────────────────

@app.route("/api/audit", methods=["GET"])
def list_audit():
    action = request.args.get("action")
    entity_type = request.args.get("entity_type")
    entity_id = request.args.get("entity_id")
    entries = store.find({"type": "audit"})
    if action:
        entries = [e for e in entries if e.get("action") == action]
    if entity_type:
        entries = [e for e in entries if e.get("entity_type") == entity_type]
    if entity_id:
        entries = [e for e in entries if e.get("entity_id") == entity_id]
    entries.sort(key=lambda e: e.get("ts", ""), reverse=True)
    return jsonify(entries[:300])


# ── settings ─────────────────────────────────────────────────────────────────

@app.route("/api/settings", methods=["GET"])
def read_settings():
    settings = get_settings()
    return jsonify({
        "settings": settings,
        "environment": {
            "couchdb_url": os.environ.get("COUCHDB_URL",
                                          "http://localhost:5984"),
            "db": store.db_name,
            "connectors": [{"id": r["id"], "status": r["status"],
                            "auth_scheme": r["auth_scheme"]}
                           for r in connectors.registry()],
        },
    })


@app.route("/api/settings", methods=["PUT"])
def write_settings():
    body = request.get_json(force=True, silent=True) or {}
    clean, err = _validate_settings(body)
    if err:
        return jsonify({"error": err}), 400
    current = store.get("settings") or {}
    doc = {"id": "settings", "type": "settings",
           "created_at": current.get("created_at") or _now(),
           "updated_at": _now(), **clean}
    store.put(doc)
    changed = {k: {"from": current.get(k, DEFAULT_SETTINGS[k]), "to": clean[k]}
               for k in clean
               if current.get(k, DEFAULT_SETTINGS[k]) != clean[k]}
    if changed:
        _audit("settings.update", "settings", "settings",
               "updated " + ", ".join(sorted(changed)),
               details={"changes": changed})
    return jsonify(doc)


# ── self monitoring ──────────────────────────────────────────────────────────

@app.route("/api/self", methods=["GET"])
def self_monitor():
    connections = store.find({"type": "connection"})
    by_state = {}
    for c in connections:
        by_state[c.get("state", "?")] = by_state.get(c.get("state", "?"), 0) + 1
    runs = store.find({"type": "execution"})
    by_status = {}
    for r in runs:
        by_status[r.get("status", "?")] = by_status.get(r.get("status", "?"), 0) + 1
    durations = [r.get("duration_ms") for r in runs
                 if r.get("duration_ms") is not None]
    avg_ms = int(sum(durations) / len(durations)) if durations else None
    type_counts = {}
    for t in ("connection", "execution", "audit", "settings"):
        type_counts[t] = len(store.find({"type": t}))
    return jsonify({
        "generated_at": _now(),
        "uptime_s": int(time.time() - BOOTED_AT),
        "store": {"db": store.db_name, "docs": type_counts},
        "connections": {"total": len(connections), "by_state": by_state},
        "executions": {"total": len(runs), "by_status": by_status,
                       "avg_duration_ms": avg_ms},
        "engine": {"connectors": [{"id": r["id"], "status": r["status"],
                                   "actions": len(r["actions"])}
                                  for r in connectors.registry()]},
        "settings": get_settings(),
    })


# ── export ───────────────────────────────────────────────────────────────────

@app.route("/api/export", methods=["GET"])
def export_data():
    return jsonify({
        "exported_at": _now(),
        "connectors": connectors.registry(),
        "connections": [_masked(c) for c in store.find({"type": "connection"})],
        "settings": get_settings(),
        "executions": store.find({"type": "execution"})[:500],
        "audit": store.find({"type": "audit"})[:500],
    })


# ── plate ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    port = int(os.environ.get("GCAL_PORT", "5017"))
    print("GCAL — General Connector Abstraction Layer (wave 1)")
    print(f"   connectors: {', '.join(sorted(connectors.HANDLERS))}")
    print(f"   Open: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
