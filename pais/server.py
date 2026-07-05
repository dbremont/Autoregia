"""
Personal Application Interaction System (PAIS) — API Server.

Flask backend serving mouse + focus telemetry. Raw events are accepted at
``/api/ingest`` (written to CouchDB db ``pais_raw``), asynchronously processed
by an RQ worker (:mod:`pais.jobs`) into the schema defined in
``spec/pais/schema.json``, and served back to the web client from CouchDB db
``pais``. Telemetry is captured by :mod:`pais.collector`.

This app is mounted under the ``/pais/`` prefix by the unified dispatcher
(``app.py``); run via the dispatcher so the ``/pais/`` routes resolve.

Run:   python3 app.py                 (unified dispatcher, port 8080)
       python3 pais/worker.py         (RQ worker — second terminal)
       python3 pais/collector.py      (interaction collector — third terminal)
Open:  http://localhost:8080/pais/
"""
import json
import os
import sys
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory, Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store, StoreError
from pais.jobs import process_pending
from pais.tasks import enqueue
from pais.analytics import compute_analytics

app = Flask(__name__, static_folder="static")

_raw_store = None
_proc_store = None


def raw_store():
    global _raw_store
    if _raw_store is None:
        _raw_store = Store("pais_raw")
    return _raw_store


def proc_store():
    global _proc_store
    if _proc_store is None:
        _proc_store = Store("pais")
    return _proc_store


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _events_source():
    """Return ``(events, generated_at)`` from the processed bucket."""
    docs = proc_store().all()
    events = [d for d in docs if d.get("doc_type") == "event"]
    return events, now_iso()


@app.route("/api/ingest", methods=["POST"])
def ingest():
    """Accept a batch of raw interaction events from the collector.

    Returns ``202 Accepted`` with the stored ``batch_id``; processing runs off
    the request path on the ``pais`` RQ queue. Redis outage never loses data —
    the batch is persisted to CouchDB first and re-processed on the next
    successful enqueue.
    """
    data = request.get_json(silent=True) or {}
    events = data.get("events")
    if not isinstance(events, list) or not events:
        return jsonify({"error": "body must contain a non-empty events[] array"}), 400

    batch = {
        "id": "PBATCH-{}-{}".format(now_iso().replace(":", "").replace("-", ""), uuid.uuid4().hex[:6]),
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


@app.route("/api/events", methods=["GET"])
def get_events():
    events, generated_at = _events_source()
    kind = request.args.get("kind")
    if kind in ("mouse", "focus"):
        events = [e for e in events if e.get("doc_kind") == kind]
    session = request.args.get("session")
    if session:
        events = [e for e in events if e.get("session_id") == session]
    return jsonify({"generated_at": generated_at, "events": events})


@app.route("/api/jobs/status", methods=["GET"])
def jobs_status():
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


@app.route("/api/analytics", methods=["GET"])
def analytics():
    """App-interaction analytics — the join of PAIS mouse/focus + PKTS keystrokes.

    Optional query params: ``from`` / ``to`` (ISO 8601 bounds), ``app`` (filter
    to one application).
    """
    try:
        return jsonify(compute_analytics(
            since=request.args.get("from"),
            until=request.args.get("to"),
            app=request.args.get("app"),
        ))
    except StoreError as exc:
        return jsonify({"error": "Storage unavailable", "detail": str(exc)}), 503


@app.route("/api/export", methods=["GET"])
def export_data():
    events, generated_at = _events_source()
    payload = {"generated_at": generated_at, "events": events}
    return Response(json.dumps(payload, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=pais_export.json"})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
