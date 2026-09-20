"""
Sistema Asistencia de Revisión Lingüística (SARL) — server.

The Text Correction Tool of the Agent Toolbox Ecosystem (spec/sarl/spec.md):
it verifies and corrects the linguistic, stylistic, terminological, and
orthotypographic aspects of a submitted text, returning evidence-cited
findings with suggestions, from which a corrected text is composed by
explicit disposition. Deterministic offline rules are the live path; the
LanguageTool adapter wakes only when a server URL is configured.

Three layers over one CouchDB database (``sarl``, typed documents):

- **Text edition tasks** — the unit of work. A task is the *workflow* of a
  linguistic review of one markdown document under a declared set of
  criteria (dimensions + attached glossaries). Defining a task journals it
  in state ``created``; an explicit review step runs the deterministic
  packs synchronously and records the findings (span, evidence,
  suggestion); per-finding dispositions follow; Apply composes the
  corrected text beside a change log. Lifecycle: created → reviewed →
  applied | discarded. Append-only evidence.
- **Glossaries** — terminological authorities (preferred terms, forbidden
  variants, aliases) enforced by the ``terminologica`` dimension.
- **Phrase collections** — the phrase catalog: editable muletilla/filler
  lists per language that the ``estilo`` pack consults at review time.

Settings are persisted, editable defaults; audit documents record every
mutation and are never pruned.

Run (standalone):  python3 sarl/server.py
Mounted (unified): /ate/tool/sarl/  (via ../server.py TOOLS)
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
sys.path.insert(0, _HERE)  # for `import packs` under any loader

from support.storage import Store  # noqa: E402
import packs  # noqa: E402

app = Flask(__name__, static_folder=os.path.join(_HERE, "static"))

SEED_PATH = os.path.join(_HERE, "data", "seed.json")
BOOTED_AT = time.time()

LANGUAGES = ("es", "en")
REGISTERS = ("technical", "formal", "editorial", "personal")
STATES = ("created", "reviewed", "applied", "discarded")
DISPOSITIONS = ("pending", "accepted", "rejected")
MAX_INPUT_CHARS = 200_000
MAX_TITLE_CHARS = 200

store = Store("sarl", seed_paths=[SEED_PATH])
store.ensure_indexes([
    {"name": "idx-type", "fields": ["type"]},
    {"name": "idx-tasks", "fields": ["type", "state", "created_at"]},
    {"name": "idx-audit", "fields": ["type", "ts"]},
])

# Persisted, editable settings — consulted by the review path. Anything
# not listed here is environment-derived and shown read-only in the UI.
DEFAULT_SETTINGS = {
    "default_language": "es",
    "default_register": "",        # "" = no register tag
    "max_findings": 200,           # bounded responses per review
    "evidence_excerpt": 120,       # max quoted evidence chars
    "task_retention": 500,         # max task docs kept (0 = unlimited)
    "languagetool_url": "",        # dormant external engine; "" = asleep
}
_SETTINGS_SPEC = {  # key: (python type, min, max)
    "max_findings": (int, 1, 1000),
    "evidence_excerpt": (int, 20, 500),
    "task_retention": (int, 0, 100_000),
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
    if "default_language" in body:
        if body["default_language"] not in LANGUAGES:
            return None, "default_language must be es|en"
        merged["default_language"] = body["default_language"]
    if "default_register" in body:
        reg = body["default_register"] or ""
        if reg and reg not in REGISTERS:
            return None, f"default_register must be one of {REGISTERS} or ''"
        merged["default_register"] = reg
    if "languagetool_url" in body:
        url = (body["languagetool_url"] or "").strip()
        if url and not url.startswith(("http://", "https://")):
            return None, "languagetool_url must be empty or an http(s) URL"
        merged["languagetool_url"] = url
    return merged, None


def _ensure_settings_doc():
    if not store.exists("settings"):
        store.put({"id": "settings", "type": "settings",
                   "created_at": _now(), **DEFAULT_SETTINGS})


# ── the engine glue ──────────────────────────────────────────────────────────

def _review_counts(findings):
    by_dimension, by_severity = {}, {}
    for f in findings:
        by_dimension[f["dimension"]] = by_dimension.get(f["dimension"], 0) + 1
        by_severity[f["severity"]] = by_severity.get(f["severity"], 0) + 1
    return {"total": len(findings),
            "by_dimension": by_dimension, "by_severity": by_severity}


def _run_engine(content, language, register, glossary_ids, dimensions):
    """Engage the packs and return (findings with ids, packs_engaged)."""
    settings = get_settings()
    glossaries = [store.get(g) for g in (glossary_ids or [])]
    glossaries = [g for g in glossaries if g and g.get("type") == "glossary"]
    phrase_docs = store.find({"type": "phrase_collection"})
    findings, engaged = packs.run_review(
        content, language=language, register=register,
        dimensions=dimensions, glossaries=glossaries, phrases=phrase_docs,
        settings=settings,
        languagetool_url=settings.get("languagetool_url") or None)
    for i, f in enumerate(findings, 1):
        f["id"] = f"F{i}"
        f["disposition"] = "pending"
    return findings, engaged


def _apply_accepted(task):
    """Compose the corrected text from accepted suggestions.

    Right-to-left by span start, so earlier offsets stay valid. The
    submitted text is never mutated: Apply produces a new artifact next
    to a change log.
    """
    text = task["input"]["content"]
    accepted = [f for f in task["findings"]
                if f.get("disposition") == "accepted"
                and f.get("suggestion") is not None]
    ordered = sorted(accepted, key=lambda f: f["start"], reverse=True)
    corrected = text
    for f in ordered:
        corrected = corrected[:f["start"]] + f["suggestion"] + corrected[f["end"]:]
    change_log = [{
        "finding_id": f["id"],
        "rule_id": f["rule_id"],
        "span": [f["start"], f["end"]],
        "before": text[f["start"]:f["end"]],
        "after": f["suggestion"],
    } for f in sorted(accepted, key=lambda f: f["start"])]
    return corrected, change_log


def _spans_overlap(a, b):
    return a["start"] < b["end"] and b["start"] < a["end"]


# ── helpers: documents ───────────────────────────────────────────────────────

def _task_or_none(task_id):
    doc = store.get(task_id) if task_id else None
    if doc and doc.get("type") == "task":
        return doc
    return None


def _task_summary(doc):
    content = (doc.get("input") or {}).get("content") or ""
    return {
        "id": doc["id"],
        "state": doc["state"],
        "title": doc.get("title") or "",
        "language": doc["input"]["language"],
        "register": doc["input"].get("register"),
        "glossary_ids": doc["input"].get("glossary_ids") or [],
        "dimensions": doc["input"].get("dimensions") or packs.DIMENSIONS,
        "excerpt": _trunc(content, 160),
        "chars": len(content),
        "counts": doc.get("counts"),
        "packs_engaged": doc.get("packs_engaged") or [],
        "corrected": doc.get("corrected_text") is not None,
        "created_at": doc.get("created_at"),
        "reviewed_at": doc.get("reviewed_at"),
        "updated_at": doc.get("updated_at"),
    }


def _prune_tasks():
    """Enforce the task-retention setting; returns the number pruned."""
    retention = int(get_settings().get("task_retention") or 0)
    if retention <= 0:
        return 0
    tasks = store.find({"type": "task"})
    if len(tasks) <= retention:
        return 0
    tasks.sort(key=lambda t: t.get("created_at", ""))
    excess = tasks[:len(tasks) - retention]
    for t in excess:
        store.delete(t["id"])
    return len(excess)


# ── validation ───────────────────────────────────────────────────────────────

def _validate_task_input(body):
    """Returns ((content, language, register, glossary_ids, dimensions),
    error)."""
    content = body.get("content")
    if not isinstance(content, str) or not content.strip():
        return None, "content is required (non-empty text)"
    if len(content) > MAX_INPUT_CHARS:
        return None, f"content exceeds {MAX_INPUT_CHARS} characters"
    settings = get_settings()
    language = body.get("language") or settings["default_language"]
    if language not in LANGUAGES:
        return None, "language must be es|en"
    register = body.get("register")
    if register is not None and register not in REGISTERS:
        return None, f"register must be one of {REGISTERS} or null"
    glossary_ids = body.get("glossary_ids") or []
    if not isinstance(glossary_ids, list):
        return None, "glossary_ids must be a list of glossary ids"
    for gid in glossary_ids:
        g = store.get(gid)
        if not g or g.get("type") != "glossary":
            return None, f"glossary '{gid}' does not exist"
    dimensions = body.get("dimensions") or list(packs.DIMENSIONS)
    if (not isinstance(dimensions, list)
            or any(d not in packs.DIMENSIONS for d in dimensions)):
        return None, f"dimensions must be a subset of {packs.DIMENSIONS}"
    if not dimensions:
        return None, "at least one dimension is required"
    return (content, language, register, glossary_ids, dimensions), None


def _validate_glossary(body, existing=None):
    """Returns (doc, error)."""
    name = (body.get("name") if existing is None
            else body.get("name", existing.get("name")))
    if not name or not str(name).strip():
        return None, "name is required"
    language = (body.get("language") if existing is None
                else body.get("language", existing.get("language")))
    if language not in LANGUAGES:
        return None, "language must be es|en"
    raw_entries = body.get("entries", (existing or {}).get("entries") or [])
    if not isinstance(raw_entries, list):
        return None, "entries must be a list"
    entries = []
    for e in raw_entries:
        if not isinstance(e, dict):
            return None, "each entry must be an object"
        preferred = (e.get("preferred") or "").strip()
        if not preferred:
            return None, "each entry needs a preferred term"
        entries.append({
            "preferred": preferred,
            "forbidden": [str(t).strip() for t in (e.get("forbidden") or [])
                          if str(t).strip()],
            "aliases": [str(t).strip() for t in (e.get("aliases") or [])
                        if str(t).strip()],
            "note": str(e.get("note") or "").strip(),
        })
    return {
        "id": (existing or {}).get("id") or _new_id("GLOS"),
        "type": "glossary",
        "name": str(name).strip(),
        "language": language,
        "domain": (body.get("domain", (existing or {}).get("domain"))
                   or "general"),
        "note": (body.get("note", (existing or {}).get("note")) or ""),
        "enabled": bool(body.get("enabled",
                                 (existing or {}).get("enabled", True))),
        "entries": entries,
        "created_at": (existing or {}).get("created_at") or _now(),
        "updated_at": _now(),
    }, None


def _validate_phrases(body, existing=None):
    """Returns (doc, error)."""
    name = (body.get("name") if existing is None
            else body.get("name", existing.get("name")))
    if not name or not str(name).strip():
        return None, "name is required"
    language = (body.get("language") if existing is None
                else body.get("language", existing.get("language")))
    if language not in ("es", "en", "any"):
        return None, "language must be es|en|any"
    kind = (body.get("kind", (existing or {}).get("kind")) or "muletilla")
    if kind not in ("muletilla", "filler", "formulaic", "other"):
        return None, "kind must be muletilla|filler|formulaic|other"
    raw = body.get("phrases", (existing or {}).get("phrases") or [])
    if not isinstance(raw, list):
        return None, "phrases must be a list of strings"
    phrases = [str(p).strip() for p in raw if str(p).strip()]
    return {
        "id": (existing or {}).get("id") or _new_id("PHR"),
        "type": "phrase_collection",
        "name": str(name).strip(),
        "language": language,
        "kind": kind,
        "enabled": bool(body.get("enabled",
                                 (existing or {}).get("enabled", True))),
        "note": (body.get("note", (existing or {}).get("note")) or ""),
        "phrases": phrases,
        "created_at": (existing or {}).get("created_at") or _now(),
        "updated_at": _now(),
    }, None


# ── API index ────────────────────────────────────────────────────────────────

_ensure_settings_doc()


@app.route("/api")
def api_index():
    return jsonify({
        "name": "SARL — Sistema Asistencia de Revisión Lingüística",
        "version": "1.0.0",
        "phase": ("text edition tasks, glossaries, phrase catalog, "
                  "deterministic packs, dormant LanguageTool"),
        "endpoints": {
            "rules": "/api/rules",
            "tasks": "/api/tasks",
            "task": "/api/tasks/<id>",
            "review": "POST /api/tasks/<id>/review",
            "disposition": "POST /api/tasks/<id>/disposition",
            "apply": "POST /api/tasks/<id>/apply",
            "discard": "POST /api/tasks/<id>/discard",
            "glossaries": "/api/glossaries",
            "phrases": "/api/phrases",
            "overview": "/api/overview",
            "audit": "/api/audit",
            "settings": "/api/settings",
            "self": "/api/self",
            "export": "/api/export",
        },
        "engine": {
            "dimensions": packs.DIMENSIONS,
            "severities": packs.SEVERITIES,
            "languagetool": "dormant" if not get_settings()["languagetool_url"]
                            else "awake",
        },
    })


@app.route("/api/rules", methods=["GET"])
def list_rules():
    return jsonify({
        "packs": packs.registry(),
        "dimensions": packs.DIMENSIONS,
        "severities": packs.SEVERITIES,
        "languagetool_url": get_settings()["languagetool_url"],
    })


# ── text edition tasks ───────────────────────────────────────────────────────

@app.route("/api/tasks", methods=["POST"])
def create_task():
    """Define a text edition task: the markdown document under review
    (title, content, language, register) plus its criteria set
    (dimensions + glossaries). The review runs as an explicit workflow
    step (POST /api/tasks/<id>/review); the task journals in state
    ``created``."""
    body = request.get_json(force=True, silent=True) or {}
    clean, err = _validate_task_input(body)
    if err:
        return jsonify({"error": err}), 400
    content, language, register, glossary_ids, dimensions = clean
    title = str(body.get("title") or "").strip()
    if len(title) > MAX_TITLE_CHARS:
        return jsonify({"error": f"title exceeds {MAX_TITLE_CHARS} "
                                 "characters"}), 400
    now = _now()
    task = {
        "id": _new_id("TED"),
        "type": "task",
        "state": "created",
        "title": title,
        "input": {
            "content": content,
            "language": language,
            "register": register,
            "glossary_ids": glossary_ids,
            "dimensions": dimensions,
        },
        "packs_engaged": [],
        "findings": [],
        "counts": _review_counts([]),
        "corrected_text": None,
        "change_log": [],
        "created_at": now,
        "updated_at": now,
        "duration_ms": None,
    }
    store.put(task)
    _prune_tasks()
    _audit("task.create", "task", task["id"],
           f"task '{task['id']}' defined — {len(content)} chars, "
           f"{len(dimensions)} dimension(s), "
           f"{len(glossary_ids)} glossary/ies",
           details={"language": language, "chars": len(content),
                    "title": title})
    return jsonify(task), 201


@app.route("/api/tasks/<task_id>/review", methods=["POST"])
def review_task(task_id):
    """Run the task's review: engage the packs declared by its criteria
    synchronously and record the findings. Deterministic live path —
    same document, same criteria, same findings."""
    task = _task_or_none(task_id)
    if not task:
        return jsonify({"error": "task not found"}), 404
    if task["state"] != "created":
        return jsonify({"error": f"task is {task['state']} — only created "
                                 "tasks can run their review"}), 409
    started = time.time()
    inp = task["input"]
    findings, engaged = _run_engine(inp["content"], inp["language"],
                                    inp.get("register"),
                                    inp.get("glossary_ids"),
                                    inp.get("dimensions"))
    task["findings"] = findings
    task["counts"] = _review_counts(findings)
    task["packs_engaged"] = engaged
    task["state"] = "reviewed"
    task["reviewed_at"] = _now()
    task["updated_at"] = task["reviewed_at"]
    task["duration_ms"] = int((time.time() - started) * 1000)
    store.put(task)
    _audit("task.review", "task", task_id,
           f"task '{task_id}' reviewed — {task['counts']['total']} "
           f"finding(s) in {len(engaged)} pack(s)",
           details={"findings": task["counts"]["total"],
                    "packs": engaged})
    return jsonify(task)


@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    tasks = store.find({"type": "task"})
    state = request.args.get("state")
    language = request.args.get("language")
    q = request.args.get("q")
    if state:
        tasks = [t for t in tasks if t.get("state") == state]
    if language:
        tasks = [t for t in tasks
                 if (t.get("input") or {}).get("language") == language]
    if q:
        needle = q.lower()

        def _matches(t):
            if needle in t["id"].lower():
                return True
            if needle in (t.get("title") or "").lower():
                return True
            if needle in (t.get("input") or {}).get("content", "").lower():
                return True
            return any(needle in f.get("rule_id", "").lower()
                       for f in t.get("findings") or [])

        tasks = [t for t in tasks if _matches(t)]
    tasks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    try:
        offset = max(0, int(request.args.get("offset", 0)))
        limit = max(1, min(int(request.args.get("limit", 25)), 200))
    except ValueError:
        offset, limit = 0, 25
    return jsonify([_task_summary(t) for t in tasks[offset:offset + limit]])


@app.route("/api/tasks/<task_id>", methods=["GET"])
def get_task(task_id):
    task = _task_or_none(task_id)
    if not task:
        return jsonify({"error": "task not found"}), 404
    return jsonify(task)


@app.route("/api/tasks/<task_id>/disposition", methods=["POST"])
def set_disposition(task_id):
    """Accept, reject, or reset one finding. Accepting a finding whose
    suggestion overlaps an already-accepted one is refused (409) so
    Apply stays deterministic."""
    task = _task_or_none(task_id)
    if not task:
        return jsonify({"error": "task not found"}), 404
    if task["state"] != "reviewed":
        return jsonify({"error": f"task is {task['state']} — dispositions "
                                 "are only open while reviewed"}), 409
    body = request.get_json(force=True, silent=True) or {}
    finding_id = body.get("finding_id")
    disposition = body.get("disposition")
    if disposition not in DISPOSITIONS:
        return jsonify({"error": "disposition must be one of "
                                 f"{DISPOSITIONS}"}), 400
    finding = next((f for f in task["findings"]
                    if f["id"] == finding_id), None)
    if not finding:
        return jsonify({"error": "finding not found"}), 404
    if (disposition == "accepted" and finding.get("suggestion") is not None
            and finding.get("disposition") != "accepted"):
        accepted = [f for f in task["findings"]
                    if f.get("disposition") == "accepted"
                    and f.get("suggestion") is not None
                    and f["id"] != finding_id]
        clash = next((f for f in accepted if _spans_overlap(f, finding)), None)
        if clash:
            return jsonify({"error":
                            f"span overlaps already-accepted finding "
                            f"{clash['id']} ({clash['rule_id']})"}), 409
    before = finding.get("disposition")
    finding["disposition"] = disposition
    task["updated_at"] = _now()
    store.put(task)
    _audit("task.disposition", "task", task_id,
           f"finding {finding_id} ({finding['rule_id']}): "
           f"{before} → {disposition}",
           details={"finding_id": finding_id, "from": before,
                    "to": disposition})
    return jsonify(task)


@app.route("/api/tasks/<task_id>/apply", methods=["POST"])
def apply_task(task_id):
    """Compose the corrected text from accepted suggestions. The input
    text is immutable; Apply records a new artifact plus a change log."""
    task = _task_or_none(task_id)
    if not task:
        return jsonify({"error": "task not found"}), 404
    if task["state"] != "reviewed":
        return jsonify({"error": f"task is {task['state']} — only reviewed "
                                 "tasks can be applied"}), 409
    corrected, change_log = _apply_accepted(task)
    task["corrected_text"] = corrected
    task["change_log"] = change_log
    task["state"] = "applied"
    task["applied_at"] = _now()
    task["updated_at"] = task["applied_at"]
    store.put(task)
    _audit("task.apply", "task", task_id,
           f"task '{task_id}' applied — {len(change_log)} change(s)",
           details={"applied": len(change_log),
                    "accepted_total": sum(
                        1 for f in task["findings"]
                        if f.get("disposition") == "accepted")})
    return jsonify(task)


@app.route("/api/tasks/<task_id>/discard", methods=["POST"])
def discard_task(task_id):
    task = _task_or_none(task_id)
    if not task:
        return jsonify({"error": "task not found"}), 404
    if task["state"] not in ("created", "reviewed"):
        return jsonify({"error": f"task is {task['state']} — only created "
                                 "or reviewed tasks can be discarded"}), 409
    task["state"] = "discarded"
    task["updated_at"] = _now()
    store.put(task)
    _audit("task.discard", "task", task_id, f"task '{task_id}' discarded")
    return jsonify(task)


@app.route("/api/tasks", methods=["DELETE"])
def clear_tasks():
    deleted = 0
    for task in store.find({"type": "task"}):
        if store.delete(task["id"]):
            deleted += 1
    _audit("tasks.clear", "task", "*", f"cleared the task log ({deleted} docs)")
    return jsonify({"ok": True, "deleted": deleted})


# ── glossaries ───────────────────────────────────────────────────────────────

@app.route("/api/glossaries", methods=["GET"])
def list_glossaries():
    docs = store.find({"type": "glossary"})
    docs.sort(key=lambda g: (g.get("enabled", True) is not True, g["id"]))
    for g in docs:
        g["entry_count"] = len(g.get("entries") or [])
    return jsonify(docs)


@app.route("/api/glossaries/<glossary_id>", methods=["GET"])
def get_glossary(glossary_id):
    doc = store.get(glossary_id)
    if not doc or doc.get("type") != "glossary":
        return jsonify({"error": "glossary not found"}), 404
    return jsonify(doc)


@app.route("/api/glossaries", methods=["POST"])
def create_glossary():
    body = request.get_json(force=True, silent=True) or {}
    doc, err = _validate_glossary(body)
    if err:
        return jsonify({"error": err}), 400
    store.put(doc)
    _audit("glossary.create", "glossary", doc["id"],
           f"glossary '{doc['name']}' created ({len(doc['entries'])} entries)")
    return jsonify(doc), 201


@app.route("/api/glossaries/<glossary_id>", methods=["PUT"])
def update_glossary(glossary_id):
    doc = store.get(glossary_id)
    if not doc or doc.get("type") != "glossary":
        return jsonify({"error": "glossary not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    clean, err = _validate_glossary(body, existing=doc)
    if err:
        return jsonify({"error": err}), 400
    store.put(clean)
    _audit("glossary.update", "glossary", glossary_id,
           f"glossary '{clean['name']}' updated "
           f"({len(clean['entries'])} entries)")
    return jsonify(clean)


@app.route("/api/glossaries/<glossary_id>", methods=["DELETE"])
def delete_glossary(glossary_id):
    doc = store.get(glossary_id)
    if not doc or doc.get("type") != "glossary":
        return jsonify({"error": "glossary not found"}), 404
    store.delete(glossary_id)
    _audit("glossary.delete", "glossary", glossary_id,
           f"glossary '{doc.get('name')}' deleted")
    return jsonify({"ok": True, "deleted": glossary_id})


# ── the phrase catalog ───────────────────────────────────────────────────────

@app.route("/api/phrases", methods=["GET"])
def list_phrases():
    docs = store.find({"type": "phrase_collection"})
    docs.sort(key=lambda p: (p.get("enabled", True) is not True, p["id"]))
    for p in docs:
        p["phrase_count"] = len(p.get("phrases") or [])
    return jsonify(docs)


@app.route("/api/phrases/<collection_id>", methods=["GET"])
def get_phrases(collection_id):
    doc = store.get(collection_id)
    if not doc or doc.get("type") != "phrase_collection":
        return jsonify({"error": "phrase collection not found"}), 404
    return jsonify(doc)


@app.route("/api/phrases", methods=["POST"])
def create_phrases():
    body = request.get_json(force=True, silent=True) or {}
    doc, err = _validate_phrases(body)
    if err:
        return jsonify({"error": err}), 400
    store.put(doc)
    _audit("phrases.create", "phrase_collection", doc["id"],
           f"phrase collection '{doc['name']}' created "
           f"({len(doc['phrases'])} phrases)")
    return jsonify(doc), 201


@app.route("/api/phrases/<collection_id>", methods=["PUT"])
def update_phrases(collection_id):
    doc = store.get(collection_id)
    if not doc or doc.get("type") != "phrase_collection":
        return jsonify({"error": "phrase collection not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    clean, err = _validate_phrases(body, existing=doc)
    if err:
        return jsonify({"error": err}), 400
    store.put(clean)
    _audit("phrases.update", "phrase_collection", collection_id,
           f"phrase collection '{clean['name']}' updated "
           f"({len(clean['phrases'])} phrases)")
    return jsonify(clean)


@app.route("/api/phrases/<collection_id>", methods=["DELETE"])
def delete_phrases(collection_id):
    doc = store.get(collection_id)
    if not doc or doc.get("type") != "phrase_collection":
        return jsonify({"error": "phrase collection not found"}), 404
    store.delete(collection_id)
    _audit("phrases.delete", "phrase_collection", collection_id,
           f"phrase collection '{doc.get('name')}' deleted")
    return jsonify({"ok": True, "deleted": collection_id})


# ── overview (the dashboard payload) ─────────────────────────────────────────

@app.route("/api/overview", methods=["GET"])
def overview():
    tasks = store.find({"type": "task"})
    by_state, by_language = {}, {}
    for t in tasks:
        by_state[t.get("state", "?")] = by_state.get(t.get("state", "?"), 0) + 1
        lang = (t.get("input") or {}).get("language", "?")
        by_language[lang] = by_language.get(lang, 0) + 1
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)) \
        .isoformat().replace("+00:00", "Z")
    last_24h = sum(1 for t in tasks if t.get("created_at", "") >= cutoff)

    total_findings = 0
    by_dimension, by_severity, dispositions = {}, {}, {}
    rule_fires = {}
    for t in tasks:
        for f in t.get("findings") or []:
            total_findings += 1
            by_dimension[f["dimension"]] = \
                by_dimension.get(f["dimension"], 0) + 1
            by_severity[f["severity"]] = \
                by_severity.get(f["severity"], 0) + 1
            d = f.get("disposition", "pending")
            dispositions[d] = dispositions.get(d, 0) + 1
            rule_fires[f["rule_id"]] = rule_fires.get(f["rule_id"], 0) + 1
    top_rules = sorted(rule_fires.items(), key=lambda kv: -kv[1])[:8]

    glossaries = store.find({"type": "glossary"})
    collections = store.find({"type": "phrase_collection"})
    phrase_count = sum(len(p.get("phrases") or []) for p in collections)

    tasks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    settings = get_settings()
    return jsonify({
        "generated_at": _now(),
        "tasks": {"total": len(tasks), "by_state": by_state,
                  "by_language": by_language, "last_24h": last_24h},
        "findings": {"total": total_findings,
                     "by_dimension": by_dimension,
                     "by_severity": by_severity,
                     "dispositions": dispositions,
                     "top_rules": [{"rule_id": r, "fires": n}
                                   for r, n in top_rules]},
        "resources": {"glossaries": len(glossaries),
                      "phrase_collections": len(collections),
                      "enabled_collections":
                          sum(1 for p in collections
                              if p.get("enabled", True)),
                      "phrases": phrase_count},
        "engine": {"dimensions": packs.DIMENSIONS,
                   "languagetool": "dormant"
                                   if not settings["languagetool_url"]
                                   else "awake"},
        "recent": [_task_summary(t) for t in tasks[:8]],
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
            "max_input_chars": MAX_INPUT_CHARS,
            "packs": [{"id": p["id"], "status": p["status"],
                       "languages": p["languages"]}
                      for p in packs.registry()],
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
    docs = store.find({"type": "task"})
    by_state = {}
    for t in docs:
        by_state[t.get("state", "?")] = by_state.get(t.get("state", "?"), 0) + 1
    durations = [t.get("duration_ms") for t in docs
                 if t.get("duration_ms") is not None]
    avg_ms = int(sum(durations) / len(durations)) if durations else None
    type_counts = {}
    for t in ("task", "glossary", "phrase_collection", "audit", "settings"):
        type_counts[t] = len(store.find({"type": t}))
    settings = get_settings()
    return jsonify({
        "generated_at": _now(),
        "uptime_s": int(time.time() - BOOTED_AT),
        "store": {"db": store.db_name, "docs": type_counts},
        "tasks": {"total": len(docs), "by_state": by_state,
                  "avg_review_ms": avg_ms},
        "findings": _review_counts(
            [f for t in docs for f in t.get("findings") or []]),
        "engine": {"packs": [{"id": p["id"], "status": p["status"],
                              "rules": len(p["rules"])}
                             for p in packs.registry()],
                   "languagetool_configured": bool(
                       settings["languagetool_url"])},
        "settings": settings,
    })


# ── export ───────────────────────────────────────────────────────────────────

@app.route("/api/export", methods=["GET"])
def export_data():
    return jsonify({
        "exported_at": _now(),
        "tasks": store.find({"type": "task"})[:500],
        "glossaries": store.find({"type": "glossary"}),
        "phrase_collections": store.find({"type": "phrase_collection"}),
        "settings": get_settings(),
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
    port = int(os.environ.get("SARL_PORT", "5016"))
    print("SARL — Sistema Asistencia de Revisión Lingüística")
    lt = get_settings()["languagetool_url"]
    print(f"   engine: deterministic packs live"
          f"{f' · LanguageTool awake at {lt}' if lt else ' · LanguageTool dormant'}")
    print(f"   Open: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
