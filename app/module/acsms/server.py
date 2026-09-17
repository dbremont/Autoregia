"""Agent Capability Self Management System (ACSMS) — API Server.

A substrate sub-system that manages the deliberate growth of the agent's own
capabilities (see spec/acsms/README.md). Two document kinds live in the same
CouchDB store (db ``acsms``), discriminated by ``doc_type``:

* ``skill``    — a capability definition: name, description, tags, lifecycle
                 ``status`` (active | paused | retired) and a practice
                 cadence target (``target_per_week``).
* ``practice`` — one self-reported practice session. Reports are validated
                 against the catalog: you cannot self-report practice on a
                 skill that does not exist (or has been retired).

The inverse gap — a skill that never receives practice, or whose practice
went stale — is tracked automatically: every skill carries a computed
``practice_state`` (``never-practiced`` | ``on-track`` | ``neglected``,
or the lifecycle ``paused``/``retired``) derived from its practice history
and cadence target. The dashboard surfaces active skills in the two
attention states, closing the loop back to the Review/Cull stages of the
improvement lifecycle.

Mounted under ``/acsms/`` by the unified dispatcher (``app.py``).

Run:   python3 app.py                    (unified dispatcher, port 8080/8081)
Open:  http://localhost:8081/acsms/
"""
import os
import re
import sys
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from support.storage import Store, StoreError  # noqa: E402

app = Flask(__name__, static_folder="static")


@app.after_request
def _no_cache_api(resp):
    # Match the static-file policy: API responses carry no validators, so
    # browsers may heuristically cache GETs and serve stale JSON.
    if "/api/" in request.path:
        resp.headers.setdefault("Cache-Control", "no-cache")
    return resp


SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "skills.json")
PATHS_SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "paths.json")
store = Store("acsms", seed_paths=[SEED_PATH, PATHS_SEED_PATH])

STATUSES = ("active", "paused", "retired")
PATH_STATUSES = ("active", "archived")
WEEK_MS = 7 * 86_400_000
NOW_GRACE_MS = 5 * 60_000  # tolerate minor clock skew on reported dates
CHANGELOG_CAP = 100        # embedded per-skill change entries kept


def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ── validation helpers ───────────────────────────────────────────────────────
def _err(msg: str, code: int = 400):
    return jsonify({"error": msg}), code


def _clean_str(v, cap: int) -> str:
    return str(v).strip()[:cap]


def _clean_tags(v) -> list[str]:
    if not isinstance(v, list):
        return []
    out = []
    for t in v:
        s = _clean_str(t, 24)
        if s and s.lower() not in [o.lower() for o in out]:
            out.append(s)
    return out[:12]


def _clean_int(v, lo, hi):
    """Coerce to int within [lo, hi]; None passes through; None on garbage."""
    if v is None or v == "":
        return None
    try:
        n = int(v)
    except (TypeError, ValueError):
        return None
    if n < lo or n > hi:
        return None
    return n


def _clean_cadence(v):
    """target_per_week: a positive number (0.25–70)."""
    if v is None or v == "":
        return 1.0
    try:
        f = round(float(v), 2)
    except (TypeError, ValueError):
        return None
    if f <= 0 or f > 70:
        return None
    return f


def _clean_domain(v) -> str:
    d = _clean_str(v or "", 40)
    return d or "General"


def _log_change(doc: dict, event: str, changes: list | None = None) -> None:
    """Append one changelog entry to a skill (embedded, capped)."""
    doc.setdefault("changes", []).append(
        {"at_ms": now_ms(), "event": event, "changes": changes or []})
    del doc["changes"][:-CHANGELOG_CAP]


# ── skill ids ────────────────────────────────────────────────────────────────
def _slug_id(prefix: str, name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "item"
    sid = f"{prefix}-{slug}"
    if store.exists(sid):
        sid = f"{prefix}-{slug}-{uuid.uuid4().hex[:4]}"
    return sid


def _skill_id(name: str) -> str:
    return _slug_id("SKILL", name)


def _path_id(name: str) -> str:
    return _slug_id("PATH", name)


# ── the tracking layer: practice history → per-skill state ──────────────────
def _practices_by_skill() -> dict[str, list[dict]]:
    by: dict[str, list[dict]] = {}
    for d in store.all():
        if d.get("doc_type") == "practice" and d.get("skill_id"):
            by.setdefault(d["skill_id"], []).append(d)
    return by


def _practice_state(skill: dict, count: int, last_ms, now: int) -> str:
    """Computed tracking state of a skill (see module docstring).

    ``neglected`` means the last practice is older than twice the target
    cadence interval (a skill targeting 1×/week goes stale after 14 days).
    """
    status = skill.get("status") or "active"
    if status == "retired":
        return "retired"
    if status == "paused":
        return "paused"
    if not count:
        return "never-practiced"
    target = skill.get("target_per_week") or 1
    try:
        target = float(target) or 1.0
    except (TypeError, ValueError):
        target = 1.0
    if now - (last_ms or 0) > 2 * (WEEK_MS / target):
        return "neglected"
    return "on-track"


def _join_skill(skill: dict, by_skill: dict[str, list[dict]], now: int) -> dict:
    practices = by_skill.get(skill["id"], [])
    count = len(practices)
    last = max((p.get("practiced_at_ms") or 0) for p in practices) if practices else None
    out = dict(skill)
    out["practice_count"] = count
    out["last_practiced_ms"] = last
    out["practice_state"] = _practice_state(skill, count, last, now)
    return out


def _skills_joined() -> list[dict]:
    now = now_ms()
    by_skill = _practices_by_skill()
    return [_join_skill(d, by_skill, now) for d in store.all()
            if d.get("doc_type") == "skill"]


# ── health ───────────────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    try:
        docs = store.all()
        return jsonify({
            "ok": True,
            "db": store.db_name,
            "docs": store.count(),
            "skills": sum(1 for d in docs if d.get("doc_type") == "skill"),
            "practices": sum(1 for d in docs if d.get("doc_type") == "practice"),
        })
    except StoreError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503


# ── skills: the catalog ──────────────────────────────────────────────────────
@app.route("/api/skills", methods=["GET"])
def get_skills():
    skills = _skills_joined()
    status = request.args.get("status")
    if status:
        skills = [s for s in skills if (s.get("status") or "active") == status]
    state = request.args.get("state")
    if state:
        skills = [s for s in skills if s.get("practice_state") == state]
    skills.sort(key=lambda s: s.get("name", "").lower())
    return jsonify(skills)


@app.route("/api/skills", methods=["POST"])
def create_skill():
    data = request.get_json(silent=True) or {}
    name = _clean_str(data.get("name") or "", 120)
    if not name:
        return _err("name is required")
    status = data.get("status") or "active"
    if status not in STATUSES:
        return _err(f"status must be one of {STATUSES}")
    cadence = _clean_cadence(data.get("target_per_week"))
    if cadence is None:
        return _err("target_per_week must be a number between 0.25 and 70")
    level = _clean_int(data.get("level"), 0, 5)
    if data.get("level") not in (None, "") and level is None:
        return _err("level must be an integer 0–5")
    doc = {
        "id": _skill_id(name),
        "doc_type": "skill",
        "name": name,
        "description": _clean_str(data.get("description") or "", 2000),
        "tags": _clean_tags(data.get("tags")),
        "domain": _clean_domain(data.get("domain")),
        "status": status,
        "target_per_week": cadence,
        "level": level if level is not None else 0,
        "created_at_ms": now_ms(),
        "updated_at_ms": now_ms(),
    }
    _log_change(doc, "created")
    store.put(doc)
    return jsonify(doc), 201


@app.route("/api/skills/<skill_id>", methods=["GET"])
def get_skill(skill_id):
    by_skill = _practices_by_skill()
    doc = store.get(skill_id)
    if not doc or doc.get("doc_type") != "skill":
        return _err("skill not found", 404)
    return jsonify(_join_skill(doc, by_skill, now_ms()))


TRACKED_SKILL_FIELDS = ("name", "description", "tags", "domain", "level",
                        "status", "target_per_week")
_STATUS_EVENTS = {"active": "activated", "paused": "paused", "retired": "retired"}


@app.route("/api/skills/<skill_id>", methods=["PUT"])
def update_skill(skill_id):
    doc = store.get(skill_id)
    if not doc or doc.get("doc_type") != "skill":
        return _err("skill not found", 404)
    data = request.get_json(silent=True) or {}

    # Resolve + validate the desired next state before touching the doc.
    next_ = dict(doc)
    if "name" in data:
        name = _clean_str(data.get("name") or "", 120)
        if not name:
            return _err("name cannot be empty")
        next_["name"] = name
    if "description" in data:
        next_["description"] = _clean_str(data.get("description") or "", 2000)
    if "tags" in data:
        next_["tags"] = _clean_tags(data.get("tags"))
    if "domain" in data:
        next_["domain"] = _clean_domain(data.get("domain"))
    if "level" in data:
        level = _clean_int(data.get("level"), 0, 5)
        if data.get("level") not in (None, "") and level is None:
            return _err("level must be an integer 0–5")
        if level is not None:
            next_["level"] = level
    if "status" in data:
        if data["status"] not in STATUSES:
            return _err(f"status must be one of {STATUSES}")
        next_["status"] = data["status"]
    if "target_per_week" in data:
        cadence = _clean_cadence(data.get("target_per_week"))
        if cadence is None:
            return _err("target_per_week must be a number between 0.25 and 70")
        next_["target_per_week"] = cadence

    # One changelog entry per update: field-level from→to diffs; a status
    # change names the entry after the lifecycle event.
    diffs = [{"field": f, "from": doc.get(f), "to": next_.get(f)}
             for f in TRACKED_SKILL_FIELDS if doc.get(f) != next_.get(f)]
    old_name = doc.get("name")
    doc.update(next_)
    if diffs:
        event = _STATUS_EVENTS.get(next_["status"], "updated") \
            if any(d["field"] == "status" for d in diffs) else "updated"
        _log_change(doc, event, diffs)
    doc["updated_at_ms"] = now_ms()
    if old_name != doc["name"]:
        # keep the denormalized snapshot on past practices truthful
        for d in store.all():
            if d.get("doc_type") == "practice" and d.get("skill_id") == skill_id:
                d["skill_name"] = doc["name"]
                store.put(d)
    store.put(doc)
    return jsonify(doc)


@app.route("/api/skills/<skill_id>", methods=["DELETE"])
def delete_skill(skill_id):
    """Hard-delete only when no practice history references the skill.

    A practiced skill leaves through the lifecycle instead: retire it
    (``PUT {status: "retired"}``) so the cull decision is recorded.
    """
    doc = store.get(skill_id)
    if not doc or doc.get("doc_type") != "skill":
        return _err("skill not found", 404)
    if any(p.get("skill_id") == skill_id for p in store.all()
           if p.get("doc_type") == "practice"):
        return _err("skill has practice history — retire it instead of deleting", 409)
    store.delete(skill_id)
    return jsonify({"ok": True})


# ── practices: the self-reported stream ──────────────────────────────────────
@app.route("/api/practices", methods=["GET"])
def get_practices():
    docs = [d for d in store.all() if d.get("doc_type") == "practice"]
    skill_id = request.args.get("skill_id")
    if skill_id:
        docs = [d for d in docs if d.get("skill_id") == skill_id]
    since_ms = request.args.get("since_ms")
    if since_ms:
        try:
            cut = int(since_ms)
            docs = [d for d in docs if (d.get("practiced_at_ms") or 0) >= cut]
        except ValueError:
            pass
    q = request.args.get("q", "").lower().strip()
    if q:
        docs = [d for d in docs
                if q in ((d.get("notes") or "") + " " + (d.get("skill_name") or "")
                         + " " + " ".join(d.get("tags") or [])).lower()]
    docs.sort(key=lambda d: d.get("practiced_at_ms") or 0, reverse=True)
    try:
        limit = min(int(request.args.get("limit") or 200), 1000)
    except ValueError:
        limit = 200
    try:
        offset = max(int(request.args.get("offset") or 0), 0)
    except ValueError:
        offset = 0
    items = docs[offset:offset + limit]
    return jsonify({
        "items": items,
        "has_more": (offset + len(items)) < len(docs),
        "offset": offset,
        "total": len(docs),
    })


@app.route("/api/practices", methods=["POST"])
def create_practice():
    data = request.get_json(silent=True) or {}
    skill_id = _clean_str(data.get("skill_id") or "", 120)
    if not skill_id:
        return _err("skill_id is required — you cannot self-report practice "
                    "on a skill that does not exist")
    skill = store.get(skill_id)
    if not skill or skill.get("doc_type") != "skill":
        return _err(f"unknown skill '{skill_id}' — you cannot self-report "
                    "practice on a skill that does not exist", 400)
    if skill.get("status") == "retired":
        return _err(f"skill '{skill.get('name')}' is retired — reactivate it "
                    "before reporting practice", 400)

    practiced_at = data.get("practiced_at_ms")
    if practiced_at is None or practiced_at == "":
        practiced_at = now_ms()
    else:
        try:
            practiced_at = int(practiced_at)
        except (TypeError, ValueError):
            return _err("practiced_at_ms must be an integer (epoch ms)")
        if practiced_at > now_ms() + NOW_GRACE_MS:
            return _err("practiced_at_ms cannot be in the future")
    quality = _clean_int(data.get("quality"), 1, 5)
    if data.get("quality") not in (None, "") and quality is None:
        return _err("quality must be an integer 1–5")
    confidence = _clean_int(data.get("confidence"), 1, 5)
    if data.get("confidence") not in (None, "") and confidence is None:
        return _err("confidence must be an integer 1–5")
    duration = _clean_int(data.get("duration_min"), 0, 24 * 60)
    if data.get("duration_min") not in (None, "") and duration is None:
        return _err("duration_min must be an integer 0–1440")

    doc = {
        "id": f"PRACTICE-{uuid.uuid4().hex[:12]}",
        "doc_type": "practice",
        "skill_id": skill_id,
        "skill_name": skill.get("name", ""),
        "practiced_at_ms": practiced_at,
        "duration_min": duration,
        "notes": _clean_str(data.get("notes") or "", 4000),
        "quality": quality,
        "confidence": confidence,
        "evidence_url": _clean_str(data.get("evidence_url") or "", 500),
        "created_at_ms": now_ms(),
    }
    store.put(doc)
    return jsonify(doc), 201


@app.route("/api/practices/<practice_id>", methods=["DELETE"])
def delete_practice(practice_id):
    doc = store.get(practice_id)
    if not doc or doc.get("doc_type") != "practice":
        return _err("practice not found", 404)
    store.delete(practice_id)
    return jsonify({"ok": True})


# ── paths: ordered skill curricula ───────────────────────────────────────────
def _clean_skill_ids(v):
    """Ordered, deduped list of *existing* skill ids (None = invalid)."""
    if not isinstance(v, list):
        return None
    out: list[str] = []
    for x in v:
        sid = _clean_str(x, 120)
        if sid and sid not in out:
            out.append(sid)
    if len(out) > 20:
        return None
    known = {d["id"] for d in store.all() if d.get("doc_type") == "skill"}
    if any(sid not in known for sid in out):
        return None
    return out


def _join_path(path: dict, joined_by_id: dict[str, dict]) -> dict:
    """Derive path progress from its member skills (in order).

    ``current_step`` is the index of the first member that still needs work
    (never-practiced or neglected); None once every member is on-track or
    out of active maintenance.
    """
    members: list[dict] = []
    practiced = 0
    current_step = None
    for sid in path.get("skill_ids") or []:
        s = joined_by_id.get(sid)
        if not s:
            continue  # skill deleted; the path simply skips it
        if current_step is None and s["practice_state"] in ("never-practiced",
                                                            "neglected"):
            current_step = len(members)   # index within the rendered stepper
        members.append({"id": s["id"], "name": s["name"],
                        "state": s["practice_state"],
                        "level": s.get("level", 0),
                        "practice_count": s["practice_count"]})
        if s["practice_count"]:
            practiced += 1
    n = len(members)
    return {**path,
            "members": members,
            "practiced_count": practiced,
            "completion_pct": round(100 * practiced / n) if n else 0,
            "current_step": current_step}


def _paths_joined() -> list[dict]:
    joined_by_id = {s["id"]: s for s in _skills_joined()}
    return [_join_path(d, joined_by_id) for d in store.all()
            if d.get("doc_type") == "path"]


@app.route("/api/paths", methods=["GET"])
def get_paths():
    paths = _paths_joined()
    status = request.args.get("status")
    if status:
        paths = [p for p in paths if (p.get("status") or "active") == status]
    paths.sort(key=lambda p: p.get("name", "").lower())
    return jsonify(paths)


@app.route("/api/paths/<path_id>", methods=["GET"])
def get_path(path_id):
    doc = store.get(path_id)
    if not doc or doc.get("doc_type") != "path":
        return _err("path not found", 404)
    joined_by_id = {s["id"]: s for s in _skills_joined()}
    return jsonify(_join_path(doc, joined_by_id))


@app.route("/api/paths", methods=["POST"])
def create_path():
    data = request.get_json(silent=True) or {}
    name = _clean_str(data.get("name") or "", 120)
    if not name:
        return _err("name is required")
    status = data.get("status") or "active"
    if status not in PATH_STATUSES:
        return _err(f"status must be one of {PATH_STATUSES}")
    ids = _clean_skill_ids(data.get("skill_ids"))
    if ids is None:
        return _err("skill_ids must be a list of at most 20 existing skill ids")
    doc = {
        "id": _path_id(name),
        "doc_type": "path",
        "name": name,
        "description": _clean_str(data.get("description") or "", 2000),
        "skill_ids": ids,
        "status": status,
        "created_at_ms": now_ms(),
        "updated_at_ms": now_ms(),
    }
    store.put(doc)
    joined_by_id = {s["id"]: s for s in _skills_joined()}
    return jsonify(_join_path(doc, joined_by_id)), 201


@app.route("/api/paths/<path_id>", methods=["PUT"])
def update_path(path_id):
    doc = store.get(path_id)
    if not doc or doc.get("doc_type") != "path":
        return _err("path not found", 404)
    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = _clean_str(data.get("name") or "", 120)
        if not name:
            return _err("name cannot be empty")
        doc["name"] = name
    if "description" in data:
        doc["description"] = _clean_str(data.get("description") or "", 2000)
    if "skill_ids" in data:
        ids = _clean_skill_ids(data.get("skill_ids"))
        if ids is None:
            return _err("skill_ids must be a list of at most 20 existing skill ids")
        doc["skill_ids"] = ids
    if "status" in data:
        if data["status"] not in PATH_STATUSES:
            return _err(f"status must be one of {PATH_STATUSES}")
        doc["status"] = data["status"]
    doc["updated_at_ms"] = now_ms()
    store.put(doc)
    joined_by_id = {s["id"]: s for s in _skills_joined()}
    return jsonify(_join_path(doc, joined_by_id))


@app.route("/api/paths/<path_id>", methods=["DELETE"])
def delete_path(path_id):
    doc = store.get(path_id)
    if not doc or doc.get("doc_type") != "path":
        return _err("path not found", 404)
    store.delete(path_id)
    return jsonify({"ok": True})


# ── activity: the merged change feed ─────────────────────────────────────────
@app.route("/api/activity", methods=["GET"])
def activity():
    """Recent events across the system: practice reports and skill changes
    (from the embedded changelogs), newest first."""
    try:
        limit = min(int(request.args.get("limit") or 30), 100)
    except ValueError:
        limit = 30
    events: list[dict] = []
    for d in store.all():
        if d.get("doc_type") == "practice":
            events.append({
                "type": "practice", "id": d["id"],
                "skill_id": d.get("skill_id"), "skill_name": d.get("skill_name"),
                "at_ms": d.get("practiced_at_ms") or d.get("created_at_ms"),
                "quality": d.get("quality"),
            })
        elif d.get("doc_type") == "skill":
            for ch in d.get("changes") or []:
                events.append({
                    "type": "skill", "id": d["id"], "skill_name": d.get("name"),
                    "at_ms": ch.get("at_ms"), "event": ch.get("event"),
                    "changes": ch.get("changes") or [],
                })
    events.sort(key=lambda e: e.get("at_ms") or 0, reverse=True)
    return jsonify(events[:limit])


# ── dashboard ────────────────────────────────────────────────────────────────
@app.route("/api/dashboard/stats")
def dashboard_stats():
    now = now_ms()
    skills = _skills_joined()
    practices = [d for d in store.all() if d.get("doc_type") == "practice"]
    week_ago = now - WEEK_MS

    states = {"never-practiced": 0, "on-track": 0, "neglected": 0,
              "paused": 0, "retired": 0}
    for s in skills:
        states[s.get("practice_state")] = states.get(s.get("practice_state"), 0) + 1

    attention = [s for s in skills
                 if s.get("practice_state") in ("never-practiced", "neglected")]
    attention.sort(key=lambda s: (
        0 if s.get("practice_state") == "neglected" else 1,
        s.get("last_practiced_ms") or s.get("created_at_ms") or 0))

    practices.sort(key=lambda d: d.get("practiced_at_ms") or 0, reverse=True)

    # per-domain rollup (domain is free-form; "General" is the fallback)
    domains: dict[str, dict] = {}
    for s in skills:
        dname = s.get("domain") or "General"
        agg = domains.setdefault(dname, {"domain": dname, "total": 0,
                                         "on-track": 0, "never-practiced": 0,
                                         "neglected": 0, "paused": 0, "retired": 0})
        agg["total"] += 1
        agg[s.get("practice_state")] = agg.get(s.get("practice_state"), 0) + 1
    domain_list = sorted(domains.values(), key=lambda d: (-d["total"], d["domain"]))

    # weekly milestone: share of active skills with fresh practice
    active_skills = [s for s in skills if (s.get("status") or "active") == "active"]
    practiced_week = sum(1 for s in active_skills
                         if (s.get("last_practiced_ms") or 0) >= week_ago)

    return jsonify({
        "generated_at": now_iso(),
        "skills": {
            "total": len(skills),
            "active": len(active_skills),
            "paused": states["paused"],
            "retired": states["retired"],
        },
        "practices": {
            "total": len(practices),
            "last_7d": sum(1 for p in practices
                           if (p.get("practiced_at_ms") or 0) >= week_ago),
        },
        "states": states,
        "domains": domain_list,
        "weekly": {
            "active_skills": len(active_skills),
            "practiced_skills": practiced_week,
            "pct": round(100 * practiced_week / len(active_skills)) if active_skills else 0,
        },
        "attention": [{
            "id": s["id"], "name": s["name"],
            "state": s["practice_state"],
            "target_per_week": s.get("target_per_week"),
            "last_practiced_ms": s.get("last_practiced_ms"),
            "created_at_ms": s.get("created_at_ms"),
        } for s in attention[:10]],
        "recent": practices[:8],
    })


# ── UI ───────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    print("ACSMS — Agent Capability Self Management System")
    app.run(host="0.0.0.0", port=5009, debug=True)
