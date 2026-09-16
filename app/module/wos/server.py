"""World Observation System (WOS) — API Server.

A perception sub-system that collects what *other agents* say about the world
from free public feeds (Nitter/X, Hacker News, Lobsters, Reddit, Mastodon,
GDELT, arXiv, …) and persists each item in CouchDB (db ``wos``) as an
``observational`` event — the AGS `observational` event-type defined as
"a reading the agent actively takes".

Two document kinds live in the same store, discriminated by ``doc_type``:

* ``observation``  — one collected item (written by ``/api/ingest`` or poll)
* ``state``        — per-source poll cursor (last fetched/observed, last error)

The watched sources are plain poll specs (``source`` + ``query``) loaded at
startup from ``config/seed.json`` — topic assignment does **not** happen at
collection time; it belongs to the downstream processing pipeline.

The :mod:`wos.collector` daemon is a separate process that drives polling via
this HTTP API, so only the server process touches CouchDB.

Mounted under ``/wos/`` by the unified dispatcher (``app.py``).

Run:   python3 app.py                       (unified dispatcher, port 8080)
       python3 wos/collector.py            (poller daemon — second terminal)
Open:  http://localhost:8080/wos/
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from support.storage import Store, StoreError

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wos import analytics, clustering
from wos.sources import SOURCE_META, SOURCE_REGISTRY
from wos.sources.base import now_ms, obs_id

app = Flask(__name__, static_folder="static")
_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
# Seed file — the desired set of poll specs (spec/wos/policy.md). Resolution:
# WOS_SOURCES_FILE env override > the module's ``config/seed.json``. It is
# read directly at startup (and re-read on /api/sources) — sources are NOT
# stored as CouchDB documents.
SEED_PATH = os.environ.get("WOS_SOURCES_FILE") or os.path.join(
    os.path.dirname(__file__), "config", "seed.json")


def _load_seed() -> dict:
    try:
        with open(SEED_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict):
            data.setdefault("settings", {})
            data.setdefault("sources", [])
            return data
        return {"settings": {}, "sources": data}   # legacy bare list
    except (OSError, ValueError) as exc:
        print(f"[wos] warning: cannot read seed file {SEED_PATH}: {exc}")
        return {"settings": {}, "sources": []}


SEED = _load_seed()
_configured = SEED.get("settings", {}).get("nitter_instances")
if _configured:
    os.environ.setdefault("WOS_NITTER_INSTANCES", ",".join(_configured))

with open(os.path.join(_DATA_DIR, "vader.json"), "r", encoding="utf-8") as _fh:
    VADER = json.load(_fh)
with open(os.path.join(_DATA_DIR, "stopwords-en.json"), "r", encoding="utf-8") as _fh:
    STOPWORDS = json.load(_fh)
store = Store("wos")
CLUSTERS_DOC_ID = "CLUSTERS-current"

# ── search: the DB-resident query layer ──────────────────────────────────────
# The design doc + Mango indexes below ARE the initializer documents of
# search: they are created idempotently at startup, and every /api/search
# query then executes inside CouchDB (views / Mango), never as a Python
# full-scan. See spec/wos/collection.md and spec/wos/automation.md.
_SEARCH_DDOC = "wos-search"
_SEARCH_VIEWS = {
    # newest-first reads: startkey=[<upper>], endkey=[<lower>], descending
    "by_time": ("function(doc){if(doc.doc_type!=='observation'||!doc.observed_at_ms)return;"
                "emit([doc.observed_at_ms],null);}"),
    "by_source": ("function(doc){if(doc.doc_type!=='observation'||!doc.source||!doc.observed_at_ms)return;"
                  "emit([doc.source,doc.observed_at_ms],null);}"),
    # token search: normalized words of title+body+author → [token, time]
    "token": ("function(doc){if(doc.doc_type!=='observation')return;"
              "var txt=((doc.title||'')+' '+(doc.body||'')+' '+(doc.author||'')).toLowerCase();"
              "var m=txt.match(/[a-z0-9_]{2,}/g);if(!m)return;"
              "for(var i=0;i<m.length;i++)emit([m[i],doc.observed_at_ms||0],null);}"),
}
_SEARCH_INDEXES = [
    {"name": "obs-time", "fields": ["doc_type", "observed_at_ms"]},
    {"name": "obs-source", "fields": ["doc_type", "source", "observed_at_ms"]},
]


def _ensure_search_layer() -> None:
    """Idempotently create the search ddoc + Mango indexes (the initializers)."""
    try:
        for name, map_fun in _SEARCH_VIEWS.items():
            store.ensure_view(_SEARCH_DDOC, name, map_fun)
        store.ensure_indexes(_SEARCH_INDEXES)
    except Exception as exc:  # pragma: no cover - CouchDB version quirks
        print(f"[wos] warning: could not ensure search layer: {exc}")


_ensure_search_layer()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _state_doc_id(source_id: str) -> str:
    return f"STATE-{source_id}"


def _specs() -> list[dict]:
    """The configured poll specs, re-read from the seed file each call."""
    return [s for s in _load_seed().get("sources", []) if s.get("source")]


def _spec(source_id: str) -> dict | None:
    for s in _specs():
        if s.get("id") == source_id:
            return s
    return None


def _write_observations(docs: list[dict]) -> tuple[int, int]:
    """Persist observation docs, merging duplicate items (keep richer body).

    Returns ``(newly_written, merged_into_existing)``.
    """
    written = merged = 0
    for d in docs:
        doc_id = d.get("id") or obs_id(d["source"], d["native_id"])
        existing = store.get(doc_id)
        if existing:
            # keep the richer body / a missing title
            if d.get("body") and len(d["body"]) > len(existing.get("body") or ""):
                existing["body"] = d["body"]
            if d.get("title") and not existing.get("title"):
                existing["title"] = d["title"]
            store.put(existing)
            merged += 1
        else:
            d = dict(d)
            d["id"] = doc_id
            d["doc_type"] = "observation"
            d["event_type"] = "observational"
            store.put(d)
            written += 1
    return written, merged


# ── health & catalogue ───────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    try:
        return jsonify({
            "ok": True,
            "db": store.db_name,
            "docs": store.count(),
            "sources": [s["name"] for s in SOURCE_META],
        })
    except StoreError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 503


@app.route("/api/source-types")
def source_types():
    """The available source *kinds* (adapters) and their default intervals."""
    return jsonify(SOURCE_META)


# ── sources: the configured poll specs (file-managed, read-only here) ────────
@app.route("/api/sources", methods=["GET"])
def get_sources():
    specs = _specs()
    if request.args.get("enabled") in ("1", "true", "True"):
        specs = [s for s in specs if s.get("enabled", True)]
    specs.sort(key=lambda s: (s.get("source", ""), s.get("id", "")))
    return jsonify(specs)


@app.route("/api/sources/status", methods=["GET"])
def sources_status():
    """Per-spec status: poll cursors + health, and observation counts per
    adapter type.

    One pass over the store joins the seed specs with their ``state`` cursor
    docs; per-spec observation counts are not derivable (docs carry only the
    adapter name), so counts are reported per type in ``per_type``. Health
    derives from the cursor alone:

    * ``failing``  — the last poll errored (``last_error``/``error_count``)
    * ``pending``  — never fetched (no cursor yet)
    * ``degraded`` — fetched, but the last fetch is older than 24h
    * ``healthy``  — otherwise
    """
    specs = _specs()
    counts: dict[str, int] = {}
    counts_24h: dict[str, int] = {}
    total_obs = 0
    total_obs_24h = 0
    states: dict[str, dict] = {}
    cut_24h = now_ms() - 24 * 3_600_000
    for d in store.all():
        if d.get("doc_type") == "observation":
            src = d.get("source", "?")
            counts[src] = counts.get(src, 0) + 1
            total_obs += 1
            if (d.get("observed_at_ms") or 0) >= cut_24h:
                counts_24h[src] = counts_24h.get(src, 0) + 1
                total_obs_24h += 1
        elif d.get("doc_type") == "state" and d.get("source_id"):
            states[d["source_id"]] = d

    now = now_ms()
    stale_ms = 24 * 3_600_000
    tallies = {"healthy": 0, "degraded": 0, "failing": 0, "pending": 0}
    out = []
    for s in specs:
        st = states.get(s.get("id", "")) or {}
        errored = bool(st.get("last_error")) or (st.get("error_count") or 0) > 0
        last_fetched = st.get("last_fetched_ms") or 0
        if errored:
            health = "failing"
        elif not last_fetched:
            health = "pending"
        elif now - last_fetched > stale_ms:
            health = "degraded"
        else:
            health = "healthy"
        tallies[health] += 1
        out.append({
            "id": s.get("id"),
            "source": s.get("source"),
            "query": s.get("query"),
            "enabled": s.get("enabled", True),
            "interval_s": s.get("interval_s", 0),
            "last_fetched_ms": last_fetched or None,
            "last_observed_ms": st.get("last_observed_ms"),
            "last_error": st.get("last_error"),
            "error_count": st.get("error_count", 0),
            "health": health,
        })

    per_type = [
        {"type": t,
         "specs": sum(1 for s in specs if s.get("source") == t),
         "observations": counts.get(t, 0),
         "observations_24h": counts_24h.get(t, 0)}
        for t in sorted({s.get("source", "?") for s in specs})
    ]
    return jsonify({
        "generated_at": now_iso(),
        "totals": {"specs": len(specs),
                   "enabled": sum(1 for s in specs if s.get("enabled", True)),
                   "observations": total_obs,
                   "observations_24h": total_obs_24h,
                   **tallies},
        "per_type": per_type,
        "sources": out,
    })


# ── observations: read ───────────────────────────────────────────────────────
@app.route("/api/observations", methods=["GET"])
def get_observations():
    source = request.args.get("source")
    cluster = request.args.get("cluster")
    since_ms = request.args.get("since_ms")
    q = request.args.get("q", "").lower().strip()
    try:
        limit = min(int(request.args.get("limit") or 200), 1000)
    except ValueError:
        limit = 200

    docs = [d for d in store.all() if d.get("doc_type") == "observation"]
    if source:
        docs = [d for d in docs if d.get("source") == source]
    if cluster:
        cmap = _clusters_doc().get("assignments", {})
        docs = [d for d in docs
                if (cmap.get(d.get("id"), {}).get("cluster_id") == cluster)]
    if since_ms:
        try:
            cut = int(since_ms)
            docs = [d for d in docs if (d.get("observed_at_ms") or 0) >= cut]
        except ValueError:
            pass
    if q:
        docs = [d for d in docs
                if q in (d.get("title", "") + d.get("body", "")
                         + d.get("author", "")).lower()]
    docs.sort(key=lambda d: d.get("observed_at_ms") or 0, reverse=True)
    return jsonify(docs[:limit])


# ── search: queries execute inside CouchDB (views + Mango) ───────────────────
def _tokenize(q: str) -> list[str]:
    """Match the ddoc ``token`` view: lowercase words, length ≥ 2."""
    return re.findall(r"[a-z0-9_]{2,}", (q or "").lower())


def _search_structured(source, since_ms, sort) -> list[dict]:
    """Windowed newest-first docs straight from the ddoc views (no q).

    Fetches the bounded window (≤1000) so sort/offset/paging compose
    uniformly; CouchDB serves this from the view in one round-trip.
    """
    since = since_ms or 0
    if source:
        rows = store.query_view(_SEARCH_DDOC, "by_source", include_docs=True,
                                startkey=[source, {}], endkey=[source, since],
                                descending=True, limit=1000)
    else:
        rows = store.query_view(_SEARCH_DDOC, "by_time", include_docs=True,
                                startkey=[{}], endkey=[since],
                                descending=True, limit=1000)
    docs = [r["doc"] for r in rows if r.get("doc")]
    if sort == "score":
        docs.sort(key=lambda d: (d.get("score") or 0,
                                 d.get("observed_at_ms") or 0), reverse=True)
    return docs


def _search_q(q, source, since_ms, sort) -> list[dict]:
    """Token search: prefix ranges per token, AND-composed, ranked."""
    tokens = _tokenize(q)
    if not tokens:
        return []
    scores: dict[str, int] = {}
    latest: dict[str, int] = {}
    for tok in tokens:
        rows = store.query_view(_SEARCH_DDOC, "token",
                                startkey=[tok], endkey=[tok + "\uffff"],
                                limit=2000)
        for r in rows:
            obs_ms = r["key"][1] or 0
            if since_ms and obs_ms < since_ms:
                continue
            oid = r["id"]
            scores[oid] = scores.get(oid, 0) + 1
            if obs_ms > latest.get(oid, 0):
                latest[oid] = obs_ms
    # AND semantics: a doc must match every token (prefix-wise).
    cand = [oid for oid, s in scores.items() if s == len(tokens)]
    if not cand:
        return []
    cand.sort(key=lambda oid: (scores[oid], latest.get(oid, 0)), reverse=True)
    selector: dict = {"_id": {"$in": cand[:1000]}}
    if source:
        selector["source"] = source
    if since_ms:
        selector["observed_at_ms"] = {"$gte": since_ms}
    docs = store.find(selector, limit=1000)
    if sort == "score":
        docs.sort(key=lambda d: (d.get("score") or 0,
                                 d.get("observed_at_ms") or 0), reverse=True)
    else:
        docs = sorted(docs,
                      key=lambda d: (scores.get(d["id"], 0),
                                     d.get("observed_at_ms") or 0),
                      reverse=True)
    return docs


@app.route("/api/search", methods=["GET"])
def api_search():
    """Search observations directly in CouchDB, paginated.

    Structured filters (source/since_ms) run as ddoc-view ranges; ``q``
    runs as token prefix lookups composed with Mango. Response envelope:
    ``{"items": [...], "has_more": bool, "offset": int, "page": int,
    "total": int}`` — ``total`` is the size of the bounded query window, not
    a full-corpus count. ``q`` terms shorter than 2 chars (or non-latin)
    fall back to a window-local substring filter, matching legacy behavior.
    """
    source = request.args.get("source")
    cluster = request.args.get("cluster")
    since_ms = request.args.get("since_ms")
    sort = request.args.get("sort", "recent")
    q = request.args.get("q", "").lower().strip()
    try:
        limit = min(int(request.args.get("limit") or 200), 1000)
    except ValueError:
        limit = 200
    try:
        offset = max(int(request.args.get("offset") or 0), 0)
    except ValueError:
        offset = 0
    since = None
    if since_ms:
        try:
            since = int(since_ms)
        except ValueError:
            since = None

    if _tokenize(q):
        docs = _search_q(q, source, since, sort)
    else:
        docs = _search_structured(source, since, sort)
        if q:  # no usable tokens → legacy substring over the fetched window
            docs = [d for d in docs
                    if q in (d.get("title", "") + d.get("body", "")
                             + d.get("author", "")).lower()]

    if cluster:
        cmap = _clusters_doc().get("assignments", {})
        docs = [d for d in docs
                if cmap.get(d.get("id"), {}).get("cluster_id") == cluster]

    items = docs[offset:offset + limit]
    return jsonify({
        "items": items,
        "has_more": (offset + len(items)) < len(docs),
        "offset": offset,
        "page": (offset // limit) + 1 if limit else 1,
        "total": len(docs),
    })


# ── observations: write (collector -> store) ─────────────────────────────────
@app.route("/api/ingest", methods=["POST"])
def ingest():
    data = request.get_json(silent=True) or {}
    observations = data.get("observations")
    if not isinstance(observations, list):
        return jsonify({"error": "body must contain an observations[] array"}), 400
    written, merged = _write_observations(observations)
    return jsonify({"written": written, "merged": merged,
                    "total": len(observations)}), 202


# ── poll cursors ─────────────────────────────────────────────────────────────
@app.route("/api/state", methods=["GET"])
def get_state():
    states = [d for d in store.all() if d.get("doc_type") == "state"]
    source_id = request.args.get("source_id")
    if source_id:
        states = [s for s in states if s.get("source_id") == source_id]
    return jsonify(states)


@app.route("/api/state", methods=["POST"])
def upsert_state():
    data = request.get_json(silent=True) or {}
    source_id = data.get("source_id")
    if not source_id:
        return jsonify({"error": "source_id required"}), 400
    doc_id = _state_doc_id(source_id)
    doc = store.get(doc_id) or {
        "id": doc_id, "doc_type": "state", "source_id": source_id,
    }
    for key in ("last_fetched_ms", "last_observed_ms", "last_error",
                "error_count", "fetched_count"):
        if key in data:
            doc[key] = data[key]
    store.put(doc)
    return jsonify(store.get(doc_id)), 202


# ── on-demand / daemon-driven poll ───────────────────────────────────────────
def poll_one(spec: dict) -> dict:
    """Poll a single configured source spec now; write observations + update
    its state cursor.

    Honours the per-spec interval (returns ``skipped`` when not yet due) so a
    daemon can simply call this for every enabled spec each sweep.
    """
    source_id = spec.get("id") or ""
    src = SOURCE_REGISTRY.get(spec.get("source") or "")
    if src is None:
        return {"id": source_id, "error": f"unknown source '{spec.get('source')}'"}

    interval = int(spec.get("interval_s") or 0) or src.default_interval_s
    state_id = _state_doc_id(source_id)
    state = store.get(state_id) or {
        "id": state_id, "doc_type": "state", "source_id": source_id,
    }
    cur_ms = now_ms()
    last_fetched = state.get("last_fetched_ms") or 0
    if cur_ms - last_fetched < interval * 1000:
        return {"id": source_id, "source": spec.get("source"),
                "skipped": "not due",
                "next_in_s": max(0, interval - (cur_ms - last_fetched) // 1000)}

    since_ms = state.get("last_observed_ms") or None
    try:
        observations = src.poll(spec.get("query") or "", since_ms)
    except Exception as exc:  # transport / parse error → record + back off
        state["last_fetched_ms"] = cur_ms
        state["last_error"] = str(exc)
        state["error_count"] = (state.get("error_count") or 0) + 1
        store.put(state)
        return {"id": source_id, "source": spec.get("source"),
                "error": str(exc)}

    docs = [ob.to_doc() for ob in observations]
    written, merged = _write_observations(docs)

    max_obs = state.get("last_observed_ms") or 0
    for d in docs:
        if (d.get("observed_at_ms") or 0) > max_obs:
            max_obs = d["observed_at_ms"]
    state["last_fetched_ms"] = cur_ms
    state["last_error"] = None
    state["error_count"] = 0
    state["fetched_count"] = (state.get("fetched_count") or 0) + 1
    if max_obs:
        state["last_observed_ms"] = max_obs
    store.put(state)
    return {"id": source_id, "source": spec.get("source"),
            "fetched": len(docs), "written": written, "merged": merged}


@app.route("/api/poll", methods=["POST"])
def poll():
    """Poll a single configured source spec. Body: ``{"id": "...", "force":
    false}``.

    ``force`` bypasses the interval gate by zeroing the cursor's
    ``last_fetched_ms`` for this one call.
    """
    data = request.get_json(silent=True) or {}
    source_id = data.get("id")
    spec = _spec(source_id) if source_id else None
    if not spec:
        return jsonify({"error": "source not found", "id": source_id}), 404
    if data.get("force"):
        state_id = _state_doc_id(source_id)
        state = store.get(state_id)
        if state:
            state["last_fetched_ms"] = 0
            store.put(state)
    return jsonify(poll_one(spec))


# ── clusters: batch semantic clustering ───────────────────────────────────────
def _clusters_doc() -> dict:
    return store.get(CLUSTERS_DOC_ID) or {
        "id": CLUSTERS_DOC_ID, "doc_type": "clusters",
        "assignments": {}, "meta": {"backend": "none", "k": 0, "updated_at_ms": 0},
    }


@app.route("/api/clusters", methods=["GET"])
def get_clusters():
    cd = _clusters_doc()
    return jsonify({"meta": cd.get("meta", {}),
                    "k": len({a.get("cluster_id") for a in cd.get("assignments", {}).values()}),
                    "assignments": cd.get("assignments", {})})


@app.route("/api/cluster", methods=["POST"])
def recompute_clusters():
    """Recompute semantic clusters over the whole corpus (batch; may take a few
    seconds the first time while the embedding model downloads)."""
    k = request.get_json(silent=True) or {}
    obs = [d for d in store.all() if d.get("doc_type") == "observation"]
    result = clustering.compute_clusters(obs, k=k.get("k"))
    doc = {
        "id": CLUSTERS_DOC_ID, "doc_type": "clusters",
        "assignments": result["assignments"], "meta": result["meta"],
    }
    store.put(doc)
    return jsonify({"ok": True, **result["meta"],
                    "assigned": len(result["assignments"])}), 202


# ── analytics: the sense-making blob ─────────────────────────────────────────
@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    obs = [d for d in store.all() if d.get("doc_type") == "observation"]
    # time window
    try:
        window_h = float(request.args.get("hours", "0"))
    except ValueError:
        window_h = 0
    if window_h > 0:
        cut = now_ms() - int(window_h * 3_600_000)
        obs = [o for o in obs if (o.get("observed_at_ms") or 0) >= cut]
    assignments = _clusters_doc().get("assignments", {})
    blob = analytics.compute(obs, VADER, cluster_assignments=assignments)
    return jsonify(blob)


@app.route("/api/lexicon", methods=["GET"])
def get_lexicon():
    """Stopwords + VADER lexicon (single source of truth, served to the browser)."""
    return jsonify({"stopwords": STOPWORDS, "vader": VADER})


# ── dashboard ────────────────────────────────────────────────────────────────
@app.route("/api/dashboard/stats")
def stats():
    docs = store.all()
    obs = [d for d in docs if d.get("doc_type") == "observation"]
    specs = _specs()
    by_source: dict[str, int] = {}
    for o in obs:
        by_source[o.get("source", "?")] = by_source.get(o.get("source", "?"), 0) + 1
    latest = max((o.get("observed_at_ms") or 0) for o in obs) if obs else 0
    return jsonify({
        "observations": len(obs),
        "sources": len(specs),
        "sources_enabled": sum(1 for s in specs if s.get("enabled", True)),
        "by_source": by_source,
        "latest_observed_ms": latest,
    })


@app.route("/api/export", methods=["GET"])
def export_data():
    docs = store.all()
    obs = [d for d in docs if d.get("doc_type") == "observation"]
    obs.sort(key=lambda d: d.get("observed_at_ms") or 0, reverse=True)
    return jsonify({
        "generated_at": now_iso(),
        "sources": _specs(),
        "observations": obs,
    })


# ── UI ───────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5010, debug=True)
