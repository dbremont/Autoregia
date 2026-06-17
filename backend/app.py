"""Flask application for the Personal Recording System (PRS).

Exposes a JSON REST API over SQLite-backed record storage and serves the
static frontend from ``../static``.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from flask import Flask, jsonify, request

import db
from prsl import to_prsl

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")


# --------------------------------------------------------------------------- #
# Startup
# --------------------------------------------------------------------------- #

@app.before_request
def _ensure_db() -> None:
    """Create the schema on first request if the DB file is missing."""
    if not os.path.exists(db.DB_PATH):
        db.init_db()


# --------------------------------------------------------------------------- #
# Static routes
# --------------------------------------------------------------------------- #

@app.route("/")
def index():
    return app.send_static_file("index.html")


# --------------------------------------------------------------------------- #
# API: Records
# --------------------------------------------------------------------------- #

@app.get("/api/records")
def list_records():
    """List records with optional filtering.

    Query params:
        filter  -- active | blocked | risks | decisions | completed | all
        domain  -- domain tag value
        q       -- free-text search across content/detail
    """
    filt = request.args.get("filter", "all")
    domain = request.args.get("domain")
    q = request.args.get("q", "").strip().lower()

    with db.get_connection() as conn:
        records = db.get_all_records(conn)

    def matches(r: dict) -> bool:
        op = r.get("operationalMetadata", {})
        gm = r.get("generalMetadata", {})
        if filt == "active" and op.get("executionState") != "active":
            return False
        if filt == "blocked" and op.get("executionState") != "blocked":
            return False
        if filt == "completed" and op.get("executionState") != "completed":
            return False
        if filt == "risks" and "risk" not in gm.get("operationalCategory", ""):
            return False
        if filt == "decisions" and "decision" not in gm.get("operationalCategory", ""):
            return False
        if domain and gm.get("domain") != domain:
            return False
        if q:
            blob = (r.get("content", "") + " " + r.get("detail", "")).lower()
            if q not in blob:
                return False
        return True

    return jsonify([r for r in records if matches(r)])


@app.get("/api/records/<record_id>")
def get_one(record_id: str):
    with db.get_connection() as conn:
        rec = db.get_record(conn, record_id)
    if rec is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(rec)


@app.post("/api/records")
def create():
    payload = request.get_json(force=True, silent=True)
    if not payload or "content" not in payload:
        return jsonify({"error": "content is required"}), 400

    with db.get_connection() as conn:
        if not payload.get("id"):
            payload["id"] = db.get_next_id(conn)
        _normalize(payload, new=True)
        rec = db.insert_record(conn, payload)
    return jsonify(rec), 201


@app.put("/api/records/<record_id>")
def update(record_id: str):
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"error": "empty body"}), 400

    with db.get_connection() as conn:
        existing = db.get_record(conn, record_id)
        if existing is None:
            return jsonify({"error": "not found"}), 404
        existing.update(payload)
        existing["id"] = record_id
        _normalize(existing, new=False)
        rec = db.update_record(conn, record_id, existing)
    return jsonify(rec)


@app.delete("/api/records/<record_id>")
def delete(record_id: str):
    with db.get_connection() as conn:
        ok = db.delete_record(conn, record_id)
    if not ok:
        return jsonify({"error": "not found"}), 404
    return jsonify({"deleted": record_id})


# --------------------------------------------------------------------------- #
# API: Aggregate views
# --------------------------------------------------------------------------- #

@app.get("/api/stats")
def stats():
    with db.get_connection() as conn:
        return jsonify(db.get_stats(conn))


@app.get("/api/graph")
def graph():
    with db.get_connection() as conn:
        records = db.get_all_records(conn)
        links = db.get_all_relations(conn)
    return jsonify({"nodes": [{"id": r["id"]} for r in records], "links": links})


@app.get("/api/timeline")
def timeline():
    with db.get_connection() as conn:
        records = db.get_all_records(conn)
    future = [r for r in records if r.get("temporalMetadata", {}).get("deadline")]
    future.sort(
        key=lambda r: r["temporalMetadata"]["deadline"]
    )
    return jsonify(future)


@app.get("/api/meta")
def meta():
    """Return controlled vocabularies for form dropdowns."""
    return jsonify(
        {
            "domains": DOMAINS,
            "relationTypes": RELATION_TYPES,
            "executionStates": EXECUTION_STATES,
            "priorities": PRIORITIES,
            "validationStates": VALIDATION_STATES,
            "lifecycleStates": LIFECYCLE_STATES,
            "orientations": ORIENTATIONS,
            "retentionPolicies": RETENTION_POLICIES,
            "tags": TAGS,
            "classifications": CLASSIFICATIONS,
            "cognitiveCategories": COGNITIVE_CATEGORIES,
            "operationalCategories": OPERATIONAL_CATEGORIES,
        }
    )


@app.get("/api/records/<record_id>/prsl")
def export_prsl(record_id: str):
    with db.get_connection() as conn:
        rec = db.get_record(conn, record_id)
    if rec is None:
        return jsonify({"error": "not found"}), 404
    return jsonify({"id": record_id, "prsl": to_prsl(rec)})


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _normalize(record: dict, new: bool) -> None:
    """Fill in default metadata sections for a record being created/updated."""
    now = _now()
    if "temporalMetadata" not in record:
        record["temporalMetadata"] = {}
    tm = record["temporalMetadata"]
    if new or not tm.get("createdAt"):
        tm["createdAt"] = now
    tm["updatedAt"] = now

    record.setdefault("contextualMetadata", {})
    record.setdefault("epistemicMetadata", {})
    record.setdefault("operationalMetadata", {})
    record.setdefault("lifecycleMetadata", {})
    record.setdefault("relationalMetadata", [])
    record.setdefault("generalMetadata", {})

    lm = record["lifecycleMetadata"]
    if new:
        lm.setdefault("state", "created")
        lm.setdefault("revision", 1)
    else:
        lm["revision"] = int(lm.get("revision", 1)) + 1

    if "retentionPolicy" not in record:
        record["retentionPolicy"] = "permanent"
    if "detail" not in record:
        record["detail"] = ""


# --------------------------------------------------------------------------- #
# Vocabularies (from design/README.md)
# --------------------------------------------------------------------------- #

DOMAINS = [
    "physical-health",
    "cognitive-development",
    "administration",
    "house-management",
    "domestic-infrastructure",
    "technical-work",
    "business-development",
    "finance",
    "organizational-development",
    "infrastructure",
    "planning",
    "knowledge-management",
]

RELATION_TYPES = [
    "references", "related-to", "derived-from", "supersedes", "duplicates",
    "contains", "part-of", "extends", "version-of", "precedes", "follows",
    "simultaneous-with", "recurs-from", "scheduled-after", "historically-caused",
    "causes", "contributes-to", "mitigates", "escalates", "resolves",
    "enables", "inhibits", "blocks", "depends-on", "required-by",
    "assigned-to", "coordinates-with", "implements", "tracks", "spawned-from",
    "supports", "contradicts", "validates", "questions", "corroborates",
    "hypothesizes-about", "based-on", "governed-by", "violates", "audits",
    "authorizes", "constrained-by", "aligned-with", "advances", "threatens",
    "opportunistically-enables", "degrades", "strengthens", "signals",
    "predicts", "indicates-drift", "clusters-with", "root-cause-of",
    "communicated-to", "requested-by", "approved-by", "collaborates-with",
    "affects", "documents", "evidenced-by", "visualizes", "summarizes",
    "explains", "indexes",
]

EXECUTION_STATES = ["pending", "active", "blocked", "delegated", "completed"]
PRIORITIES = ["critical", "high", "medium", "low"]
VALIDATION_STATES = ["confirmed", "speculative", "inferred", "disputed"]
LIFECYCLE_STATES = [
    "created", "revised", "deprecated", "archived", "invalidated", "superseded",
]
ORIENTATIONS = ["retrospective", "present", "prospective", "scheduled"]
RETENTION_POLICIES = [
    "permanent", "temporary", "archive-on-completion", "review-periodic",
]

TAGS = [
    # Record Type
    "event", "commitment", "decision", "reflection", "state", "signal",
    "risk", "policy", "artifact", "consultation", "interaction", "task", "project",
    # Temporal
    "immediate", "short-term", "mid-term", "long-term", "historical",
    "recurring", "deferred", "scheduled",
    # Operational Status
    "active", "blocked", "completed", "failed", "suspended", "cancelled",
    "pending-review", "archived",
    # Priority
    "critical", "high-priority", "routine", "low-priority", "strategic", "maintenance",
    # Epistemic
    "hypothesis", "confirmed", "uncertain", "speculative", "observed",
    "inferred", "assumption",
    # Cognitive Processing
    "capture-only", "deep-work", "requires-reflection", "research-later",
    "decision-needed", "context-heavy", "interruptible", "non-interruptible",
    # Energy & Effort
    "low-energy", "high-energy", "attention-intensive", "administrative-overhead",
    "cognitively-expensive",
    # Risk
    "burnout-risk", "financial-risk", "coordination-risk", "security-risk",
    "technical-debt", "operational-fragility", "single-point-of-failure",
    # Intelligence
    "emerging-pattern", "opportunity", "anomaly", "drift", "systemic-issue",
]

CLASSIFICATIONS = ["Public", "Internal", "Confidential", "Personal", "Secret"]

COGNITIVE_CATEGORIES = [
    "Temporal Projection Structures", "Meta-Cognitive State", "Operational State",
    "Identity-Continuity Structures", "Knowledge Structures", "Decision Structures",
    "Constraint Structures", "Relationship Structures",
    "Environmental Monitoring Structures", "Intentional Structures",
    "Memory-Audit Structures", "Coordination Structures", "Risk Structures",
    "Resource Structures",
]

OPERATIONAL_CATEGORIES = [
    "event", "commitment", "decision", "reflection", "state", "signal",
    "risk", "policy", "artifact", "consultation", "interaction", "task",
    "project",
]


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    db.init_db()
    app.run(debug=True, port=5000)