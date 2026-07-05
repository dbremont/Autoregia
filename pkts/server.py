"""
Personal Keyword Tracking System (PKTS) — API Server.

Flask backend serving keystroke telemetry. Raw events are accepted at
``/api/ingest`` (written to CouchDB db ``pkts_raw``), asynchronously processed
by an RQ worker (:mod:`pkts.jobs`) into the schema defined in
``spec/pkts/schema.json``, and served back to the web client from CouchDB db
``pkts``. Telemetry is captured by :mod:`pkts.collector`.

This app is mounted under the ``/pkts/`` prefix by the unified dispatcher
(``app.py``); the web client's assets and API calls are prefix-relative. Run
via the dispatcher (not standalone) so the ``/pkts/`` routes resolve.

Run:   python3 app.py                 (unified dispatcher, port 8080)
       python3 pkts/worker.py         (RQ worker — second terminal)
       python3 pkts/collector.py      (keystroke collector — third terminal)
Open:  http://localhost:8080/pkts/
"""
import json
import os
import sys
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory, Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store, StoreError
from pkts.jobs import process_pending
from pkts.tasks import enqueue

app = Flask(__name__, static_folder="static")

_raw_store = None
_proc_store = None


def raw_store():
    global _raw_store
    if _raw_store is None:
        _raw_store = Store("pkts_raw")
    return _raw_store


def proc_store():
    global _proc_store
    if _proc_store is None:
        _proc_store = Store("pkts")
    return _proc_store


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _derive_sessions(events):
    by_sid = {}
    for ev in events:
        by_sid.setdefault(ev.get("session_id"), []).append(ev)
    sessions = []
    for sid, arr in by_sid.items():
        arr.sort(key=lambda e: e.get("timing", {}).get("event_time_ms", 0))
        sessions.append({
            "session_id": sid,
            "start": arr[0].get("timestamp_utc"),
            "event_count": len(arr),
            "task_type": arr[0].get("context", {}).get("task_type", "other"),
        })
    sessions.sort(key=lambda s: s.get("start") or "")
    return sessions


def _events_source():
    """Return ``(events, sessions, generated_at)`` from the processed bucket."""
    docs = proc_store().all()
    events = [d for d in docs if d.get("doc_type") == "event"]
    return events, _derive_sessions(events), now_iso()


@app.route("/api/ingest", methods=["POST"])
def ingest():
    """Accept a batch of raw keylog events from a collector.

    Payload shape::

        {
          "source":  {"platform": "x11", "capture_scope": "application_local", ...},
          "device":  {"device_id": "...", "hostname": "...", "os": {...},
                      "keyboard_id": "...", "layout": "us",
                      "application_name": "Code", "timezone": "Europe/Brussels", ...},
          "environment": {"cpu_load_percent": 23.4, ...},
          "events": [
            {"key": "a", "key_code": "KeyA", "event_type": "key_down",
             "modifiers": [], "hw_time_ms": 1750000000123},
            {"key": "a", "key_code": "KeyA", "event_type": "key_up",
             "modifiers": [], "hw_time_ms": 1750000000230},
            ...
          ]
        }

    Returns ``202 Accepted`` with the stored ``batch_id``; processing happens
    asynchronously on the ``pkts`` RQ queue. Redis outage does not lose data —
    the batch is persisted first and re-processed on the next successful
    enqueue (the worker drains every unprocessed batch, not just the notified
    one).
    """
    data = request.get_json(silent=True) or {}
    events = data.get("events")
    if not isinstance(events, list) or not events:
        return jsonify({"error": "body must contain a non-empty events[] array"}), 400

    batch = {
        "id": "BATCH-{}-{}".format(now_iso().replace(":", "").replace("-", ""), uuid.uuid4().hex[:6]),
        "doc_type": "batch",
        "received_at": now_iso(),
        "processed": False,
        "source_info": data.get("source", {}) or {},
        "device_info": data.get("device", {}) or {},
        "environment": data.get("environment", {}) or {},
        "events": events,
    }
    try:
        raw_store().put(batch)
    except StoreError as exc:
        return jsonify({"error": "CouchDB unavailable", "detail": str(exc)}), 503

    enqueue(process_pending)
    return jsonify({"accepted": len(events), "batch_id": batch["id"]}), 202


@app.route("/api/keystrokes", methods=["GET"])
def get_keystrokes():
    events, sessions, generated_at = _events_source()
    session = request.args.get("session")
    if session:
        events = [e for e in events if e.get("session_id") == session]
    return jsonify({"generated_at": generated_at,
                    "sessions": sessions, "events": events})


@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    _events, sessions, _gen = _events_source()
    return jsonify(sessions)


@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    events, sessions, _gen = _events_source()
    dwells = [e["timing"]["hold_time_ms"] for e in events
              if e.get("timing", {}).get("hold_time_ms") is not None]
    mean_dwell = sum(dwells) / len(dwells) if dwells else 0
    return jsonify({
        "total_keystrokes": len(events),
        "session_count": len(sessions),
        "mean_dwell_ms": round(mean_dwell, 1),
        "sessions": [{"session_id": s["session_id"], "event_count": s["event_count"]} for s in sessions],
    })


@app.route("/api/jobs/status", methods=["GET"])
def jobs_status():
    """Return raw/processed document counts so the collector/UI can observe backlog."""
    try:
        raw_docs = raw_store().all()
        proc_count = proc_store().count()
        batches = [d for d in raw_docs if d.get("doc_type") == "batch"]
        return jsonify({
            "raw_batches": len(batches),
            "pending_batches": sum(1 for b in batches if not b.get("processed")),
            "processed_events": proc_count,
        })
    except StoreError as exc:
        return jsonify({"error": "CouchDB unavailable", "detail": str(exc)}), 503


@app.route("/api/export", methods=["GET"])
def export_data():
    events, sessions, generated_at = _events_source()
    payload = {"generated_at": generated_at, "sessions": sessions, "events": events}
    return Response(json.dumps(payload, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=pkts_export.json"})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
