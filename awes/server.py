"""
Automated Work Execution System (AWES) — Prototype Server.

Flask backend implementing the AWES components:
  [E] Environment Manager  — /api/environments (CRUD, registry)
  [T] Task Runner          — /api/execute (dispatch, monitor, capture)
  [A] Artifact Capture     — /api/sessions (history, output, artifacts)

Work units are executed via subprocess with timeout enforcement. The session
store is in-memory (prototype only). No container isolation — single-user local
use only.

Conforms to spec/awes/spec.md.

Run:   python3 awes/server.py
Open:  http://localhost:5010
"""
import json
import logging
import os
import sys
import uuid
import subprocess
import shlex
import threading
import urllib.request
import urllib.error
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_from_directory

logging.basicConfig(level=logging.INFO, format="[AWES] %(levelname)s %(message)s")
logger = logging.getLogger("awes")

app = Flask(__name__, static_folder="static")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Result Feed — target URLs for sibling sub-systems (empty = disabled)
PWOS_URL = os.environ.get("AWES_PWOS_URL", "http://localhost:5005").rstrip("/")
PRS_URL = os.environ.get("AWES_PRS_URL", "http://localhost:5000").rstrip("/")

def _load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []

def _ts():
    return datetime.now(timezone.utc).isoformat()

def _new_id(prefix="EXE"):
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

environments = {}
sessions = {}

def _seed_environments():
    for env in _load_json("mock_environments.json"):
        environments[env["env_id"]] = env

_seed_environments()


# ── [R] Result Feed — push execution results into PWOS + PRS ──────────────

def _post_json(url, body):
    """Fire-and-forget POST of a JSON body to *url*."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data,
                                 headers={"Content-Type": "application/json"},
                                 method="POST")
    try:
        urllib.request.urlopen(req, timeout=5)
        logger.info("posted to %s", url)
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        logger.warning("could not reach %s: %s", url, e)


def _feed_result(session):
    """Feed an execution result to PWOS (work session) and PRS (durable trace).

    Runs in a background thread so the execute endpoint is not delayed.
    """
    sid = session["session_id"]
    aid = session.get("action_id")
    desc = f"AWES: {session['payload'][:80]}"
    domain = "Execution"

    # 1. PWOS — create a work session (manual entry)
    if PWOS_URL:
        pwos_body = {
            "action_id": aid or "",
            "description": desc,
            "started_at": session["started_at"],
            "ended_at": session["ended_at"],
            "status": session["status"],
            "source": "awes",
        }
        _post_json(f"{PWOS_URL}/api/sessions", pwos_body)

    # 2. PRS — create a durable record
    if PRS_URL:
        status_map = {"completed": "Completed", "failed": "Failed",
                      "timed_out": "Failed"}
        prs_body = {
            "record_type": "Observation",
            "state_class": "External World",
            "content": f"AWES execution {sid}: {session['payload'][:120]}",
            "detail": (
                f"Status: {session['status']}  |  "
                f"Exit code: {session['exit_code']}  |  "
                f"Duration: {session['duration_ms']}ms  |  "
                f"Environment: {session.get('env_id', '?')}"
            ),
            "status": status_map.get(session["status"], "Completed"),
            "domain": domain,
            "tags": ["awes", "execution", session["work_type"]],
            "links": [{"target": sid, "type": "references"}],
        }
        if aid:
            prs_body["links"].append({"target": aid, "type": "implements"})
        _post_json(f"{PRS_URL}/api/records", prs_body)


def _feed_async(session):
    t = threading.Thread(target=_feed_result, args=(session,), daemon=True)
    t.start()


@app.route("/api/environments", methods=["GET"])
def list_environments():
    return jsonify(list(environments.values()))

@app.route("/api/environments/<env_id>", methods=["GET"])
def get_environment(env_id):
    env = environments.get(env_id)
    if not env:
        return jsonify({"error": "environment not found"}), 404
    return jsonify(env)

@app.route("/api/environments", methods=["POST"])
def register_environment():
    body = request.get_json(force=True)
    env_id = body.get("env_id", _new_id("ENV"))
    environments[env_id] = {
        "env_id": env_id,
        "name": body.get("name", "Unnamed"),
        "env_type": body.get("env_type", "shell"),
        "status": "ready",
        "runtime": body.get("runtime", ""),
        "capabilities": body.get("capabilities", []),
        "config": body.get("config", {}),
        "created_at": _ts(),
    }
    return jsonify(environments[env_id]), 201

@app.route("/api/execute", methods=["POST"])
def execute():
    body = request.get_json(force=True)
    payload = body.get("payload", "").strip()
    if not payload:
        return jsonify({"error": "payload is required"}), 400

    work_type = body.get("work_type", "command")
    env_id = body.get("env_id", "ENV-SHELL-001")
    timeout_s = body.get("timeout_s", 60)
    action_id = body.get("action_id")

    env = environments.get(env_id)
    if not env:
        return jsonify({"error": f"environment '{env_id}' not found"}), 400
    if env.get("status") == "busy":
        return jsonify({"error": "environment is busy"}), 409

    session_id = _new_id("EXE")
    started_at = _ts()
    env["status"] = "busy"

    try:
        if work_type == "python":
            result = subprocess.run(
                [sys.executable, "-c", payload],
                capture_output=True, text=True, timeout=timeout_s
            )
        else:
            result = subprocess.run(
                payload, shell=True,
                capture_output=True, text=True, timeout=timeout_s
            )

        ended_at = _ts()
        duration_ms = int((datetime.fromisoformat(ended_at) -
                           datetime.fromisoformat(started_at)).total_seconds() * 1000)

        session = {
            "session_id": session_id,
            "action_id": action_id,
            "env_id": env_id,
            "work_type": work_type,
            "payload": payload,
            "status": "completed" if result.returncode == 0 else "failed",
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "started_at": started_at,
            "ended_at": ended_at,
            "duration_ms": duration_ms,
            "artifacts": [],
        }
    except subprocess.TimeoutExpired:
        session = {
            "session_id": session_id,
            "action_id": action_id,
            "env_id": env_id,
            "work_type": work_type,
            "payload": payload,
            "status": "timed_out",
            "exit_code": None,
            "stdout": "",
            "stderr": f"Timed out after {timeout_s}s",
            "started_at": started_at,
            "ended_at": _ts(),
            "duration_ms": timeout_s * 1000,
            "artifacts": [],
        }
    except Exception as e:
        session = {
            "session_id": session_id,
            "action_id": action_id,
            "env_id": env_id,
            "work_type": work_type,
            "payload": payload,
            "status": "failed",
            "exit_code": -1,
            "stdout": "",
            "stderr": str(e),
            "started_at": started_at,
            "ended_at": _ts(),
            "duration_ms": 0,
            "artifacts": [],
        }

    env["status"] = "ready"
    sessions[session_id] = session
    _feed_async(session)
    return jsonify(session), 201

@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    env_id = request.args.get("env_id")
    status = request.args.get("status")
    result = list(sessions.values())
    if env_id:
        result = [s for s in result if s["env_id"] == env_id]
    if status:
        result = [s for s in result if s["status"] == status]
    result.sort(key=lambda s: s.get("started_at", ""), reverse=True)
    return jsonify(result)

@app.route("/api/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    session = sessions.get(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404
    return jsonify(session)

@app.route("/api/sessions", methods=["DELETE"])
def clear_sessions():
    sessions.clear()
    return jsonify({"ok": True})

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api")
def api_index():
    return jsonify({
        "name": "AWES — Automated Work Execution System",
        "version": "0.1.0",
        "endpoints": {
            "environments": "/api/environments",
            "execute": "/api/execute",
            "sessions": "/api/sessions",
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("AWES_PORT", 5010))
    print(f"AWES running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
