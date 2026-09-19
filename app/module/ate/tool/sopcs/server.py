"""
Standard Operating Procedure Catalog System (SOPCS) — server.

The catalog of standard operating procedures: markdown SOP documents with
full lifecycle (draft → active → deprecated), a metadata-first catalog
(pagination, status/tag filters, reading time), and two search paths:

- **Lexical** — a CouchDB design-doc token view (the WOS search pattern):
  every query executes inside the database as token prefix lookups,
  AND-composed and ranked by match count and recency.
- **Semantic** — optional `fastembed` sentence embeddings (the WOS
  clustering backend convention: lazy import, never a hard dependency).
  Embeddings are computed in a background thread on save and refreshed by
  ``POST /api/reindex``; when fastembed is absent the endpoint degrades
  gracefully and ``mode=semantic`` answers 501.

SOP bodies are markdown rendered by the shared renderer (``/ui/js/md.js``);
the server computes the heading outline (TOC) with anchors matching the
renderer's deterministic ``h-<n>`` numbering. Supporting figures are
uploaded through ``/api/images`` and stored as CouchDB attachments via the
shared ``Store`` attachment API — they persist with the ``couchdb_data``
volume, not the container filesystem. Every mutation appends an audit
record (the CTES convention).

Run (standalone):  python3 sopcs/server.py
Mounted (unified): /ate/tool/sopcs/  (via ../../server.py TOOLS)
"""
import difflib
import math
import os
import re
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone

from flask import Flask, Response, jsonify, request, send_from_directory

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(  # app/ — for support.storage
    os.path.dirname(os.path.dirname(os.path.dirname(_HERE)))))
sys.path.insert(0, _HERE)  # for `import clustering` under any loader

from support.storage import Store  # noqa: E402
import clustering  # noqa: E402

app = Flask(__name__, static_folder=os.path.join(_HERE, "static"))

SEED_PATH = os.path.join(_HERE, "data", "seed.json")
BOOTED_AT = time.time()

store = Store("sopcs", seed_paths=[SEED_PATH])

STATUSES = ("draft", "active", "deprecated")
_SOP_ID_RE = re.compile(r"^[a-z][a-z0-9-]{1,63}$")
_TOKEN_RE = re.compile(r"[a-z0-9_]{2,}")
PAGE_DEFAULT, PAGE_MAX = 12, 100
WPM = 200                       # reading-time words-per-minute
TOC_MAX_LEVEL = 4               # headings listed in the outline (anchors count all)
_META_FIELDS = ["id", "type", "title", "summary", "tags", "status", "words",
                "reading_minutes", "created_at", "updated_at"]

IMG_MAX_BYTES = 10 * 1024 * 1024
IMG_TYPES = {"image/png": ".png", "image/jpeg": ".jpg",
             "image/gif": ".gif", "image/webp": ".webp"}

# ── search: the DB-resident query layer (WOS pattern) ────────────────────────
_SEARCH_DDOC = "sopcs-search"
_SEARCH_VIEWS = {
    # token search: normalized words of title+summary+tags+body → [token, updated]
    "token": ("function(doc){if(doc.type!=='sop')return;"
              "var txt=((doc.title||'')+' '+(doc.summary||'')+' '"
              "+((doc.tags||[]).join(' '))+' '+(doc.body||'')).toLowerCase();"
              "var m=txt.match(/[a-z0-9_]{2,}/g);if(!m)return;"
              "for(var i=0;i<m.length;i++)emit(m[i],doc.updated_at||'');}"),
}

# ── revisions: the Notion-style history layer ────────────────────────────────
# Every content change snapshots the whole document as a ``type: revision``
# side doc; diffs are computed on read (difflib), restores are forward-only.
# Kept forever — the catalog is personal-scale and bodies are KB-sized.
_REV_DDOC = "sopcs-revisions"
_REV_VIEWS = {
    "by_sop": ("function(doc){if(doc.type!=='revision')return;"
               "emit([doc.sop_id, doc.seq], null);}"),
}
_REV_SNAPSHOT_FIELDS = ("id", "title", "summary", "tags", "status", "body",
                        "words", "reading_minutes", "toc", "created_at",
                        "updated_at")
STALE_DAYS = 90                 # active SOPs untouched this long → review list


def _ensure_search_layer():
    """Idempotently create the search/revision ddocs + Mango indexes."""
    try:
        for ddoc, views in ((_SEARCH_DDOC, _SEARCH_VIEWS), (_REV_DDOC, _REV_VIEWS)):
            for name, map_fun in views.items():
                store.ensure_view(ddoc, name, map_fun)
        store.ensure_indexes([
            {"name": "idx-sops", "fields": ["type", "updated_at"]},
            {"name": "idx-status", "fields": ["type", "status"]},
        ])
    except Exception as exc:  # pragma: no cover - CouchDB version quirks
        print(f"[sopcs] warning: could not ensure search layer: {exc}")


def _revision_id(sop_id, seq):
    return f"rev-{sop_id}-{seq:04d}"


def _next_seq(sop_id):
    """Next revision number for a SOP (its stored counter may be absent
    on pre-revision docs — the view is the source of truth)."""
    rows = store.query_view(_REV_DDOC, "by_sop", startkey=[sop_id, {}],
                            endkey=[sop_id, 0], descending=True, limit=1)
    return (rows[0]["key"][1] + 1) if rows else 1


def _write_revision(doc, seq, comment=None):
    """Snapshot ``doc`` (a full SOP document) as revision ``seq``."""
    rev = {
        "id": _revision_id(doc["id"], seq),
        "type": "revision",
        "sop_id": doc["id"],
        "seq": seq,
        "title": doc.get("title"),
        "words": doc.get("words"),
        "comment": (comment or "").strip() or None,
        "snapshot": {k: doc.get(k) for k in _REV_SNAPSHOT_FIELDS},
        "created_at": _now(),
    }
    store.put(rev)
    return rev


def _sop_or_none(sid):
    doc = store.get(sid) if sid else None
    return doc if doc and doc.get("type") == "sop" else None


def _revision_or_none(sid, seq):
    rev = store.get(_revision_id(sid, seq))
    return rev if rev and rev.get("type") == "revision" else None


def _revisions(sid, limit=10000):
    """Revisions of one SOP, newest first (light projection for lists)."""
    rows = store.query_view(_REV_DDOC, "by_sop", startkey=[sid, {}],
                            endkey=[sid, 0], descending=True, limit=limit,
                            include_docs=True)
    light = []
    for r in rows:
        d = r.get("doc") or {}
        light.append({k: d.get(k) for k in ("id", "sop_id", "seq", "title",
                                            "words", "comment", "created_at")})
    return light


_ensure_search_layer()


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


# ── derived content: outline (TOC) + reading time + summary ─────────────────

def _toc(body):
    """Heading outline.

    Anchors must match the shared renderer exactly: one counter over ALL
    ATX headings (#…######) in document order → ``h-<n>``; levels above
    ``TOC_MAX_LEVEL`` get an anchor but are not listed.
    """
    toc, n = [], 0
    for line in (body or "").splitlines():
        m = re.match(r"^(#{1,6})\s+(.*?)\s*$", line)
        if not m:
            continue
        n += 1
        if len(m.group(1)) <= TOC_MAX_LEVEL:
            text = re.sub(r"[*_`]", "", m.group(2)).strip()
            toc.append({"level": len(m.group(1)), "text": text, "anchor": f"h-{n}"})
    return toc


def _reading_time(body):
    words = len(re.findall(r"\S+", body or ""))
    return words, (max(1, math.ceil(words / WPM)) if words else 0)


def _summary_from_body(body):
    """First presentable line of the body, inline markers stripped."""
    for line in (body or "").splitlines():
        s = line.strip()
        if not s or s.startswith(("#", "```", ">", "|", "-", "*")) or re.match(r"^\d+\.\s", s):
            continue
        return re.sub(r"[*_`]", "", s)[:280]
    return ""


def _slugify(title):
    s = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return s[:64] or None


def _norm_tags(tags):
    if tags is None:
        return []
    if isinstance(tags, str):
        tags = [t for t in re.split(r"[,;]", tags)]
    if not isinstance(tags, list):
        return None
    out = []
    for t in tags:
        tag = re.sub(r"\s+", "-", str(t).strip().lower()).strip("-")[:32]
        if tag and tag not in out:
            out.append(tag)
    return out[:12]


def _sop_doc(body_json, existing=None):
    """Validate + build a SOP document; returns (doc, error)."""
    body_json = body_json or {}
    new = existing is None
    title = (body_json.get("title") if new else
             body_json.get("title", (existing or {}).get("title")))
    title = (title or "").strip() if isinstance(title, str) else None
    if not title:
        return None, "title is required"
    body = body_json.get("body", None if new else existing.get("body"))
    if not isinstance(body, str) or not body.strip():
        return None, "body is required (markdown)"
    status = body_json.get("status", (existing or {}).get("status") or "draft")
    if status not in STATUSES:
        return None, f"status must be one of {STATUSES}"
    tags = _norm_tags(body_json.get("tags", (existing or {}).get("tags") or []))
    if tags is None:
        return None, "tags must be a list of strings"
    summary = str(body_json.get("summary", (existing or {}).get("summary") or "")).strip()
    if not summary:
        summary = _summary_from_body(body)

    sid = existing["id"] if existing else (body_json.get("id") or _slugify(title))
    if not sid or not _SOP_ID_RE.match(sid):
        return None, (f"invalid id {sid!r} (lowercase letters, digits, '-', "
                      "starting with a letter)")
    words, minutes = _reading_time(body)
    doc = {
        "id": sid,
        "type": "sop",
        "title": title,
        "summary": summary,
        "tags": tags,
        "status": status,
        "body": body,
        "words": words,
        "reading_minutes": minutes,
        "toc": _toc(body),
        "created_at": (existing or {}).get("created_at") or _now(),
        "updated_at": _now(),
    }
    return doc, None


def _refresh_seed_derived():
    """Normalize seed docs written before a schema addition (seeds apply raw
    when the DB is empty): backfill derived fields, and give docs without a
    revision history their initial snapshot. Idempotent."""
    try:
        for doc in store.find({"type": "sop"}):
            needs_derived = not all(k in doc for k in ("words", "reading_minutes", "toc"))
            needs_revision = "revision" not in doc
            if not needs_derived and not needs_revision:
                continue
            fixed, _err = _sop_doc(doc, existing=doc) if needs_derived else (dict(doc), None)
            if not fixed:
                continue
            if needs_revision:
                seq = _next_seq(doc["id"])
                fixed["revision"] = seq
                store.put(fixed)
                _write_revision(fixed, seq, comment="initial version")
            else:
                store.put(fixed)
    except Exception as exc:  # pragma: no cover
        print(f"[sopcs] warning: seed normalization skipped: {exc}")


_refresh_seed_derived()


# ── semantic search: optional fastembed (the WOS clustering convention) ──────

_MODEL_NAME = "BAAI/bge-small-en-v1.5"
_EMBED_BACKEND = os.environ.get("SOPCS_EMBED_BACKEND", "auto").lower()  # auto|lexical
_embedder = None
_embedder_failed = None
_embed_lock = threading.Lock()


def _get_embedder():
    """Lazy fastembed TextEmbedding; None when unavailable (cached)."""
    global _embedder, _embedder_failed
    if _EMBED_BACKEND == "lexical":
        return None
    if _embedder is not None or _embedder_failed is not None:
        return _embedder
    with _embed_lock:
        if _embedder is None and _embedder_failed is None:
            try:
                from fastembed import TextEmbedding
                _embedder = TextEmbedding(_MODEL_NAME)
            except Exception as exc:
                _embedder_failed = f"{type(exc).__name__}: {exc}"
                print(f"[sopcs] embeddings unavailable ({_embedder_failed}); "
                      "semantic search degrades to lexical")
    return _embedder


def _embed(text):
    """Embed text as an L2-normalized vector → (vector, model) or (None, None)."""
    model = _get_embedder()
    if model is None:
        return None, None
    import numpy as np
    vec = np.asarray(list(model.embed([text[:4000]])), dtype=np.float32)[0]
    norm = float(np.linalg.norm(vec))
    return ((vec / norm if norm else vec).tolist(), _MODEL_NAME)


def _embed_text_for(doc):
    return ". ".join([doc.get("title") or "", doc.get("summary") or "",
                      " ".join(doc.get("tags") or []), doc.get("body") or ""])


def _store_embedding(sop_id, vector, model):
    store.put({"id": f"embed-{sop_id}", "type": "embedding", "sop_id": sop_id,
               "vector": vector, "model": model, "updated_at": _now()})


def _queue_embedding(sop_id):
    """Compute embeddings in a background thread — saving never blocks on a
    model download. Failures are logged and retried on the next reindex."""
    if _EMBED_BACKEND == "lexical":
        return

    def work():
        try:
            doc = store.get(sop_id)
            if not doc or doc.get("type") != "sop":
                return
            vector, model = _embed(_embed_text_for(doc))
            if vector is not None:
                _store_embedding(sop_id, vector, model)
        except Exception as exc:  # pragma: no cover - background best effort
            print(f"[sopcs] embedding failed for {sop_id}: {exc}")

    threading.Thread(target=work, daemon=True).start()


def _search_backend_status():
    if _EMBED_BACKEND == "lexical":
        return {"available": False, "reason": "disabled (SOPCS_EMBED_BACKEND=lexical)"}
    if _get_embedder() is not None:
        return {"available": True, "model": _MODEL_NAME}
    return {"available": False, "reason": "fastembed not installed",
            "detail": _embedder_failed}


# ── search: lexical (token view) + semantic (cosine over embeddings) ─────────

def _tokens(q):
    return _TOKEN_RE.findall((q or "").lower())


def _apply_filters(docs, status, tag):
    if status:
        docs = [d for d in docs if d.get("status") == status]
    if tag:
        docs = [d for d in docs if tag in (d.get("tags") or [])]
    return docs


def _lexical_search(q, status, tag, limit):
    """Token prefix lookups per token, AND-composed, ranked by match
    count then recency — every lookup executes inside CouchDB.

    AND semantics intersect per-token doc-id sets (a doc matches when it
    contains every token); ``score`` is the total occurrence count of the
    query tokens in the doc.
    """
    toks = _tokens(q)
    if not toks:
        return []
    occurrences: dict[str, int] = {}
    per_tok: list[set[str]] = []
    for tok in toks:
        rows = store.query_view(_SEARCH_DDOC, "token",
                                startkey=tok, endkey=tok + "\uffff", limit=2000)
        ids = set()
        for r in rows:
            occurrences[r["id"]] = occurrences.get(r["id"], 0) + 1
            ids.add(r["id"])
        per_tok.append(ids)
    cand = set.intersection(*per_tok)
    if not cand:
        return []
    docs = store.find({"type": "sop", "_id": {"$in": sorted(cand)[:1000]}},
                      fields=_META_FIELDS)
    docs = _apply_filters(docs, status, tag)
    for d in docs:
        d["score"] = occurrences.get(d["id"], 0)
    docs.sort(key=lambda d: (d["score"], d.get("updated_at", "")), reverse=True)
    return docs[:limit]


def _semantic_search(q, status, tag, limit):
    """Cosine similarity over stored embedding side-docs; None = unavailable."""
    qvec, _model = _embed(q)
    if qvec is None:
        return None
    import numpy as np
    qv = np.asarray(qvec, dtype=np.float32)
    sims = {}
    for row in store.find({"type": "embedding"}):
        vec = row.get("vector")
        if vec and len(vec) == len(qvec):
            sims[row["sop_id"]] = float(np.dot(qv, np.asarray(vec, dtype=np.float32)))
    if not sims:
        return []
    docs = store.find({"type": "sop", "_id": {"$in": list(sims)[:2000]}},
                      fields=_META_FIELDS)
    docs = _apply_filters(docs, status, tag)
    for d in docs:
        d["score"] = round(sims.get(d["id"], 0.0), 4)
    docs.sort(key=lambda d: d["score"], reverse=True)
    return docs[:limit]


# ── API index ────────────────────────────────────────────────────────────────

@app.route("/api")
def api_index():
    return jsonify({
        "name": "SOPCS — Standard Operating Procedure Catalog System",
        "version": "0.1.0",
        "endpoints": {
            "docs": "/api/docs?page&per_page&status&tag&sort",
            "doc": "POST/GET/PUT/DELETE /api/docs/<id>",
            "revisions": "GET /api/docs/<id>/revisions",
            "revision": "GET /api/docs/<id>/revisions/<seq>",
            "revision_diff": "GET /api/docs/<id>/revisions/<seq>/diff?against=<seq|latest>",
            "restore": "POST /api/docs/<id>/restore {seq}",
            "search": "/api/search?q&mode=auto|lexical|semantic",
            "reindex": "POST /api/reindex",
            "clusters": "GET/POST /api/clusters",
            "tags": "/api/tags",
            "images": "POST /api/images",
            "image": "GET /api/images/<id>",
            "audit": "/api/audit",
            "overview": "/api/overview",
            "self": "/api/self",
        },
        "search_backend": _search_backend_status(),
    })


# ── the catalog ──────────────────────────────────────────────────────────────

@app.route("/api/docs", methods=["GET"])
def list_docs():
    """The metadata-first catalog: filters, sort, pagination.

    Metadata projection (no bodies) via Mango; filter/sort/pagination run
    on the projected window — the catalog is a browsing surface, the
    token/semantic paths are the search surfaces (personal scale).
    """
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1
    try:
        per_page = min(max(1, int(request.args.get("per_page", PAGE_DEFAULT))), PAGE_MAX)
    except ValueError:
        per_page = PAGE_DEFAULT
    status = request.args.get("status") or None
    tag = request.args.get("tag") or None
    sort = request.args.get("sort", "updated")
    if status and status not in STATUSES:
        return jsonify({"error": f"status must be one of {STATUSES}"}), 400

    docs = _apply_filters(
        store.find({"type": "sop"}, fields=_META_FIELDS, limit=10000),
        status, tag)
    key = {"updated": lambda d: d.get("updated_at", ""),
           "created": lambda d: d.get("created_at", ""),
           "title": lambda d: d.get("title", "").lower()}.get(sort)
    if key is None:
        return jsonify({"error": "sort must be updated|created|title"}), 400
    docs.sort(key=key, reverse=(sort != "title"))

    total = len(docs)
    start = (page - 1) * per_page
    items = docs[start:start + per_page]
    return jsonify({
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": max(1, math.ceil(total / per_page)),
        "has_more": start + len(items) < total,
    })


@app.route("/api/docs", methods=["POST"])
def create_doc():
    body = request.get_json(force=True, silent=True) or {}
    if body.get("id") and store.exists(body["id"]):
        return jsonify({"error": f"sop '{body['id']}' already exists"}), 409
    doc, err = _sop_doc(body)
    if err:
        return jsonify({"error": err}), 400
    doc["revision"] = 1
    store.put(doc)
    _write_revision(doc, 1, comment="initial version")
    _audit("sop.create", "sop", doc["id"], f"created sop '{doc['title']}'")
    _queue_embedding(doc["id"])
    return jsonify(doc), 201


@app.route("/api/docs/<sid>", methods=["GET"])
def get_doc(sid):
    doc = _sop_or_none(sid)
    if not doc:
        return jsonify({"error": "sop not found"}), 404
    return jsonify(doc)


@app.route("/api/docs/<sid>", methods=["PUT"])
def update_doc(sid):
    doc = _sop_or_none(sid)
    if not doc:
        return jsonify({"error": "sop not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    updated, err = _sop_doc(body, existing=doc)
    if err:
        return jsonify({"error": err}), 400
    changed = any(updated.get(k) != doc.get(k)
                  for k in ("body", "title", "summary", "tags", "status"))
    comment = str(body.get("comment") or "")
    if changed:
        seq = _next_seq(sid)
        updated["revision"] = seq
        store.put(updated)
        _write_revision(updated, seq, comment=comment)
        _audit("sop.update", "sop", sid,
               f"updated sop '{updated['title']}' (rev {seq})",
               details={"revision": seq, "comment": comment or None})
        _queue_embedding(sid)
    else:
        updated["revision"] = doc.get("revision", 0)
        store.put(updated)
        _audit("sop.update", "sop", sid,
               f"updated sop '{updated['title']}' (no content change)")
    return jsonify(updated)


@app.route("/api/docs/<sid>", methods=["DELETE"])
def delete_doc(sid):
    """Full delete: the doc, its revisions, and its embedding. The audit
    trail (and its record of this deletion) is kept."""
    doc = _sop_or_none(sid)
    if not doc:
        return jsonify({"error": "sop not found"}), 404
    revs = _revisions(sid)
    store.delete(sid)
    for rev in revs:
        store.delete(rev["id"])
    store.delete(f"embed-{sid}")   # embedding side-doc; attachments die with the doc
    _audit("sop.delete", "sop", sid, f"deleted sop '{doc['title']}' "
           f"({len(revs)} revisions purged)",
           details={"revisions_purged": len(revs)})
    return jsonify({"ok": True, "deleted": sid, "revisions_purged": len(revs)})


# ── revisions: history, diff, restore ────────────────────────────────────────

@app.route("/api/docs/<sid>/revisions", methods=["GET"])
def list_revisions(sid):
    """The version history of one SOP, newest first (snapshots excluded)."""
    if not _sop_or_none(sid):
        return jsonify({"error": "sop not found"}), 404
    return jsonify(_revisions(sid))


@app.route("/api/docs/<sid>/revisions/<int:seq>", methods=["GET"])
def get_revision(sid, seq):
    rev = _revision_or_none(sid, seq)
    if not rev:
        return jsonify({"error": "revision not found"}), 404
    return jsonify(rev)


@app.route("/api/docs/<sid>/revisions/<int:seq>/diff", methods=["GET"])
def diff_revision(sid, seq):
    """Unified diff centered on revision ``seq`` (older → newer, so
    additions render as ``+``): default compares its predecessor to
    ``seq`` (rev 1 diffs against empty); ``?against=latest`` compares
    ``seq`` to the current doc; ``?against=<seq>`` compares the two,
    chronologically ordered."""
    rev = _revision_or_none(sid, seq)
    if not rev:
        return jsonify({"error": "revision not found"}), 404
    against = request.args.get("against", "previous")

    if against == "latest":
        doc = _sop_or_none(sid)
        if not doc:
            return jsonify({"error": "sop not found"}), 404
        from_doc, from_seq, from_label = rev["snapshot"], seq, f"rev {seq}"
        to_doc, to_seq, to_label = doc, doc.get("revision", seq), "current"
    else:
        other = seq - 1 if against == "previous" else int(against)
        older, newer = min(seq, other), max(seq, other)
        if older < 1:
            from_doc, from_seq, from_label = {}, 0, "empty"
        else:
            prior = _revision_or_none(sid, older)
            if not prior:
                return jsonify({"error": f"revision {older} not found"}), 404
            from_doc, from_seq, from_label = prior["snapshot"], older, f"rev {older}"
        to_doc, to_seq, to_label = rev["snapshot"], newer, f"rev {newer}"

    def _lines(text):
        # keepends, with a guaranteed trailing newline so a final line
        # without one cannot fuse a '-' hunk line with the following '+'
        return [l if l.endswith("\n") else l + "\n"
                for l in str(text or "").splitlines(keepends=True)]

    diff = "".join(difflib.unified_diff(
        _lines(from_doc.get("body")), _lines(to_doc.get("body")),
        fromfile=f"{from_label} — {(from_doc.get('title') or sid)}",
        tofile=f"{to_label} — {(to_doc.get('title') or sid)}"))
    return jsonify({
        "sop_id": sid,
        "seq": seq,
        "from_seq": from_seq,
        "to_seq": to_seq,
        "from_label": from_label,
        "to_label": to_label,
        "changed": bool(diff),
        "diff": diff,
    })


@app.route("/api/docs/<sid>/restore", methods=["POST"])
def restore_revision(sid):
    """Restore an old version — forward-only: the snapshot's content
    becomes a NEW revision, so history is never rewritten."""
    doc = _sop_or_none(sid)
    if not doc:
        return jsonify({"error": "sop not found"}), 404
    body = request.get_json(force=True, silent=True) or {}
    try:
        seq = int(body.get("seq"))
    except (TypeError, ValueError):
        return jsonify({"error": "seq must be an integer"}), 400
    rev = _revision_or_none(sid, seq)
    if not rev:
        return jsonify({"error": f"revision {seq} not found"}), 404
    snap = rev.get("snapshot") or {}
    updated, err = _sop_doc({
        "title": snap.get("title"),
        "summary": snap.get("summary"),
        "tags": snap.get("tags"),
        "status": snap.get("status"),
        "body": snap.get("body"),
    }, existing=doc)
    if err:
        return jsonify({"error": f"snapshot unusable: {err}"}), 409
    new_seq = _next_seq(sid)
    updated["revision"] = new_seq
    store.put(updated)
    _write_revision(updated, new_seq,
                    comment=str(body.get("comment") or f"restored revision {seq}"))
    _audit("sop.restore", "sop", sid,
           f"restored '{doc['title']}' to revision {seq} (now rev {new_seq})",
           details={"restored_seq": seq, "revision": new_seq})
    _queue_embedding(sid)
    return jsonify(updated)


# ── search ───────────────────────────────────────────────────────────────────

@app.route("/api/search", methods=["GET"])
def api_search():
    """Full-text (lexical) and semantic search over the catalog.

    ``mode=lexical``  token-view search (always available).
    ``mode=semantic`` embeddings cosine similarity (501 when fastembed is
                      absent — install fastembed and POST /api/reindex).
    ``mode=auto``     semantic when available, lexical otherwise.
    Empty ``q`` returns the most recently updated SOPs.
    """
    q = (request.args.get("q") or "").strip()
    mode = (request.args.get("mode") or "auto").lower()
    status = request.args.get("status") or None
    tag = request.args.get("tag") or None
    if mode not in ("auto", "lexical", "semantic"):
        return jsonify({"error": "mode must be auto|lexical|semantic"}), 400
    if status and status not in STATUSES:
        return jsonify({"error": f"status must be one of {STATUSES}"}), 400
    try:
        limit = min(max(1, int(request.args.get("limit") or 20)), 100)
    except ValueError:
        limit = 20

    backend = _search_backend_status()
    used = mode
    if not q:
        items = _apply_filters(
            store.find({"type": "sop"}, fields=_META_FIELDS, limit=10000),
            status, tag)
        items.sort(key=lambda d: d.get("updated_at", ""), reverse=True)
        items = items[:limit]
    elif mode == "lexical" or (mode == "auto" and not backend["available"]):
        used = "lexical"
        items = _lexical_search(q, status, tag, limit)
    else:
        items = _semantic_search(q, status, tag, limit)
        if items is None:
            if mode == "semantic":
                return jsonify({
                    "error": "semantic search unavailable — fastembed is not "
                             "installed (lexical search remains available)",
                    "backend": backend,
                }), 501
            used = "lexical"
            items = _lexical_search(q, status, tag, limit)

    return jsonify({"mode": used, "backend": backend, "q": q,
                    "items": items, "total": len(items)})


@app.route("/api/reindex", methods=["POST"])
def api_reindex():
    """Recompute embeddings for every SOP (synchronous)."""
    if _get_embedder() is None:
        return jsonify({
            "error": "embeddings unavailable — install fastembed "
                     "(env/bin/pip install fastembed) to enable semantic search",
            "backend": _search_backend_status(),
        }), 501
    docs = store.find({"type": "sop"})
    for doc in docs:
        vector, model = _embed(_embed_text_for(doc))
        if vector is not None:
            _store_embedding(doc["id"], vector, model)
    _audit("sop.reindex", "sop", "*", f"recomputed embeddings ({len(docs)} sops)")
    clusters = _recompute_clusters(audit=False)   # keep the map fresh
    return jsonify({"ok": True, "indexed": len(docs), "model": _MODEL_NAME,
                    "backend": _search_backend_status(),
                    "clusters": clusters.get("meta")})


# ── semantic clusters (the dashboard topic graph) ────────────────────────────

_CLUSTER_DOC_ID = "CLUSTERS-current"


def _recompute_clusters(audit=True):
    """Compute + store the cluster map; returns the result payload."""
    sops = store.find({"type": "sop"})
    embeddings = {d["sop_id"]: d["vector"]
                  for d in store.find({"type": "embedding"}) if d.get("vector")}
    result = clustering.compute(sops, embeddings)
    if result["meta"].get("backend") != "none":
        doc = {"id": _CLUSTER_DOC_ID, "type": "clustermap",
               "updated_at": _now(), **result}
        store.put(doc)
        if audit:
            meta = result["meta"]
            _audit("sop.cluster", "sop", "*",
                   f"computed clusters ({meta['backend']}, k={meta['k']}, n={meta['n']})")
    return result


@app.route("/api/clusters", methods=["GET"])
def get_clusters():
    """The current cluster map (batch-computed; never on read)."""
    doc = store.get(_CLUSTER_DOC_ID)
    if not doc or doc.get("type") != "clustermap":
        return jsonify({"assignments": {}, "edges": [],
                        "meta": {"backend": "none", "n": 0,
                                 "reason": "not computed yet — POST /api/clusters"}})
    return jsonify({k: doc[k] for k in ("assignments", "edges", "meta", "updated_at")})


@app.route("/api/clusters", methods=["POST"])
def api_compute_clusters():
    """Recompute the cluster map (embeddings primary, TF-IDF fallback)."""
    result = _recompute_clusters()
    if result["meta"].get("backend") == "none":
        return jsonify(result), 501
    return jsonify(store.get(_CLUSTER_DOC_ID))


@app.route("/api/tags", methods=["GET"])
def api_tags():
    """Tag facets with document counts (small aggregation, personal scale)."""
    counts = {}
    for doc in store.find({"type": "sop"}, fields=["tags"]):
        for tag in doc.get("tags") or []:
            counts[tag] = counts.get(tag, 0) + 1
    tags = [{"tag": t, "count": c} for t, c in sorted(counts.items(),
                                                      key=lambda kv: (-kv[1], kv[0]))]
    return jsonify(tags)


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


# ── supporting figures: image uploads as CouchDB attachments ────────────────

@app.route("/api/images", methods=["POST"])
def upload_image():
    """Store an uploaded image as a CouchDB attachment; returns the
    markdown snippet (a relative URL, valid under any mount point)."""
    f = request.files.get("file")
    if f is None or not f.filename:
        return jsonify({"error": "multipart field 'file' is required"}), 400
    ctype = (f.mimetype or "").split(";")[0].strip().lower()
    if ctype not in IMG_TYPES:
        return jsonify({"error": "unsupported image type "
                                 "(png, jpeg, gif, webp)"}), 415
    data = f.read()
    if not data:
        return jsonify({"error": "empty upload"}), 400
    if len(data) > IMG_MAX_BYTES:
        return jsonify({"error": "image exceeds 10 MiB"}), 413

    img_id = "img-" + uuid.uuid4().hex[:12]
    filename = img_id + IMG_TYPES[ctype]
    store.put({"id": img_id, "type": "image", "filename": filename,
               "original": os.path.basename(f.filename), "content_type": ctype,
               "size": len(data), "created_at": _now()})
    store.put_attachment(img_id, filename, data, ctype)
    _audit("image.upload", "image", img_id,
           f"uploaded {filename} ({len(data)} bytes, {ctype})")

    base = re.sub(r"\.[a-z0-9]+$", "", os.path.basename(f.filename),
                  flags=re.IGNORECASE)[:80] or "figure"
    alt = re.sub(r"[\"'()\[\]]", "", base)
    url = f"api/images/{img_id}"
    return jsonify({"id": img_id, "filename": filename, "content_type": ctype,
                    "size": len(data), "url": url,
                    "markdown": f"![{alt}]({url})"}), 201


@app.route("/api/images/<img_id>", methods=["GET"])
def get_image(img_id):
    doc = store.get(img_id)
    if not doc or doc.get("type") != "image":
        return jsonify({"error": "image not found"}), 404
    data = store.get_attachment(img_id, doc["filename"])
    if data is None:
        return jsonify({"error": "image attachment missing"}), 404
    resp = Response(data, mimetype=doc["content_type"])
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


# ── overview (the dashboard's payload) ───────────────────────────────────────

@app.route("/api/overview", methods=["GET"])
def api_overview():
    """One payload for the dashboard: catalog shape, review candidates,
    recent activity, and the retrieval stack's health."""
    sops = store.find({"type": "sop"},
                      fields=["id", "title", "summary", "tags", "status",
                              "words", "reading_minutes", "revision",
                              "created_at", "updated_at"], limit=10000)
    by_status = {s: 0 for s in STATUSES}
    words = 0
    for d in sops:
        by_status[d.get("status", "draft")] = by_status.get(d.get("status", "draft"), 0) + 1
        words += d.get("words") or 0
    sops.sort(key=lambda d: d.get("updated_at", ""), reverse=True)

    tag_counts = {}
    for d in sops:
        for tag in d.get("tags") or []:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    top_tags = [{"tag": t, "count": c} for t, c in
                sorted(tag_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:12]]

    cutoff = (datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)).isoformat().replace("+00:00", "Z")
    stale = sorted((d for d in sops
                    if d.get("status") == "active" and d.get("updated_at", "") < cutoff),
                   key=lambda d: d.get("updated_at", ""))

    revs = store.find({"type": "revision"},
                      fields=["sop_id", "seq", "title", "comment", "words",
                              "created_at"], limit=10000)
    revs.sort(key=lambda r: (r.get("created_at", ""), r.get("sop_id")), reverse=True)

    # 30-day edit activity (revisions per day, oldest → newest)
    today = datetime.now(timezone.utc).date()
    per_day = {}
    for r in revs:
        try:
            day = datetime.fromisoformat(str(r.get("created_at")).replace("Z", "+00:00")).date()
        except ValueError:
            continue
        per_day[day.isoformat()] = per_day.get(day.isoformat(), 0) + 1
    activity = [{"day": (today - timedelta(days=29 - i)).isoformat(),
                 "count": per_day.get((today - timedelta(days=29 - i)).isoformat(), 0)}
                for i in range(30)]

    n_embeddings = len(store.find({"type": "embedding"}, fields=["id"], limit=10000))
    n_images = len(store.find({"type": "image"}, fields=["id"], limit=10000))

    return jsonify({
        "generated_at": _now(),
        "catalog": {"sops": len(sops), "by_status": by_status,
                    "words": words,
                    "reading_minutes": max(1, math.ceil(words / WPM)) if words else 0},
        "top_tags": top_tags,
        "recent": sops[:8],
        "stale_active": stale[:8],
        "stale_days": STALE_DAYS,
        "revisions": {"total": len(revs), "recent": revs[:10]},
        "activity": activity,
        "figures": n_images,
        "retrieval": {"embeddings": {"indexed": n_embeddings, "sops": len(sops),
                                     "lag": max(0, len(sops) - n_embeddings),
                                     "backend": _search_backend_status()}},
    })


# ── self monitoring ──────────────────────────────────────────────────────────

@app.route("/api/self", methods=["GET"])
def self_monitor():
    type_counts = {}
    for t in ("sop", "embedding", "image", "audit"):
        type_counts[t] = len(store.find({"type": t}))
    by_status = {}
    for doc in store.find({"type": "sop"}, fields=["status"]):
        by_status[doc.get("status", "?")] = by_status.get(doc.get("status", "?"), 0) + 1
    words = sum(d.get("words") or 0 for d in store.find({"type": "sop"},
                                                        fields=["words"]))
    return jsonify({
        "generated_at": _now(),
        "uptime_s": int(time.time() - BOOTED_AT),
        "store": {"db": store.db_name, "docs": type_counts},
        "catalog": {"sops": type_counts.get("sop", 0), "by_status": by_status,
                    "words": words, "reading_minutes": max(1, math.ceil(words / WPM))
                    if words else 0},
        "images": type_counts.get("image", 0),
        "embeddings": {"indexed": type_counts.get("embedding", 0),
                       "backend": _search_backend_status()},
    })


# ── plate ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    port = int(os.environ.get("SOPCS_PORT", "5016"))
    print("SOPCS — Standard Operating Procedure Catalog System")
    st = _search_backend_status()
    print(f"   search: lexical + semantic ({'available' if st['available'] else st['reason']})")
    print(f"   Open: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
