"""
Computation Task Execution System (CTES) — server.

Phase 2 — the application shell (spec/ctes/spec.md). Three layers over one
CouchDB database (``ctes``, typed documents):

- **Handles** — the register of self-contained Python packages under
  ``packages/<id>/`` (``manifest.json`` + code, entry ``module:function``).
  Full lifecycle: register, update, activate/inactivate, manual delete
  (purges doc + code; run history is kept), read-only code/file viewing.
- **Task specs** — registered intents that reference a handler directly:
  objective, payload template, expected output, constraints, dependencies.
  Emitting a spec resolves its handler and dispatches synchronously.
- **Runs** — the journal of executions: input, result, log, exit code,
  timing, backend, plus a sha256 snapshot of the code that ran and the
  originating task spec. Settings (persisted, editable) govern defaults;
  audit documents record every mutation.

Execution is synchronous through the uniform ``runner.py`` shim in a
self-contained environment: a disposable network-less docker container, or
a subprocess fallback. Queues, schedulers, and workers remain future work.

Run (standalone):  python3 ctes/server.py
Mounted (unified): /ate/tool/ctes/  (via ../../server.py TOOLS)
"""
import hashlib
import json
import os
import re
import shutil
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, request, send_from_directory

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(  # app/ — for support.storage
    os.path.dirname(os.path.dirname(os.path.dirname(_HERE)))))
sys.path.insert(0, _HERE)  # for `import backends` under any loader

from support.storage import Store  # noqa: E402
import backends  # noqa: E402

app = Flask(__name__, static_folder=os.path.join(_HERE, "static"))

PACKAGES_DIR = os.path.join(_HERE, "packages")
SEED_PATH = os.path.join(_HERE, "data", "seed.json")
TIMEOUT_MAX_S = 600
FILE_VIEW_LIMIT = 200_000        # max chars served by the code viewer
BOOTED_AT = time.time()

store = Store("ctes", seed_paths=[SEED_PATH])
store.ensure_indexes([
    {"name": "idx-type", "fields": ["type"]},
    {"name": "idx-runs", "fields": ["type", "handle_id", "started_at"]},
    {"name": "idx-specs", "fields": ["type", "handler_id"]},
    {"name": "idx-audit", "fields": ["type", "ts"]},
])

_ID_RE = re.compile(r"^[a-z][a-z0-9-]{1,31}$")
_ENTRY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_.]*:[A-Za-z_][A-Za-z0-9_]*$")
MANIFEST = "manifest.json"
HANDLE_STATUSES = ("active", "inactive")
PRIORITIES = ("low", "normal", "high")

SKELETON_MAIN = '''"""{hid} — CTES handle.

Contract: run(payload: dict) -> JSON-serializable dict.
"""


def run(payload):
    return {{"ok": True, "payload": payload}}
'''

# Persisted, editable settings — consulted by the run path. Anything not
# listed here is environment-derived and shown read-only in the UI.
DEFAULT_SETTINGS = {
    "default_timeout_s": 60,
    "default_backend": "auto",     # auto | docker | subprocess
    "log_limit": 20_000,           # max stdout/stderr chars per run doc
    "run_retention": 500,          # max run docs kept (0 = unlimited)
    "allow_network": False,        # default network policy for new handles
}
_SETTINGS_SPEC = {  # key: (python type, min, max)
    "default_timeout_s": (int, 1, TIMEOUT_MAX_S),
    "log_limit": (int, 1_000, 200_000),
    "run_retention": (int, 0, 100_000),
}


def _now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _new_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _trunc(text, limit):
    text = text or ""
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n… truncated ({len(text)} chars total)"


def _pkg_dir(handle_id):
    return os.path.join(PACKAGES_DIR, handle_id)


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
    if "default_backend" in body:
        if body["default_backend"] not in ("auto", "docker", "subprocess"):
            return None, "default_backend must be auto|docker|subprocess"
        merged["default_backend"] = body["default_backend"]
    if "allow_network" in body:
        merged["allow_network"] = bool(body["allow_network"])
    return merged, None


def _ensure_settings_doc():
    if not store.exists("settings"):
        store.put({"id": "settings", "type": "settings",
                   "created_at": _now(), **DEFAULT_SETTINGS})


# ── the register: manifest helpers ───────────────────────────────────────────

def _manifest_doc(manifest):
    """Validate a manifest dict; returns (doc, error)."""
    hid = manifest.get("id") or ""
    entry = manifest.get("entry_point") or ""
    if not _ID_RE.match(hid):
        return None, f"invalid handle id {hid!r} (lowercase letters, digits, '-')"
    if not _ENTRY_RE.match(entry):
        return None, f"invalid entry_point {entry!r} (expected 'module:function')"
    try:
        timeout_s = int(manifest.get("timeout_s") or 60)
    except (TypeError, ValueError):
        return None, "timeout_s must be an integer"
    doc = {
        "id": hid,
        "type": "handle",
        "name": manifest.get("name") or hid,
        "description": manifest.get("description") or "",
        "entry_point": entry,
        "image": manifest.get("image"),
        "network": bool(manifest.get("network", False)),
        "timeout_s": max(1, min(timeout_s, TIMEOUT_MAX_S)),
        "status": manifest.get("status") or "active",
        "code_path": f"packages/{hid}",
    }
    return doc, None


def _write_manifest(doc):
    pkg = _pkg_dir(doc["id"])
    os.makedirs(pkg, exist_ok=True)
    manifest = {k: doc.get(k) for k in
                ("id", "name", "description", "entry_point",
                 "image", "network", "timeout_s")}
    with open(os.path.join(pkg, MANIFEST), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")


def scan_packages():
    """Upsert a register doc for every packages/<id>/manifest.json."""
    scanned = []
    if not os.path.isdir(PACKAGES_DIR):
        return scanned
    for entry in sorted(os.listdir(PACKAGES_DIR)):
        manifest_path = os.path.join(PACKAGES_DIR, entry, MANIFEST)
        if not os.path.isfile(manifest_path):
            continue
        try:
            with open(manifest_path, encoding="utf-8") as fh:
                manifest = json.load(fh)
        except ValueError:
            continue
        doc, err = _manifest_doc(manifest)
        if err:
            continue
        existing = store.get(doc["id"])
        if existing:
            doc["created_at"] = existing.get("created_at") or _now()
            doc["status"] = existing.get("status") or doc["status"]
        else:
            doc["created_at"] = _now()
        doc["updated_at"] = _now()
        store.put(doc)
        scanned.append(doc["id"])
    return scanned


def _handle_or_none(handle_id):
    doc = store.get(handle_id) if handle_id else None
    if doc and doc.get("type") == "handle":
        return doc
    return None


def _handle_files(handle_id):
    """List the code files of a handle package (relative paths)."""
    root = _pkg_dir(handle_id)
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            files.append(os.path.relpath(full, root))
    return sorted(files)


def _code_snapshot(handle_id):
    """sha256 over the package's file names + contents (run provenance)."""
    root = _pkg_dir(handle_id)
    h = hashlib.sha256()
    files = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            h.update(os.path.relpath(full, root).encode("utf-8"))
            with open(full, "rb") as fh:
                h.update(fh.read())
            files += 1
    return h.hexdigest(), files


def _handle_stats(handle_id):
    runs = store.find({"type": "run", "handle_id": handle_id})
    by_status = {}
    last = None
    for r in runs:
        by_status[r.get("status", "?")] = by_status.get(r.get("status", "?"), 0) + 1
        if last is None or r.get("started_at", "") > last.get("started_at", ""):
            last = r
    return {
        "total": len(runs),
        "by_status": by_status,
        "last_run": {"id": last["id"], "status": last.get("status"),
                     "started_at": last.get("started_at")} if last else None,
    }


# ── runs helpers ─────────────────────────────────────────────────────────────

def _run_doc(handle, payload, outcome, timeout_s, started_at, spec=None):
    code_sha, code_files = _code_snapshot(handle["id"])
    doc = {
        "id": _new_id("RUN"),
        "type": "run",
        "handle_id": handle["id"],
        "handle_name": handle.get("name"),
        "entry_point": handle["entry_point"],
        "handle_status": handle.get("status"),
        "backend": outcome["backend"],
        "image": handle.get("image") if outcome["backend"] == "docker" else None,
        "status": outcome["status"],
        "input": payload,
        "result": outcome["result"],
        "error": outcome["error"],
        "exit_code": outcome["exit_code"],
        "stdout": _trunc(outcome["stdout"], get_settings()["log_limit"]),
        "stderr": _trunc(outcome["stderr"], get_settings()["log_limit"]),
        "timeout_s": timeout_s,
        "code_sha256": code_sha,
        "code_files": code_files,
        "started_at": started_at,
        "ended_at": _now(),
        "duration_ms": outcome["duration_ms"],
    }
    if spec:
        doc["task_spec_id"] = spec["id"]
        doc["spec"] = {"objective": spec.get("objective"),
                       "expected_output": spec.get("expected_output"),
                       "priority": spec.get("priority")}
    return doc


def _prune_runs():
    """Enforce the run-retention setting; returns the number pruned."""
    retention = int(get_settings().get("run_retention") or 0)
    if retention <= 0:
        return 0
    runs = store.find({"type": "run"})
    if len(runs) <= retention:
        return 0
    runs.sort(key=lambda r: r.get("started_at", ""))
    excess = runs[:len(runs) - retention]
    for r in excess:
        store.delete(r["id"])
    return len(excess)


def _filter_runs(runs, handle_id=None, status=None, q=None, since_ms=None):
    if handle_id:
        runs = [r for r in runs if r.get("handle_id") == handle_id]
    if status:
        runs = [r for r in runs if r.get("status") == status]
    if since_ms:
        try:
            cutoff = datetime.fromtimestamp(
                int(since_ms) / 1000, tz=timezone.utc).isoformat()
            runs = [r for r in runs if r.get("started_at", "") >= cutoff]
        except (TypeError, ValueError, OSError, OverflowError):
            pass
    if q:
        needle = q.lower()
        runs = [r for r in runs if needle in json.dumps(
            {k: r.get(k) for k in ("input", "result", "error", "handle_id",
                                   "task_spec_id", "spec")},
            default=str).lower()]
    return runs


# ── API index ────────────────────────────────────────────────────────────────

scan_packages()      # pick up hand-written packages/<id>/manifest.json
_ensure_settings_doc()


@app.route("/api")
def api_index():
    return jsonify({
        "name": "CTES — Computation Task Execution System",
        "version": "0.2.0",
        "phase": "app shell — register, task specs, runs, audit, settings",
        "endpoints": {
            "handles": "/api/handles",
            "handle_status": "POST /api/handles/<id>/status",
            "handle_files": "GET /api/handles/<id>/files/<path>",
            "handle_runs": "GET /api/handles/<id>/runs",
            "scan": "POST /api/handles/scan",
            "tasks": "/api/tasks",
            "task_emit": "POST /api/tasks/<id>/emit",
            "runs": "/api/runs",
            "audit": "/api/audit",
            "settings": "/api/settings",
            "self": "/api/self",
            "export": "/api/export",
        },
        "backends": backends.backend_info(),
    })


# ── the register: handles ────────────────────────────────────────────────────

@app.route("/api/handles", methods=["GET"])
def list_handles():
    handles = [d for d in store.find({"type": "handle"})]
    handles.sort(key=lambda h: (h.get("status") != "active", h["id"]))
    for h in handles:
        h["code_on_disk"] = os.path.isdir(_pkg_dir(h["id"]))
        h["stats"] = _handle_stats(h["id"])
    return jsonify(handles)


@app.route("/api/handles/<handle_id>", methods=["GET"])
def get_handle(handle_id):
    handle = _handle_or_none(handle_id)
    if not handle:
        return jsonify({"error": "handle not found"}), 404
    handle["files"] = _handle_files(handle_id)
    handle["code_on_disk"] = os.path.isdir(_pkg_dir(handle_id))
    handle["stats"] = _handle_stats(handle_id)
    return jsonify(handle)


@app.route("/api/handles", methods=["POST"])
def register_handle():
    body = request.get_json(force=True, silent=True) or {}
    settings = get_settings()
    doc, err = _manifest_doc({
        "id": body.get("id"),
        "name": body.get("name"),
        "description": body.get("description"),
        "entry_point": body.get("entry_point"),
        "image": body.get("image"),
        "network": settings["allow_network"] if body.get("network") is None
                   else body.get("network"),
        "timeout_s": body.get("timeout_s", settings["default_timeout_s"]),
    })
    if err:
        return jsonify({"error": err}), 400
    if store.exists(doc["id"]):
        return jsonify({"error": f"handle '{doc['id']}' already registered"}), 409

    _write_manifest(doc)
    main_py = os.path.join(_pkg_dir(doc["id"]), "main.py")
    if not os.path.exists(main_py):
        with open(main_py, "w", encoding="utf-8") as fh:
            fh.write(SKELETON_MAIN.format(hid=doc["id"]))
    doc["created_at"] = _now()
    doc["updated_at"] = doc["created_at"]
    store.put(doc)
    _audit("handle.register", "handle", doc["id"],
           f"registered handle '{doc['id']}' ({doc['entry_point']})")
    return jsonify(doc), 201


@app.route("/api/handles/<handle_id>", methods=["PUT"])
def update_handle(handle_id):
    handle = _handle_or_none(handle_id)
    if not handle:
        return jsonify({"error": "handle not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    changes = {}
    for field in ("name", "description", "image"):
        if field in body and body[field] != handle.get(field):
            changes[field] = body[field]
    if "entry_point" in body and body["entry_point"] != handle["entry_point"]:
        if not _ENTRY_RE.match(body["entry_point"] or ""):
            return jsonify({"error": "invalid entry_point"}), 400
        changes["entry_point"] = body["entry_point"]
    if "timeout_s" in body:
        try:
            t = max(1, min(int(body["timeout_s"]), TIMEOUT_MAX_S))
        except (TypeError, ValueError):
            return jsonify({"error": "timeout_s must be an integer"}), 400
        if t != handle.get("timeout_s"):
            changes["timeout_s"] = t
    if "network" in body and bool(body["network"]) != handle.get("network"):
        changes["network"] = bool(body["network"])
    if not changes:
        return jsonify(handle)

    handle.update(changes)
    handle["updated_at"] = _now()
    store.put(handle)
    _write_manifest(handle)
    _audit("handle.update", "handle", handle_id,
           "updated " + ", ".join(sorted(changes)), details={"changes": changes})
    return jsonify(handle)


@app.route("/api/handles/<handle_id>/status", methods=["POST"])
def set_handle_status(handle_id):
    handle = _handle_or_none(handle_id)
    if not handle:
        return jsonify({"error": "handle not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    status = body.get("status")
    if status not in HANDLE_STATUSES:
        return jsonify({"error": "status must be active|inactive"}), 400
    if status != handle.get("status"):
        handle["status"] = status
        handle["updated_at"] = _now()
        store.put(handle)
        _audit(f"handle.{status if status == 'active' else 'inactivate'}",
               "handle", handle_id, f"handle '{handle_id}' is now {status}")
    return jsonify(handle)


@app.route("/api/handles/<handle_id>", methods=["DELETE"])
def delete_handle(handle_id):
    """Manual full delete: register doc + code directory. Run history and
    audit are kept — deleted handles remain visible in past runs."""
    handle = _handle_or_none(handle_id)
    if not handle:
        return jsonify({"error": "handle not found"}), 404
    pkg = _pkg_dir(handle_id)
    files = _handle_files(handle_id) if os.path.isdir(pkg) else []
    if os.path.isdir(pkg):
        shutil.rmtree(pkg)
    store.delete(handle_id)
    _audit("handle.delete", "handle", handle_id,
           f"deleted handle '{handle_id}' ({len(files)} files purged)",
           details={"entry_point": handle["entry_point"], "files": len(files)})
    return jsonify({"ok": True, "deleted": handle_id, "files_purged": len(files)})


@app.route("/api/handles/scan", methods=["POST"])
def scan_handles():
    scanned = scan_packages()
    _audit("handle.scan", "handle", "*",
           f"scanned packages/ — {len(scanned)} handle(s) upserted",
           details={"handles": scanned})
    return jsonify({"ok": True, "handles": scanned})


@app.route("/api/handles/<handle_id>/runs", methods=["GET"])
def handle_runs(handle_id):
    if not _handle_or_none(handle_id):
        return jsonify({"error": "handle not found"}), 404
    runs = _filter_runs(store.find({"type": "run"}), handle_id=handle_id,
                        status=request.args.get("status"))
    runs.sort(key=lambda r: r.get("started_at", ""), reverse=True)
    return jsonify(runs[:200])


@app.route("/api/handles/<handle_id>/files/<path:rel>", methods=["GET"])
def get_handle_file(handle_id, rel):
    """Read-only code viewer — path-contained inside the package dir."""
    if not _handle_or_none(handle_id):
        return jsonify({"error": "handle not found"}), 404
    root = os.path.realpath(_pkg_dir(handle_id))
    target = os.path.realpath(os.path.join(root, rel))
    if target != root and not target.startswith(root + os.sep):
        return jsonify({"error": "path escapes the package"}), 403
    if not os.path.isfile(target):
        return jsonify({"error": "file not found"}), 404
    with open(target, encoding="utf-8", errors="replace") as fh:
        content = fh.read(FILE_VIEW_LIMIT + 1)
    return jsonify({
        "path": rel,
        "truncated": len(content) > FILE_VIEW_LIMIT,
        "content": content[:FILE_VIEW_LIMIT],
    })


# ── task specs ───────────────────────────────────────────────────────────────

def _spec_doc(body, existing=None):
    objective = (body.get("objective") if existing is None
                 else body.get("objective", existing.get("objective")))
    handler_id = (body.get("handler_id") if existing is None
                  else body.get("handler_id", existing.get("handler_id")))
    if not objective or not str(objective).strip():
        return None, "objective is required"
    if not handler_id:
        return None, "handler_id is required (a task spec references a handle directly)"
    payload = body.get("payload", (existing or {}).get("payload") or {})
    if not isinstance(payload, dict):
        return None, "payload must be a JSON object"
    raw_timeout = (body.get("constraints") or {}).get(
        "timeout_s",
        (existing or {}).get("constraints", {}).get("timeout_s"))
    timeout_s = None
    if raw_timeout is not None:
        try:
            timeout_s = max(1, min(int(raw_timeout), TIMEOUT_MAX_S))
        except (TypeError, ValueError):
            return None, "constraints.timeout_s must be an integer"
    deps = body.get("dependencies", (existing or {}).get("dependencies") or [])
    if not isinstance(deps, list):
        return None, "dependencies must be a list of task-spec ids"
    mode = body.get("temporal_mode", (existing or {}).get("temporal_mode") or "sync")
    if mode not in ("sync", "async"):
        return None, "temporal_mode must be sync|async"
    priority = body.get("priority", (existing or {}).get("priority") or "normal")
    if priority not in PRIORITIES:
        return None, f"priority must be one of {PRIORITIES}"
    doc = {
        "id": (existing or {}).get("id") or _new_id("TASK"),
        "type": "task_spec",
        "objective": str(objective).strip(),
        "handler_id": handler_id,
        "payload": payload,
        "expected_output": body.get("expected_output",
                                    (existing or {}).get("expected_output") or ""),
        "priority": priority,
        "constraints": {
            "timeout_s": timeout_s,
            "deadline_s": (body.get("constraints") or {}).get("deadline_s",
                           (existing or {}).get("constraints", {}).get("deadline_s")),
        },
        "dependencies": deps,
        "temporal_mode": mode,
        "status": (existing or {}).get("status") or "active",
        "created_at": (existing or {}).get("created_at") or _now(),
        "updated_at": _now(),
    }
    return doc, None


@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    specs = store.find({"type": "task_spec"})
    specs.sort(key=lambda s: s["id"])
    return jsonify(specs)


@app.route("/api/tasks/<spec_id>", methods=["GET"])
def get_task(spec_id):
    spec = store.get(spec_id)
    if not spec or spec.get("type") != "task_spec":
        return jsonify({"error": "task spec not found"}), 404
    spec["handler"] = store.get(spec["handler_id"])
    spec["runs"] = _filter_runs(store.find({"type": "run"}),
                                q=spec_id)[:20]
    return jsonify(spec)


@app.route("/api/tasks", methods=["POST"])
def create_task():
    body = request.get_json(force=True, silent=True) or {}
    doc, err = _spec_doc(body)
    if err:
        return jsonify({"error": err}), 400
    if not _handle_or_none(doc["handler_id"]):
        return jsonify({"error": f"handler '{doc['handler_id']}' is not registered"}), 400
    store.put(doc)
    _audit("spec.create", "task_spec", doc["id"],
           f"task spec '{doc['id']}' → handler '{doc['handler_id']}'")
    return jsonify(doc), 201


@app.route("/api/tasks/<spec_id>", methods=["PUT"])
def update_task(spec_id):
    spec = store.get(spec_id)
    if not spec or spec.get("type") != "task_spec":
        return jsonify({"error": "task spec not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    doc, err = _spec_doc(body, existing=spec)
    if err:
        return jsonify({"error": err}), 400
    if not _handle_or_none(doc["handler_id"]):
        return jsonify({"error": f"handler '{doc['handler_id']}' is not registered"}), 400
    store.put(doc)
    _audit("spec.update", "task_spec", spec_id,
           f"task spec '{spec_id}' updated")
    return jsonify(doc)


@app.route("/api/tasks/<spec_id>", methods=["DELETE"])
def delete_task(spec_id):
    spec = store.get(spec_id)
    if not spec or spec.get("type") != "task_spec":
        return jsonify({"error": "task spec not found"}), 404
    store.delete(spec_id)
    _audit("spec.delete", "task_spec", spec_id,
           f"task spec '{spec_id}' deleted")
    return jsonify({"ok": True, "deleted": spec_id})


@app.route("/api/tasks/<spec_id>/emit", methods=["POST"])
def emit_task(spec_id):
    """Resolve a task spec to its handler and dispatch synchronously."""
    spec = store.get(spec_id)
    if not spec or spec.get("type") != "task_spec":
        return jsonify({"error": "task spec not found"}), 404
    if spec.get("temporal_mode") == "async":
        return jsonify({"error": "async dispatch is not implemented yet — "
                                 "queues are a future phase"}), 501
    body = request.get_json(force=True, silent=True) or {}
    payload = dict(spec.get("payload") or {})
    override = body.get("payload") or {}
    if not isinstance(override, dict):
        return jsonify({"error": "payload override must be a JSON object"}), 400
    payload.update(override)
    resp = _execute_run(spec=spec, payload=payload)
    if resp[1] == 201:
        run = resp[0].get_json()
        _audit("spec.emit", "task_spec", spec_id,
               f"emitted spec '{spec_id}' → run {run['id']} ({run['status']})",
               details={"run_id": run["id"], "status": run["status"]})
    return resp


# ── runs ─────────────────────────────────────────────────────────────────────

def _execute_run(spec=None, payload=None, direct=None, backend=None,
                 timeout_s=None):
    """Shared dispatch. ``spec`` (task spec) or ``direct`` (handle id)."""
    if spec:
        handle_id = spec["handler_id"]
    else:
        handle_id = direct
    handle = _handle_or_none(handle_id)
    if not handle:
        return jsonify({"error": "handle not found"}), 404
    if handle.get("status", "active") != "active":
        return jsonify({"error": f"handle '{handle_id}' is inactive — "
                                 "activate it before running"}), 409
    pkg = _pkg_dir(handle_id)
    if not os.path.isdir(pkg):
        return jsonify({"error": f"handle code missing on disk ({handle['code_path']})"}), 409

    settings = get_settings()
    try:
        timeout_s = int(timeout_s or (spec or {}).get("constraints", {}).get("timeout_s")
                        or handle.get("timeout_s") or settings["default_timeout_s"])
    except (TypeError, ValueError):
        return jsonify({"error": "timeout_s must be an integer"}), 400
    timeout_s = max(1, min(timeout_s, TIMEOUT_MAX_S))

    if payload is not None and not isinstance(payload, (dict, list)):
        return jsonify({"error": "input must be a JSON object or array"}), 400

    started_at = _now()
    outcome = backends.execute(
        pkg, handle["entry_point"], payload, timeout_s,
        image=handle.get("image"), network=handle.get("network", False),
        backend=backend or settings["default_backend"], run_id=handle_id)
    run = _run_doc(handle, payload, outcome, timeout_s, started_at, spec=spec)
    store.put(run)
    _prune_runs()
    return jsonify(run), 201


@app.route("/api/runs", methods=["POST"])
def create_run():
    body = request.get_json(force=True, silent=True) or {}
    return _execute_run(
        direct=body.get("handle_id"), payload=body.get("input", {}),
        backend=body.get("backend"), timeout_s=body.get("timeout_s"))


@app.route("/api/runs", methods=["GET"])
def list_runs():
    runs = _filter_runs(
        store.find({"type": "run"}),
        handle_id=request.args.get("handle_id"),
        status=request.args.get("status"),
        q=request.args.get("q"),
        since_ms=request.args.get("since_ms"))
    runs.sort(key=lambda r: r.get("started_at", ""), reverse=True)
    try:
        offset = max(0, int(request.args.get("offset", 0)))
        limit = max(1, min(int(request.args.get("limit", 200)), 200))
    except ValueError:
        offset, limit = 0, 200
    return jsonify(runs[offset:offset + limit])


@app.route("/api/runs/<run_id>", methods=["GET"])
def get_run(run_id):
    run = store.get(run_id)
    if not run or run.get("type") != "run":
        return jsonify({"error": "run not found"}), 404
    return jsonify(run)


@app.route("/api/runs", methods=["DELETE"])
def clear_runs():
    deleted = 0
    for run in store.find({"type": "run"}):
        if store.delete(run["id"]):
            deleted += 1
    _audit("runs.clear", "run", "*", f"cleared run history ({deleted} docs)")
    return jsonify({"ok": True, "deleted": deleted})


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
    info = backends.backend_info()
    return jsonify({
        "settings": get_settings(),
        "environment": {
            "docker_image": info["docker_image"],
            "docker_image_ready": info["docker_image_ready"],
            "docker_cli": info["docker_cli"],
            "docker_mem": backends.DOCKER_MEM,
            "docker_cpus": backends.DOCKER_CPUS,
            "couchdb_url": os.environ.get("COUCHDB_URL", "http://localhost:5984"),
            "db": store.db_name,
            "packages_dir": os.path.relpath(PACKAGES_DIR, _HERE),
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
               "updated " + ", ".join(sorted(changed)), details={"changes": changed})
    return jsonify(doc)


# ── self monitoring ──────────────────────────────────────────────────────────

@app.route("/api/self", methods=["GET"])
def self_monitor():
    docs = store.find({"type": "handle"})
    active = [d for d in docs if d.get("status") == "active"]
    code_missing = [d for d in docs if not os.path.isdir(_pkg_dir(d["id"]))]
    runs = store.find({"type": "run"})
    by_status = {}
    for r in runs:
        by_status[r.get("status", "?")] = by_status.get(r.get("status", "?"), 0) + 1
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat().replace("+00:00", "Z")
    recent = [r for r in runs if r.get("started_at", "") >= cutoff]
    recent_ok = [r for r in recent if r.get("status") == "completed"]
    failures = [r for r in runs if r.get("status") in ("failed", "timed_out")]
    failures.sort(key=lambda r: r.get("started_at", ""), reverse=True)
    last_fail = failures[0] if failures else None
    disk = 0
    for dirpath, _, filenames in os.walk(PACKAGES_DIR):
        for fn in filenames:
            try:
                disk += os.path.getsize(os.path.join(dirpath, fn))
            except OSError:
                pass
    type_counts = {}
    for t in ("handle", "task_spec", "run", "audit", "settings"):
        type_counts[t] = len(store.find({"type": t}))
    return jsonify({
        "generated_at": _now(),
        "uptime_s": int(time.time() - BOOTED_AT),
        "store": {"db": store.db_name, "docs": type_counts},
        "register": {"handles": len(docs), "active": len(active),
                     "inactive": len(docs) - len(active),
                     "code_missing": len(code_missing),
                     "code_missing_ids": [d["id"] for d in code_missing]},
        "task_specs": type_counts.get("task_spec", 0),
        "runs": {"total": len(runs), "by_status": by_status,
                 "last_24h": len(recent),
                 "success_rate_24h": round(len(recent_ok) / len(recent), 3)
                                     if recent else None,
                 "last_failure": ({k: last_fail.get(k) for k in
                                   ("id", "handle_id", "status", "error",
                                    "started_at")} if last_fail else None)},
        "backends": backends.backend_info(),
        "packages": {"handles_on_disk": len(os.listdir(PACKAGES_DIR))
                     if os.path.isdir(PACKAGES_DIR) else 0,
                     "disk_bytes": disk},
        "settings": get_settings(),
    })


# ── export ───────────────────────────────────────────────────────────────────

@app.route("/api/export", methods=["GET"])
def export_data():
    return jsonify({
        "exported_at": _now(),
        "handles": store.find({"type": "handle"}),
        "task_specs": store.find({"type": "task_spec"}),
        "settings": get_settings(),
        "runs": store.find({"type": "run"})[:500],
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
    port = int(os.environ.get("CTES_PORT", "5015"))
    print("CTES — Computation Task Execution System (app shell)")
    info = backends.backend_info()
    print(f"   backend: {info['default']} (docker cli: {info['docker_cli']})")
    print(f"   Open: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
