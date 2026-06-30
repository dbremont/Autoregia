"""
Personal Work Organization System (PWOS) — Prototype Server.

Flask backend implementing the three PWOS components:
  [A] Work Organization & Registration  — /api/actions (CRUD, search, dependencies)
  [B] Work Calendarization               — /api/blocks, /api/calendar, conflict detection
  [C] Platforms Integration              — /api/calendar/google/* (OAuth + sync; mock-safe)

Actions and blocks are persisted in CouchDB (db ``pwos``), discriminated by
their id prefix (``ACT-`` / ``BLK-``); the read-only Todoist analytics dataset
remains a local JSON file. Both collections seed from data/mock_*.json on first
run against an empty database.

Runs in *mock mode* when Google credentials are absent, so the prototype is fully
usable offline. Conforms to spec/pwos/schema.json.

Run:   python3 pwos/server.py
Open:  http://localhost:5005
"""
import json
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from collections import Counter, defaultdict

from flask import Flask, jsonify, request, send_from_directory, Response

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store

app = Flask(__name__, static_folder="static")
HERE = os.path.dirname(__file__)
ACTIONS_PATH = os.path.join(HERE, "data", "mock_actions.json")
BLOCKS_PATH = os.path.join(HERE, "data", "mock_blocks.json")
TODOIST_PATH = os.path.join(HERE, "data", "mock_todoist.json")

# CouchDB store backing actions (ACT-*) and blocks (BLK-*). The path constants
# above double as seed fixtures for first-run population of an empty database.
store = Store("pwos", seed_paths=[ACTIONS_PATH, BLOCKS_PATH])

# Google credentials (Component C). Brought in out-of-band; never committed.
CLIENT_SECRET_PATH = os.environ.get(
    "PWOS_GC_CLIENT_SECRET",
    os.path.join(HERE, "config", "client_secret.json"))
TOKEN_PATH = os.path.join(HERE, "config", "token.json")
SCOPES = ["https://www.googleapis.com/auth/calendar"]


# ── Helpers ─────────────────────────────────────────────────────────────────
def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _is_action_doc(d):
    return str(d.get("id", "")).startswith("ACT-")


def _is_block_doc(d):
    return str(d.get("id", "")).startswith("BLK-")


def load(path):
    """Collection reader.

    Actions/blocks are served from the ``pwos`` CouchDB database (filtered by
    id prefix); other paths (the read-only Todoist analytics fixture) fall back
    to a direct JSON file read.
    """
    if path == ACTIONS_PATH:
        return [d for d in store.all() if _is_action_doc(d)]
    if path == BLOCKS_PATH:
        return [d for d in store.all() if _is_block_doc(d)]
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return []


def save(path, data):
    """Collection writer, routed to CouchDB for actions/blocks.

    Each document is upserted individually (keyed by its ``id``). Only the
    documents present in ``data`` are touched; others in the database are left
    intact. Non-action/block paths fall back to a JSON file write.
    """
    if path in (ACTIONS_PATH, BLOCKS_PATH):
        for doc in data:
            if isinstance(doc, dict) and doc.get("id"):
                store.put(doc)
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def parse_ts(s):
    return datetime.fromisoformat((s or "").replace("Z", "+00:00"))


# ════════════════════════════════════════════════════════════════════════════
# Component A — Work Organization & Registration
# ════════════════════════════════════════════════════════════════════════════
def _filter_actions(actions, args):
    kind = args.get("kind")
    sched = args.get("scheduling_state")
    project = args.get("project")
    objective = args.get("objective")
    pinned = args.get("pinned")
    q = args.get("q", "").lower().strip()
    out = actions
    if kind:
        out = [a for a in out if a.get("kind") == kind]
    if sched:
        out = [a for a in out if a.get("scheduling_state") == sched]
    if project:
        out = [a for a in out if (a.get("strategic") or {}).get("project") == project]
    if objective:
        out = [a for a in out if (a.get("strategic") or {}).get("objective") == objective]
    if pinned == "true":
        out = [a for a in out if a.get("pinned")]
    if q:
        def hit(a):
            hay = " ".join([str(a.get(k, "")) for k in ("id", "record_id", "kind")]
                           + [(a.get("strategic") or {}).get("project", "")]).lower()
            return q in hay
        out = [a for a in out if hit(a)]
    return out


@app.route("/api/actions", methods=["GET"])
def get_actions():
    return jsonify(_filter_actions(load(ACTIONS_PATH), request.args))


@app.route("/api/actions/<action_id>", methods=["GET"])
def get_action(action_id):
    a = next((x for x in load(ACTIONS_PATH) if x["id"] == action_id), None)
    return jsonify(a) if a else (jsonify({"error": "Action not found"}), 404)


@app.route("/api/actions", methods=["POST"])
def create_action():
    data = request.get_json()
    actions = load(ACTIONS_PATH)
    now = now_iso()
    a = {
        "id": data.get("id", f"ACT-{now[:4]}-{uuid.uuid4().hex[:5].upper()}"),
        "record_id": data.get("record_id", f"REC-{now[:4]}-{uuid.uuid4().hex[:5].upper()}"),
        "kind": data.get("kind", "Task"),
        "scheduling_state": data.get("scheduling_state", "unscheduled"),
        "effort_estimate": data.get("effort_estimate"),
        "capacity_profile": data.get("capacity_profile"),
        "dependencies": data.get("dependencies", []),
        "external_mappings": [],
        "pinned": data.get("pinned", False),
        "strategic": data.get("strategic", {}),
        "annotations": [],
        "created_at": now, "updated_at": now,
    }
    actions.append(a)
    save(ACTIONS_PATH, actions)
    return jsonify(a), 201


@app.route("/api/actions/<action_id>", methods=["PUT"])
def update_action(action_id):
    actions = load(ACTIONS_PATH)
    a = next((x for x in actions if x["id"] == action_id), None)
    if not a:
        return jsonify({"error": "Action not found"}), 404
    data = request.get_json()
    for k in ("kind", "scheduling_state", "effort_estimate", "capacity_profile",
              "dependencies", "pinned", "strategic"):
        if k in data:
            a[k] = data[k]
    a["updated_at"] = now_iso()
    save(ACTIONS_PATH, actions)
    return jsonify(a)


@app.route("/api/actions/<action_id>", methods=["DELETE"])
def delete_action(action_id):
    store.delete(action_id)
    return jsonify({"deleted": action_id})


@app.route("/api/actions/<action_id>/pin", methods=["POST"])
def toggle_pin(action_id):
    actions = load(ACTIONS_PATH)
    a = next((x for x in actions if x["id"] == action_id), None)
    if not a:
        return jsonify({"error": "Action not found"}), 404
    a["pinned"] = not a.get("pinned", False)
    a["updated_at"] = now_iso()
    save(ACTIONS_PATH, actions)


# ════════════════════════════════════════════════════════════════════════════
# Component B — Work Calendarization
# ════════════════════════════════════════════════════════════════════════════
@app.route("/api/blocks", methods=["GET"])
def get_blocks():
    blocks = load(BLOCKS_PATH)
    calendar_id = request.args.get("calendar_id")
    action_id = request.args.get("action_id")
    start = request.args.get("start")
    end = request.args.get("end")
    out = blocks
    if calendar_id:
        out = [b for b in out if b.get("calendar_id") == calendar_id]
    if action_id:
        out = [b for b in out if b.get("action_id") == action_id]
    if start:
        s = parse_ts(start)
        out = [b for b in out if parse_ts(b["ends_at"]) >= s]
    if end:
        e = parse_ts(end)
        out = [b for b in out if parse_ts(b["starts_at"]) <= e]
    return jsonify(out)


@app.route("/api/blocks", methods=["POST"])
def create_block():
    data = request.get_json()
    blocks = load(BLOCKS_PATH)
    now = now_iso()
    b = {
        "id": data.get("id", f"BLK-{now[:4]}-{uuid.uuid4().hex[:5].upper()}"),
        "action_id": data["action_id"],
        "starts_at": data["starts_at"],
        "ends_at": data["ends_at"],
        "all_day": data.get("all_day", False),
        "calendar_id": data.get("calendar_id", "work"),
        "recurrence_source": data.get("recurrence_source"),
        "external_mapping": None,
        "conflict_flags": [],
        "status": data.get("status", "confirmed"),
        "title": data.get("title"),
        "domain": data.get("domain"),
    }
    b["conflict_flags"] = _detect_conflicts(b, blocks)
    blocks.append(b)
    save(BLOCKS_PATH, blocks)
    return jsonify(b), 201


@app.route("/api/blocks/<block_id>", methods=["PUT"])
def update_block(block_id):
    blocks = load(BLOCKS_PATH)
    b = next((x for x in blocks if x["id"] == block_id), None)
    if not b:
        return jsonify({"error": "Block not found"}), 404
    data = request.get_json()
    for k in ("starts_at", "ends_at", "all_day", "calendar_id", "status", "title", "domain"):
        if k in data:
            b[k] = data[k]
    others = [x for x in blocks if x["id"] != block_id]
    b["conflict_flags"] = _detect_conflicts(b, others)
    save(BLOCKS_PATH, blocks)
    return jsonify(b)


@app.route("/api/blocks/<block_id>", methods=["DELETE"])
def delete_block(block_id):
    store.delete(block_id)
    return jsonify({"deleted": block_id})


def _detect_conflicts(block, others):
    """Overlap + overload conflict detection (Component B)."""
    flags = []
    bs = parse_ts(block["starts_at"])
    be = parse_ts(block["ends_at"])
    for o in others:
        if o.get("status") in ("cancelled", "completed"):
            continue
        os_ = parse_ts(o["starts_at"])
        oe = parse_ts(o["ends_at"])
        if bs < oe and os_ < be:  # temporal overlap
            flags.append({"kind": "overlap", "with": o["id"],
                          "detail": "Overlaps with %s" % o.get("title", o["id"])})
    return flags


def _index_blocks(blocks):
    """Group live blocks by ISO date, skipping cancelled ones."""
    by_day = {}
    for b in blocks:
        if b.get("status") == "cancelled":
            continue
        d = parse_ts(b["starts_at"]).date().isoformat()
        by_day.setdefault(d, []).append(b)
    return by_day


def _minutes_for(day_blocks):
    total = 0
    for b in day_blocks:
        total += int((parse_ts(b["ends_at"]) - parse_ts(b["starts_at"])).total_seconds() / 60)
    return total


def _day_payload(by_day, date_obj):
    """One day's blocks + scheduled minutes for the multi-view calendar."""
    iso = date_obj.date().isoformat()
    day_blocks = sorted(by_day.get(iso, []), key=lambda b: b["starts_at"])
    return {"date": iso, "blocks": day_blocks, "scheduled_minutes": _minutes_for(day_blocks)}


@app.route("/api/calendar/day", methods=["GET"])
def calendar_day():
    """Return blocks for a single day (day view)."""
    by_day = _index_blocks(load(BLOCKS_PATH))
    start = request.args.get("start")
    base = parse_ts(start) if start else datetime.now(timezone.utc)
    return jsonify(_day_payload(by_day, base))


@app.route("/api/calendar/week", methods=["GET"])
def calendar_week():
    """Return blocks grouped by day for a 7-day window (week view)."""
    by_day = _index_blocks(load(BLOCKS_PATH))
    start = request.args.get("start")
    base = parse_ts(start) if start else datetime.now(timezone.utc)
    # Snap to Monday (Mon=0 .. Sun=6) so the week window is stable.
    base = base - timedelta(days=base.weekday())
    return jsonify([_day_payload(by_day, base + timedelta(days=i)) for i in range(7)])


@app.route("/api/calendar/month", methods=["GET"])
def calendar_month():
    """Return a 6x7 (42-cell) weekday-aligned grid for a month (month view).

    Query: ?year=2026&month=6  (month is 1-12). Defaults to current month.
    Cells carry ``in_month`` so leading/trailing padding can be dimmed.
    """
    by_day = _index_blocks(load(BLOCKS_PATH))
    now = datetime.now(timezone.utc)
    year = int(request.args.get("year", now.year))
    month = int(request.args.get("month", now.month))
    first = datetime(year, month, 1, tzinfo=timezone.utc)
    # Monday-based weekday (0..6)
    lead = first.weekday()
    grid_start = first - timedelta(days=lead)
    cells = []
    for i in range(42):
        d = grid_start + timedelta(days=i)
        payload = _day_payload(by_day, d)
        payload["in_month"] = (d.month == month)
        cells.append(payload)
    minutes = sum(c["scheduled_minutes"] for c in cells if c["in_month"])
    return jsonify({"year": year, "month": month,
                    "name": first.strftime("%B"), "scheduled_minutes": minutes, "days": cells})


@app.route("/api/calendar/year", methods=["GET"])
def calendar_year():
    """Return a per-month workload summary for a year (year view)."""
    by_day = _index_blocks(load(BLOCKS_PATH))
    year = int(request.args.get("year", datetime.now(timezone.utc).year))
    months = []
    for m in range(1, 13):
        count = 0
        minutes = 0
        for day in range(1, 32):
            try:
                d = datetime(year, m, day).date().isoformat()
            except ValueError:
                break
            day_blocks = by_day.get(d)
            if not day_blocks:
                continue
            count += len(day_blocks)
            minutes += _minutes_for(day_blocks)
        months.append({"month": m, "name": datetime(year, m, 1).strftime("%B"),
                       "block_count": count, "scheduled_minutes": minutes})
    total_minutes = sum(m["scheduled_minutes"] for m in months)
    total_blocks = sum(m["block_count"] for m in months)
    return jsonify({"year": year, "scheduled_minutes": total_minutes,
                    "block_count": total_blocks, "months": months})


@app.route("/api/hierarchy", methods=["GET"])
def hierarchy():
    """Objective -> Initiative -> Project -> Task/Routine tree (Component A view)."""
    actions = load(ACTIONS_PATH)
    by_kind = {}
    for a in actions:
        by_kind.setdefault(a["kind"], []).append(a)
    objectives = by_kind.get("Objective", [])
    initiatives = by_kind.get("Initiative", [])
    projects = by_kind.get("Project", [])
    leaves = (by_kind.get("Task", []) + by_kind.get("Routine", [])
              + by_kind.get("Commitment", []))

    def children_of(items, kind_key, parent_val):
        return [i for i in items if (i.get("strategic") or {}).get(kind_key) == parent_val]

    tree = []
    for o in objectives:
        okey = (o.get("strategic") or {}).get("objective", o["id"])
        o_node = {"action": o, "initiatives": []}
        for ini in children_of(initiatives, "objective", okey):
            ikey = (ini.get("strategic") or {}).get("initiative", ini["id"])
            ini_node = {"action": ini, "projects": []}
            for p in children_of(projects, "initiative", ikey):
                pkey = (p.get("strategic") or {}).get("project", p["id"])
                p_node = {"action": p, "tasks": [t for t in leaves
                         if (t.get("strategic") or {}).get("project") == pkey]}
                ini_node["projects"].append(p_node)
            o_node["initiatives"].append(ini_node)
        tree.append(o_node)
    assigned = set()
    for o in tree:
        for ini in o["initiatives"]:
            for p in ini["projects"]:
                assigned.add(p["action"]["id"])
    orphan_projects = [p for p in projects if p["id"] not in assigned]
    return jsonify({"objectives": tree, "orphan_projects": orphan_projects,
                    "orphan_tasks": [t for t in leaves if not (t.get("strategic") or {}).get("project")]})


# ============================================================================
# Component C -- Platforms Integration (Google Calendar)
#
# Mock-safe: if no OAuth client secret is present (config/client_secret.json or
# PWOS_GC_CLIENT_SECRET env var), the adapter reports status "mock" and the
# prototype runs entirely on local block data. When credentials ARE present and
# the consent flow has completed, two-way incremental sync is performed.
# ============================================================================
def _gc_status():
    has_secret = os.path.exists(CLIENT_SECRET_PATH)
    has_token = os.path.exists(TOKEN_PATH)
    if has_secret and has_token:
        return "connected"
    if has_secret:
        return "authorized_pending"
    return "mock"


# In-process store mapping OAuth `state` -> {code_verifier, created_at}.
# PWOS is a single-user local prototype, so an in-memory dict keyed by the
# per-flow CSRF `state` value is sufficient to carry the PKCE code_verifier
# across the two-step OAuth redirect (start -> callback).
_GC_PKCE_STORE = {}


def _gc_build_service():
    """Build an authorized Google Calendar service, or None in mock mode."""
    if not (os.path.exists(CLIENT_SECRET_PATH) and os.path.exists(TOKEN_PATH)):
        return None
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        with open(TOKEN_PATH, "r") as f:
            token = json.load(f)
        creds = Credentials.from_authorized_user_info(token, SCOPES)
        return build("calendar", "v3", credentials=creds)
    except Exception as exc:
        print(f"[PWOS] Google Calendar service unavailable: {exc}")
        return None


@app.route("/api/calendar/google/status", methods=["GET"])
def gc_status():
    return jsonify({"platform": "google-calendar", "status": _gc_status(),
                    "client_secret_path": CLIENT_SECRET_PATH,
                    "token_path": TOKEN_PATH, "scopes": SCOPES})


@app.route("/api/calendar/google/auth", methods=["POST"])
def gc_auth_start():
    """Begin the OAuth consent flow. Requires client_secret.json to be present."""
    if not os.path.exists(CLIENT_SECRET_PATH):
        return jsonify({"status": "mock",
                        "detail": ("No client_secret.json found at %s. "
                                   "See spec/pwos/README.md Google Calendar setup."
                                   % CLIENT_SECRET_PATH)}), 400
    try:
        from google_auth_oauthlib.flow import Flow
    except ImportError:
        return jsonify({"status": "error",
                        "detail": "google-auth-oauthlib not installed; run: pip install -r pwos/requirements.txt"}), 500
    redirect = "http://localhost:5005/api/calendar/google/callback"
    flow = Flow.from_client_secrets_file(CLIENT_SECRET_PATH, scopes=SCOPES, redirect_uri=redirect)
    url, state = flow.authorization_url(prompt="consent", access_type="offline")
    # Carry the PKCE code_verifier across the redirect into the callback.
    # authorization_url() auto-generates flow.code_verifier (and embeds the
    # matching code_challenge in `url`). Without persisting it, the callback's
    # fresh Flow has no verifier and Google rejects the token exchange with
    # "(invalid_grant) Missing code verifier.".
    _GC_PKCE_STORE[state] = {
        "code_verifier": flow.code_verifier,
        "created_at": now_iso(),
    }
    return jsonify({"authorization_url": url})


@app.route("/api/calendar/google/callback", methods=["GET"])
def gc_auth_callback():
    """OAuth redirect endpoint: exchanges the code for a stored refresh token."""
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "missing code"}), 400
    state = request.args.get("state")
    # Resolve the PKCE code_verifier persisted by the /auth start step.
    # Single-use: pop immediately so a state cannot be replayed.
    pkce = _GC_PKCE_STORE.pop(state, None) if state else None
    if not pkce:
        return jsonify({"status": "error",
                        "detail": ("Missing or expired OAuth state. "
                                   "Restart the Connect flow from the app.")}), 400
    try:
        from google_auth_oauthlib.flow import Flow
        redirect = "http://localhost:5005/api/calendar/google/callback"
        flow = Flow.from_client_secrets_file(CLIENT_SECRET_PATH, scopes=SCOPES, redirect_uri=redirect)
        # Restore the verifier that produced the code_challenge in the consent URL.
        flow.code_verifier = pkce["code_verifier"]
        flow.fetch_token(code=code)
        creds = flow.credentials
        os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
        with open(TOKEN_PATH, "w") as f:
            json.dump(json.loads(creds.to_json()), f, indent=2)
        return jsonify({"status": "connected", "detail": "Token stored. You can close this tab."})
    except Exception as exc:
        return jsonify({"status": "error", "detail": str(exc)}), 500


@app.route("/api/calendar/google/calendars", methods=["GET"])
def gc_list_calendars():
    svc = _gc_build_service()
    if svc is None:
        return jsonify({"status": "mock", "calendars": []})
    try:
        cals = svc.calendarList().list().execute()
        out = [{"id": c.get("id"), "summary": c.get("summary"),
                "primary": c.get("primary", False)} for c in cals.get("items", [])]
        return jsonify({"status": "connected", "calendars": out})
    except Exception as exc:
        return jsonify({"status": "error", "detail": str(exc)}), 500


@app.route("/api/calendar/google/sync", methods=["POST"])
def gc_sync():
    """Two-way incremental sync: pull remote events, push local dirty blocks.

    In mock mode, reports the sync as a no-op so the prototype is functional offline.
    """
    svc = _gc_build_service()
    if svc is None:
        return jsonify({"status": "mock", "pulled": 0, "pushed": 0,
                        "detail": "Mock mode - local blocks only. Add client_secret.json to enable live sync."})
    body = request.get_json() or {}
    calendar_id = body.get("calendar_id", "primary")
    pulled = 0
    try:
        events = svc.events().list(calendarId=calendar_id, singleEvents=True, orderBy="startTime").execute()
        for ev in events.get("items", []):
            pulled += 1
            start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date")
            end = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date")
            blocks = load(BLOCKS_PATH)
            existing = next((b for b in blocks
                             if (b.get("external_mapping") or {}).get("external_id") == ev.get("id")), None)
            if existing:
                existing["starts_at"] = start
                existing["ends_at"] = end
                existing["title"] = ev.get("summary")
            else:
                now = now_iso()
                blocks.append({
                    "id": f"BLK-{now[:4]}-{uuid.uuid4().hex[:5].upper()}",
                    "action_id": None, "starts_at": start, "ends_at": end,
                    "all_day": "date" in ev.get("start", {}),
                    "calendar_id": calendar_id, "recurrence_source": None,
                    "external_mapping": {"platform": "google-calendar",
                                         "external_id": ev.get("id"), "sync_state": "synced",
                                         "synced_at": now, "url": ev.get("htmlLink")},
                    "conflict_flags": [], "status": ev.get("status", "confirmed"),
                    "title": ev.get("summary"), "domain": None})
            save(BLOCKS_PATH, blocks)
    except Exception as exc:
        return jsonify({"status": "error", "detail": str(exc)}), 500

    pushed = 0
    blocks = load(BLOCKS_PATH)
    for b in blocks:
        em = b.get("external_mapping")
        if not em or em.get("platform") != "google-calendar" or em.get("sync_state") == "synced":
            continue
        body = {"summary": b.get("title"),
                "start": {"dateTime": b["starts_at"]},
                "end": {"dateTime": b["ends_at"]}}
        try:
            if em.get("external_id"):
                svc.events().update(calendarId=b.get("calendar_id", "primary"),
                                    eventId=em["external_id"], body=body).execute()
            else:
                created = svc.events().insert(calendarId=b.get("calendar_id", "primary"), body=body).execute()
                em["external_id"] = created.get("id")
            em["sync_state"] = "synced"
            em["synced_at"] = now_iso()
            pushed += 1
        except Exception:
            em["sync_state"] = "conflict"
    save(BLOCKS_PATH, blocks)
    return jsonify({"status": "connected", "pulled": pulled, "pushed": pushed})


# ============================================================================
# Analytics Dashboard (S3* — Audit surface)
#
# Read-only aggregations over the synthetic app.todoist dataset
# (data/mock_todoist.json, generated by data/gen_todoist_mock.py).
# Conforms to spec/pwos/analytics.md. Never mutates actions or blocks.
# ============================================================================
def _load_todoist():
    if os.path.exists(TODOIST_PATH):
        with open(TODOIST_PATH, "r") as f:
            return json.load(f)
    return {"meta": {"today": now_iso()}, "projects": [], "items": [], "labels": []}


def _todoist_today(payload):
    return parse_ts((payload.get("meta") or {}).get("today") or now_iso())


def _window_bounds(payload, window):
    """Return (since_dt, until_dt) for the given lookback window in days."""
    until = _todoist_today(payload)
    since = until - timedelta(days=int(window))
    return since, until


def _in_window(ts_iso, since, until):
    if not ts_iso:
        return False
    try:
        t = parse_ts(ts_iso)
    except Exception:
        return False
    return since <= t <= until


def _day_key(ts_iso):
    if not ts_iso:
        return None
    try:
        return parse_ts(ts_iso).date().isoformat()
    except Exception:
        return None


PRIORITY_NAMES = {1: "P1 Critical", 2: "P2 High", 3: "P3 Medium", 4: "P4 Low"}
PRIORITY_HEX = {1: "#962030", 2: "#B4742A", 3: "#A8854A", 4: "#8C877B"}


@app.route("/api/analytics/summary", methods=["GET"])
def analytics_summary():
    """Headline KPIs + small distribution payloads."""
    payload = _load_todoist()
    items = payload.get("items", [])
    projects = {p["id"]: p for p in payload.get("projects", [])}
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    proj_filter = request.args.get("project")
    prio_filter = request.args.get("priority")

    def keep(it):
        if proj_filter and it.get("project_id") != proj_filter:
            return False
        if prio_filter and str(it.get("priority")) not in prio_filter.split(","):
            return False
        return True

    scoped = [it for it in items if keep(it)]
    in_win = [it for it in scoped
              if _in_window(it.get("completed_at") or it.get("created_at"), since, until)]
    completed = [it for it in scoped if _in_window(it.get("completed_at"), since, until)]
    open_items = [it for it in scoped if not it.get("is_completed")]
    today = _todoist_today(payload)
    overdue = [it for it in open_items
               if it.get("due_date") and parse_ts(it["due_date"] + "T00:00:00Z") < today]
    active_projects = {it["project_id"] for it in in_win if it.get("project_id")}
    # Time-to-complete (days) over completed-in-window
    ttcs = []
    for it in completed:
        try:
            ttcs.append((parse_ts(it["completed_at"]) - parse_ts(it["created_at"])).total_seconds() / 86400.0)
        except Exception:
            pass
    avg_ttc = round(sum(ttcs) / len(ttcs), 2) if ttcs else 0.0
    # Current streak: consecutive days ending today with >=1 completion
    streak = 0
    day = today
    while True:
        key = day.date().isoformat()
        if any(_day_key(it.get("completed_at")) == key for it in scoped):
            streak += 1
            day = day - timedelta(days=1)
        else:
            # allow today to be a no-completion-yet day without breaking streak
            if streak == 0 and key == today.date().isoformat():
                day = day - timedelta(days=1)
                continue
            break
    comp_rate = round(len(completed) / max(1, len(completed) + len(open_items)) * 100, 1)

    by_kind = Counter(it.get("priority") for it in in_win)
    by_project = Counter(it.get("project_id") for it in in_win)
    return jsonify({
        "window_days": window, "today": now_iso_safe(until),
        "kpi": {
            "total_items": len(scoped),
            "in_window": len(in_win),
            "completed": len(completed),
            "open": len(open_items),
            "overdue": len(overdue),
            "active_projects": len(active_projects),
            "completion_rate": comp_rate,
            "avg_time_to_complete_days": avg_ttc,
            "current_streak": streak,
        },
        "by_priority": [{"priority": k, "label": PRIORITY_NAMES.get(k, str(k)),
                         "count": v, "color": PRIORITY_HEX.get(k, "#8C877B")}
                        for k, v in sorted(by_kind.items())],
        "top_projects": [{"project_id": pid, "name": (projects.get(pid) or {}).get("name", pid),
                          "color_hex": (projects.get(pid) or {}).get("color_hex", "#3F6092"),
                          "count": c}
                         for pid, c in by_project.most_common(8)],
        "filters": {"project": proj_filter, "priority": prio_filter},
    })


@app.route("/api/analytics/throughput", methods=["GET"])
def analytics_throughput():
    """Daily created/completed series + 7-day rolling velocity."""
    payload = _load_todoist()
    items = payload.get("items", [])
    window = int(request.args.get("window", "90"))
    since, until = _window_bounds(payload, window)
    created = Counter()
    completed = Counter()
    for it in items:
        c = _day_key(it.get("created_at"))
        d = _day_key(it.get("completed_at"))
        if c and since <= parse_ts(it["created_at"]) <= until:
            created[c] += 1
        if d and since <= parse_ts(it["completed_at"]) <= until:
            completed[d] += 1
    # Build a contiguous day series
    days = []
    cur = since
    comp_series = []
    while cur <= until:
        key = cur.date().isoformat()
        cr = created.get(key, 0)
        co = completed.get(key, 0)
        days.append({"date": key, "created": cr, "completed": co})
        comp_series.append(co)
        cur += timedelta(days=1)
    # 7-day rolling mean of completions
    rolling = []
    for i in range(len(comp_series)):
        window_slice = comp_series[max(0, i - 6): i + 1]
        rolling.append(round(sum(window_slice) / len(window_slice), 2))
    for i, d in enumerate(days):
        d["velocity"] = rolling[i]
    # Stability: variance of daily completions (lower = steadier)
    mean_c = sum(comp_series) / len(comp_series) if comp_series else 0
    var = sum((c - mean_c) ** 2 for c in comp_series) / len(comp_series) if comp_series else 0
    return jsonify({
        "window_days": window,
        "days": days,
        "throughput_stability_variance": round(var, 2),
        "mean_daily_completions": round(mean_c, 2),
    })


@app.route("/api/analytics/projects", methods=["GET"])
def analytics_projects():
    payload = _load_todoist()
    items = payload.get("items", [])
    projects = {p["id"]: p for p in payload.get("projects", [])}
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    today = _todoist_today(payload)
    rows = {}
    for it in items:
        pid = it.get("project_id")
        if not pid:
            continue
        row = rows.setdefault(pid, {"project_id": pid, "items": 0, "open": 0,
                                    "completed_in_window": 0, "overdue": 0,
                                    "oldest_open_age_days": 0})
        row["items"] += 1
        if not it.get("is_completed"):
            row["open"] += 1
            if it.get("due_date") and parse_ts(it["due_date"] + "T00:00:00Z") < today:
                row["overdue"] += 1
            try:
                age = (today - parse_ts(it["created_at"])).total_seconds() / 86400.0
                if age > row["oldest_open_age_days"]:
                    row["oldest_open_age_days"] = int(age)
            except Exception:
                pass
        elif _in_window(it.get("completed_at"), since, until):
            row["completed_in_window"] += 1
    out = []
    for pid, row in rows.items():
        p = projects.get(pid, {})
        row["name"] = p.get("name", pid)
        row["color_hex"] = p.get("color_hex", "#3F6092")
        row["parent_id"] = p.get("parent_id")
        out.append(row)
    out.sort(key=lambda r: r["items"], reverse=True)
    return jsonify({"window_days": window, "projects": out})


@app.route("/api/analytics/priority", methods=["GET"])
def analytics_priority():
    payload = _load_todoist()
    items = payload.get("items", [])
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    stats = {}
    for p in (1, 2, 3, 4):
        stats[p] = {"priority": p, "label": PRIORITY_NAMES[p], "color": PRIORITY_HEX[p],
                    "total": 0, "open": 0, "completed_in_window": 0, "overdue": 0}
    today = _todoist_today(payload)
    for it in items:
        p = it.get("priority")
        if p not in stats:
            continue
        stats[p]["total"] += 1
        if not it.get("is_completed"):
            stats[p]["open"] += 1
            if it.get("due_date") and parse_ts(it["due_date"] + "T00:00:00Z") < today:
                stats[p]["overdue"] += 1
        elif _in_window(it.get("completed_at"), since, until):
            stats[p]["completed_in_window"] += 1
    for s in stats.values():
        denom = s["completed_in_window"] + s["open"]
        s["completion_rate"] = round(s["completed_in_window"] / max(1, denom) * 100, 1)
    return jsonify({"window_days": window, "priorities": [stats[p] for p in (1, 2, 3, 4)]})


@app.route("/api/analytics/labels", methods=["GET"])
def analytics_labels():
    payload = _load_todoist()
    items = payload.get("items", [])
    labels = {l["name"]: l for l in payload.get("labels", [])}
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    limit = int(request.args.get("limit", "12"))
    counts = {}
    for it in items:
        touched = _in_window(it.get("completed_at") or it.get("created_at"), since, until)
        if not touched:
            continue
        for nm in it.get("labels", []):
            c = counts.setdefault(nm, {"label": nm, "count": 0,
                                       "color_hex": (labels.get(nm) or {}).get("color_hex", "#6B5B95")})
            c["count"] += 1
    out = sorted(counts.values(), key=lambda c: c["count"], reverse=True)[:limit]
    return jsonify({"window_days": window, "labels": out})


@app.route("/api/analytics/heatmap", methods=["GET"])
def analytics_heatmap():
    payload = _load_todoist()
    items = payload.get("items", [])
    year = int(request.args.get("year", _todoist_today(payload).year))
    counts = Counter()
    for it in items:
        d = _day_key(it.get("completed_at"))
        if d and d.startswith(str(year)):
            counts[d] += 1
    max_v = max(counts.values()) if counts else 1
    cells = [{"date": d, "count": c, "level": min(4, int(round(c / max_v * 4)))}
             for d, c in sorted(counts.items())]
    return jsonify({"year": year, "max": max_v, "total": sum(counts.values()), "cells": cells})


@app.route("/api/analytics/reliability", methods=["GET"])
def analytics_reliability():
    payload = _load_todoist()
    items = payload.get("items", [])
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    today = _todoist_today(payload)
    met = 0
    miss = 0
    for it in items:
        comp = it.get("completed_at")
        due = it.get("due_date")
        if not (comp and due):
            continue
        if not _in_window(comp, since, until):
            continue
        if parse_ts(comp) <= parse_ts(due + "T23:59:59Z"):
            met += 1
        else:
            miss += 1
    denom = met + miss
    adherence = round(met / max(1, denom) * 100, 1)
    # Overdue buckets for the open backlog
    buckets = {"0-7d": 0, "7-30d": 0, "30-90d": 0, "90+d": 0}
    for it in items:
        if it.get("is_completed"):
            continue
        due = it.get("due_date")
        if not due:
            continue
        try:
            age = (today - parse_ts(due + "T00:00:00Z")).total_seconds() / 86400.0
        except Exception:
            continue
        if age <= 0:
            continue
        if age <= 7:
            buckets["0-7d"] += 1
        elif age <= 30:
            buckets["7-30d"] += 1
        elif age <= 90:
            buckets["30-90d"] += 1
        else:
            buckets["90+d"] += 1
    return jsonify({"window_days": window, "deadline_adherence": adherence,
                    "met": met, "missed": miss, "overdue_buckets": buckets})


@app.route("/api/analytics/aging", methods=["GET"])
def analytics_aging():
    payload = _load_todoist()
    items = payload.get("items", [])
    today = _todoist_today(payload)
    buckets = {"0-7d": 0, "7-30d": 0, "30-90d": 0, "90-180d": 0, "180+d": 0}
    for it in items:
        if it.get("is_completed"):
            continue
        try:
            age = (today - parse_ts(it["created_at"])).total_seconds() / 86400.0
        except Exception:
            continue
        if age <= 7:
            buckets["0-7d"] += 1
        elif age <= 30:
            buckets["7-30d"] += 1
        elif age <= 90:
            buckets["30-90d"] += 1
        elif age <= 180:
            buckets["90-180d"] += 1
        else:
            buckets["180+d"] += 1
    return jsonify({"buckets": buckets})


@app.route("/api/analytics/export", methods=["GET"])
def analytics_export():
    """Full computed indicator payload as a single JSON download."""
    window = int(request.args.get("window", "30"))
    with app.test_request_context("/api/analytics/summary?window=" + str(window)):
        summary = analytics_summary().get_json()
    with app.test_request_context("/api/analytics/throughput?window=" + str(window)):
        throughput = analytics_throughput().get_json()
    with app.test_request_context("/api/analytics/projects?window=" + str(window)):
        projects = analytics_projects().get_json()
    with app.test_request_context("/api/analytics/priority?window=" + str(window)):
        priority = analytics_priority().get_json()
    with app.test_request_context("/api/analytics/labels?window=" + str(window)):
        labels = analytics_labels().get_json()
    with app.test_request_context("/api/analytics/reliability?window=" + str(window)):
        reliability = analytics_reliability().get_json()
    with app.test_request_context("/api/analytics/aging"):
        aging = analytics_aging().get_json()
    payload = {"window_days": window, "exported_at": now_iso(),
               "summary": summary, "throughput": throughput, "projects": projects,
               "priority": priority, "labels": labels, "reliability": reliability,
               "aging": aging}
    return Response(json.dumps(payload, indent=2, default=str),
                    mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=pwos_analytics.json"})


def now_iso_safe(dt):
    try:
        return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    except Exception:
        return now_iso()


# ── Shared analytics helpers (windowing, filtering) ─────────────────────────
def _an_filter_items(items, args):
    """Apply optional project / priority filters from the request args."""
    proj = args.get("project")
    prio = args.get("priority")
    out = items
    if proj:
        out = [it for it in out if it.get("project_id") == proj]
    if prio:
        wanted = {str(int(p)) for p in prio.split(",") if p}
        out = [it for it in out if str(it.get("priority")) in wanted]
    return out


def _percentile(sorted_vals, p):
    if not sorted_vals:
        return 0
    if len(sorted_vals) == 1:
        return sorted_vals[0]
    k = (len(sorted_vals) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return sorted_vals[f]
    return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)


@app.route("/api/analytics/indices", methods=["GET"])
def analytics_indices():
    """The three composite indices (Productivity / Backlog Pressure / Fragmentation).

    Each is returned with its decomposed sub-components so the UI can show the
    index as decomposable, not a black box.
    """
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    today = _todoist_today(payload)
    completed_win = [it for it in items if _in_window(it.get("completed_at"), since, until)]
    created_win = [it for it in items if _in_window(it.get("created_at"), since, until)]
    open_items = [it for it in items if not it.get("is_completed")]
    overdue = [it for it in open_items
               if it.get("due_date") and parse_ts(it["due_date"] + "T00:00:00Z") < today]

    # ── Productivity Index ───────────────────────────────────────────────
    comp_rate = len(completed_win) / max(1, len(completed_win) + len(open_items)) * 100
    # deadline adherence over completed_win with due dates
    due_done = [it for it in completed_win if it.get("due_date")]
    met = sum(1 for it in due_done
              if parse_ts(it["completed_at"]) <= parse_ts(it["due_date"] + "T23:59:59Z"))
    adherence = met / max(1, len(due_done)) * 100
    # throughput consistency: variance of daily completions, normalized 0..100
    daily = Counter(_day_key(it.get("completed_at")) for it in completed_win)
    vals = list(daily.values()) or [0]
    mean_v = sum(vals) / len(vals)
    var_v = sum((v - mean_v) ** 2 for v in vals) / len(vals)
    consistency = max(0.0, 100.0 - min(100.0, var_v * 4))
    # backlog trajectory: shrinking? netflow/created over window
    netflow = len(created_win) - len(completed_win)
    trajectory = max(0.0, 100.0 * (1 - max(-1.0, min(1.0, netflow / max(1, len(created_win))))))
    productivity = round(comp_rate * 0.30 + adherence * 0.30 + consistency * 0.20 + trajectory * 0.20, 1)

    # ── Backlog Pressure Index (higher = worse) ──────────────────────────
    open_load = len(open_items) / max(1, len(items))
    overdue_w = len(overdue) / max(1, len(open_items))
    ages = []
    for it in open_items:
        try:
            ages.append((today - parse_ts(it["created_at"])).total_seconds() / 86400.0)
        except Exception:
            pass
    aging = min(1.0, (sum(ages) / len(ages) / 90.0) if ages else 0.0)
    imbalance = max(0.0, min(1.0, netflow / max(1, len(created_win))))
    pressure = round((open_load * 0.30 + overdue_w * 0.30 + aging * 0.25 + imbalance * 0.15) * 100, 1)

    # ── Cognitive Fragmentation Index (higher = worse) ───────────────────
    # Per active day (a day with >=1 completion): distinct projects, labels,
    # and within-day project switches (transitions in completion-time order).
    by_day_proj = defaultdict(set)
    by_day_labels = defaultdict(set)
    by_day_seq = defaultdict(list)
    for it in completed_win:
        key = _day_key(it.get("completed_at"))
        if not key:
            continue
        if it.get("project_id"):
            by_day_proj[key].add(it["project_id"])
            by_day_seq[key].append((it["completed_at"], it["project_id"]))
        for lb in it.get("labels", []):
            by_day_labels[key].add(lb)
    proj_breadths = [len(s) for s in by_day_proj.values()] or [0]
    label_breadths = [len(s) for s in by_day_labels.values()] or [0]
    switches = []
    for key, seq in by_day_seq.items():
        seq.sort(key=lambda x: x[0])
        proj_order = [p for _, p in seq]
        sw = sum(1 for i in range(1, len(proj_order)) if proj_order[i] != proj_order[i - 1])
        switches.append(sw)
    def _norm(vals):
        if not vals:
            return 0.0
        p90 = _percentile(sorted(vals), 90) or 1.0
        return min(1.0, (sum(vals) / len(vals)) / p90)
    frag = round((_norm(proj_breadths) * 0.35 + _norm(label_breadths) * 0.30 +
                  _norm(switches) * 0.35) * 100, 1)

    def _band(v, lo, hi):
        return "critical" if v < lo else ("developing" if v < hi else "viable")
    def _inverted_band(v, lo, hi):
        # higher = worse, so invert band labels
        return "high" if v >= hi else ("moderate" if v >= lo else "low")

    return jsonify({
        "window_days": window,
        "productivity": {"value": productivity, "band": _band(productivity, 40, 70),
                         "components": {
                             "completion_rate": round(comp_rate, 1),
                             "deadline_adherence": round(adherence, 1),
                             "throughput_consistency": round(consistency, 1),
                             "backlog_trajectory": round(trajectory, 1)}},
        "backlog_pressure": {"value": pressure, "band": _inverted_band(pressure, 40, 70),
                             "components": {
                                 "open_load": round(open_load * 100, 1),
                                 "overdue_weight": round(overdue_w * 100, 1),
                                 "aging_factor": round(aging * 100, 1),
                                 "imbalance": round(imbalance * 100, 1)}},
        "fragmentation": {"value": frag, "band": _inverted_band(frag, 40, 70),
                          "components": {
                              "project_breadth_avg": round(sum(proj_breadths) / len(proj_breadths), 2),
                              "label_breadth_avg": round(sum(label_breadths) / len(label_breadths), 2),
                              "switch_rate_avg": round(sum(switches) / len(switches), 2)}},
    })


@app.route("/api/analytics/trajectory", methods=["GET"])
def analytics_trajectory():
    """Cumulative created − completed over the window (backlog trajectory)."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "90"))
    since, until = _window_bounds(payload, window)
    delta = Counter()
    for it in items:
        c = _day_key(it.get("created_at"))
        d = _day_key(it.get("completed_at"))
        if c and since <= parse_ts(it["created_at"]) <= until:
            delta[c] += 1
        if d and since <= parse_ts(it["completed_at"]) <= until:
            delta[d] -= 1
    # baseline = open items that existed just before `since`
    prior_open = sum(1 for it in items
                     if not it.get("is_completed")
                     and parse_ts(it["created_at"]) < since)
    days, cur = [], prior_open
    cur_day = since
    while cur_day <= until:
        key = cur_day.date().isoformat()
        cur += delta.get(key, 0)
        days.append({"date": key, "cumulative": cur})
        cur_day += timedelta(days=1)
    return jsonify({"window_days": window, "baseline_open": prior_open, "series": days})


@app.route("/api/analytics/funnel", methods=["GET"])
def analytics_funnel():
    """Completion funnel: created → has-due-date → completed → completed-on-time."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    created = [it for it in items if _in_window(it.get("created_at"), since, until)]
    with_due = [it for it in created if it.get("due_date")]
    completed = [it for it in created if it.get("is_completed")]
    on_time = []
    for it in completed:
        if not it.get("due_date"):
            continue
        try:
            if parse_ts(it["completed_at"]) <= parse_ts(it["due_date"] + "T23:59:59Z"):
                on_time.append(it)
        except Exception:
            pass
    stages = [
        {"name": "Created", "value": len(created)},
        {"name": "Has due date", "value": len(with_due)},
        {"name": "Completed", "value": len(completed)},
        {"name": "On time", "value": len(on_time)},
    ]
    return jsonify({"window_days": window, "stages": stages})


@app.route("/api/analytics/rhythm", methods=["GET"])
def analytics_rhythm():
    """Weekly rhythm: per-weekday completion means + completion rate of due items."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "90"))
    since, until = _window_bounds(payload, window)
    today = _todoist_today(payload)
    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    completed_per_dow = [[] for _ in range(7)]   # list of daily counts per weekday
    due_per_dow = [0] * 7
    done_on_due_dow = [0] * 7
    # group completions by date
    comp_by_date = defaultdict(int)
    for it in items:
        k = _day_key(it.get("completed_at"))
        if k and since <= parse_ts(it["completed_at"]) <= until:
            comp_by_date[k] += 1
    for k, c in comp_by_date.items():
        dow = parse_ts(k + "T00:00:00Z").weekday()
        completed_per_dow[dow].append(c)
    # due-date rhythm (independent of window end; uses due dates in window)
    for it in items:
        d = it.get("due_date")
        if not d:
            continue
        try:
            dt = parse_ts(d + "T00:00:00Z")
        except Exception:
            continue
        if not (since <= dt <= until):
            continue
        dow = dt.weekday()
        due_per_dow[dow] += 1
        if it.get("is_completed") and it.get("completed_at"):
            try:
                if parse_ts(it["completed_at"]) <= parse_ts(d + "T23:59:59Z"):
                    done_on_due_dow[dow] += 1
            except Exception:
                pass
    out = []
    for i in range(7):
        counts = completed_per_dow[i]
        out.append({
            "dow": i, "name": weekday_names[i],
            "avg_completed": round(sum(counts) / len(counts), 2) if counts else 0,
            "peak_day": max(counts) if counts else 0,
            "due": due_per_dow[i],
            "due_completion_rate": round(done_on_due_dow[i] / max(1, due_per_dow[i]) * 100, 1),
        })
    peak = max(out, key=lambda r: r["avg_completed"]) if any(r["avg_completed"] for r in out) else None
    return jsonify({"window_days": window, "weekdays": out, "peak_day": (peak or {}).get("name")})


@app.route("/api/analytics/hourly", methods=["GET"])
def analytics_hourly():
    """Hour-of-day × weekday completion-density matrix + peak focus window."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "90"))
    since, until = _window_bounds(payload, window)
    # 7 rows (Mon..Sun) × 24 cols (hours)
    matrix = [[0] * 24 for _ in range(7)]
    for it in items:
        ts = it.get("completed_at")
        if not ts or not _in_window(ts, since, until):
            continue
        try:
            dt = parse_ts(ts)
        except Exception:
            continue
        matrix[dt.weekday()][dt.hour] += 1
    flat = [(matrix[d][h], d, h) for d in range(7) for h in range(24)]
    flat.sort(reverse=True)
    # peak 2-hour window = the hour with max single value (and its neighbour)
    peak_val, peak_d, peak_h = flat[0] if flat else (0, 0, 9)
    return jsonify({
        "window_days": window,
        "matrix": matrix,
        "max": peak_val,
        "peak": {"dow": peak_d, "hour": peak_h,
                 "label": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][peak_d] +
                         " " + format_hour(peak_h)},
    })


def format_hour(h):
    if h == 0:
        return "12 AM"
    if h < 12:
        return str(h) + " AM"
    if h == 12:
        return "12 PM"
    return str(h - 12) + " PM"


@app.route("/api/analytics/monthly", methods=["GET"])
def analytics_monthly():
    """Month-over-month comparison across key metrics, last N months."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    months_n = int(request.args.get("months", "6"))
    until = _todoist_today(payload)
    # build month buckets ending in the current month
    months = []
    y, m = until.year, until.month
    for _ in range(months_n):
        months.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    months.reverse()
    def month_bounds(y, m):
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        if m == 12:
            end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(y, m + 1, 1, tzinfo=timezone.utc)
        return start, end
    out = []
    prev = None
    for (y, m) in months:
        s, e = month_bounds(y, m)
        created = completed = overdue_end = 0
        cycle_times = []
        met = miss = 0
        for it in items:
            try:
                c = parse_ts(it["created_at"])
            except Exception:
                continue
            comp_ts = it.get("completed_at")
            comp = parse_ts(comp_ts) if comp_ts else None
            if s <= c < e:
                created += 1
            if comp and s <= comp < e:
                completed += 1
                try:
                    cycle_times.append((comp - c).total_seconds() / 86400.0)
                except Exception:
                    pass
                if it.get("due_date"):
                    try:
                        if comp <= parse_ts(it["due_date"] + "T23:59:59Z"):
                            met += 1
                        else:
                            miss += 1
                    except Exception:
                        pass
        cycle_times.sort()
        adherence = round(met / max(1, met + miss) * 100, 1) if (met + miss) else None
        rate = round(completed / max(1, completed + sum(
            1 for it in items if not it.get("is_completed")
            and parse_ts(it["created_at"]) < e)) * 100, 1) if items else 0
        row = {
            "year": y, "month": m, "label": datetime(y, m, 1).strftime("%b"),
            "created": created, "completed": completed,
            "cycle_p50": round(_percentile(cycle_times, 50), 2) if cycle_times else 0,
            "adherence": adherence,
            "rate": rate,
        }
        if prev:
            row["created_chg"] = _pct_chg(prev["created"], created)
            row["completed_chg"] = _pct_chg(prev["completed"], completed)
            row["adherence_chg"] = (None if prev["adherence"] is None or adherence is None
                                    else round(adherence - prev["adherence"], 1))
            row["trajectory"] = _trajectory(row)
        out.append(row)
        prev = row
    return jsonify({"months": out})


def _pct_chg(old, new):
    if not old:
        return None
    return round((new - old) / old * 100, 1)


def _trajectory(row):
    # simple verdict from completed change + adherence change
    c = row.get("completed_chg")
    a = row.get("adherence_chg")
    score = 0
    if c is not None:
        score += 1 if c > 5 else (-1 if c < -5 else 0)
    if a is not None:
        score += 1 if a > 2 else (-1 if a < -2 else 0)
    return "improving" if score > 0 else ("declining" if score < 0 else "steady")


@app.route("/api/analytics/cycletime", methods=["GET"])
def analytics_cycletime():
    """Cycle-time distribution (created → completed) by priority: p50/p90."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "90"))
    since, until = _window_bounds(payload, window)
    by_prio = defaultdict(list)
    for it in items:
        comp = it.get("completed_at")
        if not comp or not _in_window(comp, since, until):
            continue
        try:
            days = (parse_ts(comp) - parse_ts(it["created_at"])).total_seconds() / 86400.0
        except Exception:
            continue
        by_prio[it.get("priority")].append(max(0.0, days))
    out = []
    for p in (1, 2, 3, 4):
        vals = sorted(by_prio.get(p, []))
        out.append({
            "priority": p, "label": PRIORITY_NAMES[p], "color": PRIORITY_HEX[p],
            "count": len(vals),
            "p50": round(_percentile(vals, 50), 2),
            "p90": round(_percentile(vals, 90), 2),
            "mean": round(sum(vals) / len(vals), 2) if vals else 0,
        })
    return jsonify({"window_days": window, "by_priority": out})


@app.route("/api/analytics/priority-debt", methods=["GET"])
def analytics_priority_debt():
    """Cumulative high-priority (P1+P2) open items over time."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    days_n = int(request.args.get("days", "180"))
    until = _todoist_today(payload)
    since = until - timedelta(days=days_n)
    # for each day, count items that were (a) created on/before that day,
    # (b) high-priority, (c) not yet completed as of that day.
    hi = [it for it in items if it.get("priority") in (1, 2)]
    # events: +1 at created_at, -1 at completed_at
    events = []
    for it in hi:
        try:
            events.append((parse_ts(it["created_at"]), 1))
        except Exception:
            continue
        if it.get("completed_at"):
            try:
                events.append((parse_ts(it["completed_at"]), -1))
            except Exception:
                pass
    events.sort()
    series = []
    cur = 0
    cur_day = since
    ei = 0
    while cur_day <= until:
        day_end = cur_day + timedelta(days=1)
        while ei < len(events) and events[ei][0] < day_end:
            cur += events[ei][1]
            ei += 1
        series.append({"date": cur_day.date().isoformat(), "open_high_priority": max(0, cur)})
        cur_day += timedelta(days=1)
    return jsonify({"days": days_n, "series": series,
                    "current": series[-1]["open_high_priority"] if series else 0})


@app.route("/api/analytics/projects-intelligence", methods=["GET"])
def analytics_projects_intelligence():
    """Per-project momentum: recent velocity vs historical baseline + verdict."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    projects = {p["id"]: p for p in payload.get("projects", [])}
    recent_days = window
    # baseline window = 3× recent, ending at `since`
    base_until = since
    base_since = since - timedelta(days=recent_days * 3)
    rows = []
    by_proj = defaultdict(list)
    for it in items:
        pid = it.get("project_id")
        if not pid:
            continue
        by_proj[pid].append(it)
    for pid, its in by_proj.items():
        recent = sum(1 for it in its if it.get("completed_at")
                     and since <= parse_ts(it["completed_at"]) <= until)
        base = sum(1 for it in its if it.get("completed_at")
                   and base_since <= parse_ts(it["completed_at"]) < base_until)
        # normalize baseline to the same length as the recent window
        base_norm = base / 3.0
        verdict = "steady"
        if base_norm < 0.5:
            verdict = "heating" if recent >= 1 else "dormant"
        elif recent > base_norm * 1.25:
            verdict = "heating"
        elif recent < base_norm * 0.6:
            verdict = "cooling"
        open_n = sum(1 for it in its if not it.get("is_completed"))
        p = projects.get(pid, {})
        rows.append({
            "project_id": pid, "name": p.get("name", pid), "color_hex": p.get("color_hex", "#3F6092"),
            "recent_completed": recent, "baseline_completed": round(base_norm, 2),
            "open": open_n, "total": len(its), "verdict": verdict,
        })
    rows.sort(key=lambda r: r["recent_completed"], reverse=True)
    return jsonify({"window_days": window, "projects": rows[:12]})


@app.route("/api/analytics/habits", methods=["GET"])
def analytics_habits():
    """Streak history (last N days) + recurring-item consistency."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "60"))
    since, until = _window_bounds(payload, window)
    # daily completion presence for streak calendar
    comp_days = {}
    for it in items:
        k = _day_key(it.get("completed_at"))
        if k and since <= parse_ts(it["completed_at"]) <= until:
            comp_days[k] = comp_days.get(k, 0) + 1
    days = []
    cur = since
    while cur <= until:
        k = cur.date().isoformat()
        days.append({"date": k, "count": comp_days.get(k, 0)})
        cur += timedelta(days=1)
    # longest streak ending today across full dataset
    today = _todoist_today(payload)
    all_days = sorted({_day_key(it.get("completed_at")) for it in items if it.get("completed_at")})
    longest = cur_streak = 0
    prev = None
    for k in all_days:
        d = parse_ts(k + "T00:00:00Z").date()
        if prev and (d - prev).days == 1:
            cur_streak += 1
        else:
            cur_streak = 1
        longest = max(longest, cur_streak)
        prev = d
    # current streak ending today
    current = 0
    d = today.date()
    day_keys = set(all_days)
    while True:
        if d.isoformat() in day_keys:
            current += 1
            d -= timedelta(days=1)
        else:
            if d.isoformat() == today.date().isoformat():
                d -= timedelta(days=1)
                continue
            break
    # recurring-item consistency: for each recurring item, expected ≈ weekly
    # cadence; count completions in window vs expected.
    recurring = [it for it in items if it.get("is_recurring")]
    habits = []
    for it in recurring:
        comps = 0
        last = None
        for ev in items:
            if ev.get("id") == it["id"] or ev.get("content") == it.get("content"):
                # the recurring template itself isn't re-completed; approximate
                pass
        # Approximate consistency from the template's own completion history:
        # count items with same content+project completed in window.
        same = [x for x in items
                if x.get("content") == it.get("content")
                and x.get("project_id") == it.get("project_id")
                and x.get("completed_at")
                and since <= parse_ts(x["completed_at"]) <= until]
        expected = max(1, window // 7)  # ~weekly
        habits.append({
            "content": it.get("content"), "project_id": it.get("project_id"),
            "completed_in_window": len(same), "expected": expected,
            "consistency": round(len(same) / expected * 100, 1),
        })
    habits = [h for h in habits if h["completed_in_window"] > 0]
    habits.sort(key=lambda h: h["consistency"], reverse=True)
    return jsonify({
        "window_days": window, "days": days,
        "current_streak": current, "longest_streak": longest,
        "habits": habits[:10],
    })


@app.route("/api/analytics/activity", methods=["GET"])
def analytics_activity():
    """Recent activity stream: timeline grouped by day with session detection."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    limit = int(request.args.get("limit", "40"))
    today = _todoist_today(payload)
    events = []
    for it in items:
        if it.get("completed_at"):
            events.append({"ts": it["completed_at"], "kind": "completed",
                           "content": it.get("content"), "project_id": it.get("project_id"),
                           "priority": it.get("priority")})
        if it.get("created_at"):
            events.append({"ts": it["created_at"], "kind": "created",
                           "content": it.get("content"), "project_id": it.get("project_id"),
                           "priority": it.get("priority")})
    events.sort(key=lambda e: e["ts"], reverse=True)
    events = events[:limit]
    projects = {p["id"]: p for p in payload.get("projects", [])}
    # group by day
    groups = []
    by_day = defaultdict(list)
    for e in events:
        by_day[_day_key(e["ts"])].append(e)
    for day in sorted(by_day.keys(), reverse=True):
        day_events = sorted(by_day[day], key=lambda e: e["ts"], reverse=True)
        created = sum(1 for e in day_events if e["kind"] == "created")
        completed = sum(1 for e in day_events if e["kind"] == "completed")
        # session detection: clusters of completions within 30 min
        comp_ts = sorted(parse_ts(e["ts"]).timestamp() for e in day_events if e["kind"] == "completed")
        sessions = 0
        if comp_ts:
            sessions = 1
            for i in range(1, len(comp_ts)):
                if comp_ts[i] - comp_ts[i - 1] > 30 * 60:
                    sessions += 1
        groups.append({
            "date": day, "events": day_events[:12],
            "created": created, "completed": completed,
            "sessions": sessions,
            "project_names": sorted({(projects.get(e["project_id"]) or {}).get("name", "")
                                     for e in day_events if e.get("project_id")}),
        })
    return jsonify({"groups": groups[:10], "today": now_iso_safe(today)})


@app.route("/api/analytics/radar", methods=["GET"])
def analytics_radar():
    """This period vs previous period across 6 dimensions (0–100 each)."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "30"))
    until = _todoist_today(payload)
    mid = until - timedelta(days=window)
    cur_since = mid
    prev_since = mid - timedelta(days=window)

    def period(s, e):
        comp = [it for it in items if _in_window(it.get("completed_at"), s, e)]
        created = [it for it in items if _in_window(it.get("created_at"), s, e)]
        open_items = [it for it in items if not it.get("is_completed")]
        rate = len(comp) / max(1, len(comp) + len(open_items)) * 100
        # adherence
        dd = [it for it in comp if it.get("due_date")]
        met = sum(1 for it in dd
                  if parse_ts(it["completed_at"]) <= parse_ts(it["due_date"] + "T23:59:59Z"))
        adh = met / max(1, len(dd)) * 100
        # stability
        daily = Counter(_day_key(it.get("completed_at")) for it in comp)
        vals = list(daily.values()) or [0]
        mv = sum(vals) / len(vals)
        varv = sum((v - mv) ** 2 for v in vals) / len(vals)
        stability = max(0, 100 - min(100, varv * 4))
        # throughput (normalized to 0..100 against a soft cap)
        thr = min(100, len(comp) / max(1, window) * 14)  # ~14/day = 100
        # focus (inverse fragmentation proxy): fewer distinct projects/day
        proj_per_day = defaultdict(set)
        for it in comp:
            k = _day_key(it.get("completed_at"))
            if k and it.get("project_id"):
                proj_per_day[k].add(it["project_id"])
        breadth = sum(len(s) for s in proj_per_day.values()) / max(1, len(proj_per_day))
        # fewer distinct projects/day = more focused; 1 project → 100, ~6 → ~25
        focus = max(0, 100 - (breadth - 1) * 15)
        # backlog trend
        net = len(created) - len(comp)
        trend = max(0, 100 * (1 - max(-1, min(1, net / max(1, len(created))))))
        return {"Throughput": round(thr, 1), "Completion Rate": round(rate, 1),
                "Adherence": round(adh, 1), "Stability": round(stability, 1),
                "Focus": round(focus, 1), "Backlog Trend": round(trend, 1)}
    return jsonify({
        "window_days": window,
        "dimensions": ["Throughput", "Completion Rate", "Adherence", "Stability", "Focus", "Backlog Trend"],
        "current": period(cur_since, until),
        "previous": period(prev_since, mid),
    })


@app.route("/api/analytics/insights", methods=["GET"])
def analytics_insights():
    """Auto-generated plain-language findings (the S3* auditor voice)."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    today = _todoist_today(payload)
    projects = {p["id"]: p for p in payload.get("projects", [])}
    findings = []
    completed_win = [it for it in items if _in_window(it.get("completed_at"), since, until)]

    # 1. peak weekday
    dow_counts = [0] * 7
    for it in completed_win:
        try:
            dow_counts[parse_ts(it["completed_at"]).weekday()] += 1
        except Exception:
            pass
    names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    if sum(dow_counts):
        peak_i = max(range(7), key=lambda i: dow_counts[i])
        ranked = sorted(range(7), key=lambda i: dow_counts[i], reverse=True)
        second = ranked[1]
        if dow_counts[second] > 0:
            ratio = round(dow_counts[peak_i] / max(1, dow_counts[second]), 1)
            findings.append({"kind": "rhythm", "tone": "info",
                "text": "Your peak day is %s — about %sx the activity of your next-busiest day (%s)."
                        % (names[peak_i], ratio, names[second])})

    # 2. P1 slip rate
    p1 = [it for it in items if it.get("priority") == 1 and it.get("due_date") and it.get("completed_at")
          and _in_window(it["completed_at"], since, until)]
    if p1:
        slipped = sum(1 for it in p1
                      if parse_ts(it["completed_at"]) > parse_ts(it["due_date"] + "T23:59:59Z"))
        pct = round(slipped / len(p1) * 100)
        if pct >= 25:
            findings.append({"kind": "priority", "tone": "danger",
                "text": "%d%% of P1 (critical) items completed this window missed their deadline — high-priority slippage." % pct})
        else:
            findings.append({"kind": "priority", "tone": "success",
                "text": "Only %d%% of P1 items missed deadline — critical commitments are holding." % pct})

    # 3. most overdue project
    overdue_by_proj = Counter()
    for it in items:
        if not it.get("is_completed") and it.get("due_date"):
            try:
                if parse_ts(it["due_date"] + "T00:00:00Z") < today:
                    overdue_by_proj[it.get("project_id")] += 1
            except Exception:
                pass
    if overdue_by_proj:
        pid, n = overdue_by_proj.most_common(1)[0]
        pname = (projects.get(pid) or {}).get("name", pid)
        findings.append({"kind": "risk", "tone": "warning",
            "text": '"%s" carries the heaviest overdue load (%d items past due). Focus here to relieve pressure.' % (pname, n)})

    # 4. backlog trajectory
    created_win = [it for it in items if _in_window(it.get("created_at"), since, until)]
    net = len(created_win) - len(completed_win)
    if net > 0:
        findings.append({"kind": "trajectory", "tone": "warning",
            "text": "You created %d more items than you completed this window — backlog is growing." % net})
    elif net < 0:
        findings.append({"kind": "trajectory", "tone": "success",
            "text": "You closed %d more items than you created — backlog is shrinking." % abs(net)})

    # 5. peak focus hour
    hours = [0] * 24
    for it in completed_win:
        try:
            hours[parse_ts(it["completed_at"]).hour] += 1
        except Exception:
            pass
    if sum(hours):
        ph = max(range(24), key=lambda h: hours[h])
        findings.append({"kind": "focus", "tone": "info",
            "text": "Your densest completion hour is %s — protect it for deep work." % format_hour(ph)})

    return jsonify({"window_days": window, "findings": findings[:6]})


# ── Personal Performance Goals (operational-health scorecard) ────────────────
#
# Generic, measurable performance goals (about HOW the agent operates, not WHAT
# they ship). Configuration: targets are self-imposed policy, editable here.
# Each KR binds a metric (computed below) to a target + direction.
PERFORMANCE_GOALS = [
    {"id": "reliable-execution", "name": "Execute reliably",
     "description": "Honor commitments — close what you promise, on time.",
     "family": "Commitment Reliability", "horizon": "rolling 30d",
     "key_results": [
         {"metric": "deadline_adherence", "target": 85, "direction": "gte", "unit": "%"},
         {"metric": "overdue_count", "target": 50, "direction": "lte", "unit": "items"},
         {"metric": "p1_slip_rate", "target": 20, "direction": "lte", "unit": "%"},
     ]},
    {"id": "steady-cadence", "name": "Sustain a steady cadence",
     "description": "Throughput that's predictable, not bursty.",
     "family": "Execution Throughput", "horizon": "rolling 30d",
     "key_results": [
         {"metric": "weekly_throughput", "target": 40, "direction": "gte", "unit": "/wk"},
         {"metric": "stability_variance", "target": 15, "direction": "lte", "unit": "σ²"},
         {"metric": "active_days_per_week", "target": 5, "direction": "gte", "unit": "days"},
     ]},
    {"id": "protect-focus", "name": "Protect deep-work capacity",
     "description": "Keep focus coherent; resist fragmentation.",
     "family": "Capacity / Focus", "horizon": "rolling 30d",
     "key_results": [
         {"metric": "fragmentation_index", "target": 50, "direction": "lte", "unit": "0-100"},
         {"metric": "weekend_overflow", "target": 15, "direction": "lte", "unit": "%"},
         {"metric": "peak_window_utilization", "target": 60, "direction": "gte", "unit": "%"},
     ]},
    {"id": "healthy-backlog", "name": "Keep the backlog healthy",
     "description": "A plate that's shrinking or stable, not stale.",
     "family": "Capacity Adherence", "horizon": "rolling 30d",
     "key_results": [
         {"metric": "backlog_netflow", "target": 0, "direction": "lte", "unit": "net"},
         {"metric": "max_open_age", "target": 90, "direction": "lte", "unit": "days"},
         {"metric": "cycle_p50", "target": 7, "direction": "lte", "unit": "days"},
     ]},
    {"id": "operate-sustainably", "name": "Operate sustainably",
     "description": "A viable operating system, not a sprint to burnout.",
     "family": "Viability Contribution", "horizon": "rolling 30d",
     "key_results": [
         {"metric": "productivity_index", "target": 70, "direction": "gte", "unit": "0-100"},
         {"metric": "backlog_pressure_index", "target": 40, "direction": "lte", "unit": "0-100"},
         {"metric": "review_cadence_consistency", "target": 75, "direction": "gte", "unit": "%"},
     ]},
]


def _performance_metrics(items, window, today, since, until):
    """Compute every metric referenced by PERFORMANCE_GOALS in one pass."""
    completed_win = [it for it in items if _in_window(it.get("completed_at"), since, until)]
    created_win = [it for it in items if _in_window(it.get("created_at"), since, until)]
    open_items = [it for it in items if not it.get("is_completed")]
    overdue = [it for it in open_items
               if it.get("due_date") and parse_ts(it["due_date"] + "T00:00:00Z") < today]

    # deadline adherence
    due_done = [it for it in completed_win if it.get("due_date")]
    met = sum(1 for it in due_done
              if parse_ts(it["completed_at"]) <= parse_ts(it["due_date"] + "T23:59:59Z"))
    adherence = met / max(1, len(due_done)) * 100
    # P1 slip rate
    p1 = [it for it in completed_win if it.get("priority") == 1 and it.get("due_date")]
    p1_slipped = sum(1 for it in p1
                     if parse_ts(it["completed_at"]) > parse_ts(it["due_date"] + "T23:59:59Z"))
    p1_slip_rate = p1_slipped / max(1, len(p1)) * 100
    # throughput + stability
    weeks = max(1.0, window / 7.0)
    weekly_throughput = len(completed_win) / weeks
    daily = Counter(_day_key(it.get("completed_at")) for it in completed_win)
    vals = list(daily.values()) or [0]
    mv = sum(vals) / len(vals)
    varv = sum((v - mv) ** 2 for v in vals) / len(vals)
    active_days_per_week = len(daily) / weeks
    # fragmentation (project/label breadth + within-day switches)
    by_day_proj = defaultdict(set)
    by_day_labels = defaultdict(set)
    by_day_seq = defaultdict(list)
    for it in completed_win:
        k = _day_key(it.get("completed_at"))
        if not k:
            continue
        if it.get("project_id"):
            by_day_proj[k].add(it["project_id"])
            by_day_seq[k].append((it["completed_at"], it["project_id"]))
        for lb in it.get("labels", []):
            by_day_labels[k].add(lb)
    proj_b = [len(s) for s in by_day_proj.values()] or [0]
    label_b = [len(s) for s in by_day_labels.values()] or [0]
    switches = []
    for k, seq in by_day_seq.items():
        seq.sort(key=lambda x: x[0])
        po = [p for _, p in seq]
        switches.append(sum(1 for i in range(1, len(po)) if po[i] != po[i - 1]))

    def _norm(vs):
        if not vs:
            return 0.0
        p90 = _percentile(sorted(vs), 90) or 1.0
        return min(1.0, (sum(vs) / len(vs)) / p90)
    fragmentation = (_norm(proj_b) * 0.35 + _norm(label_b) * 0.30 + _norm(switches) * 0.35) * 100
    # weekend overflow + peak-window utilization
    weekend_done = sum(1 for it in completed_win
                       if _day_key(it.get("completed_at"))
                       and parse_ts(it["completed_at"]).weekday() >= 5)
    weekend_overflow = weekend_done / max(1, len(completed_win)) * 100
    hours = [0] * 24
    for it in completed_win:
        try:
            hours[parse_ts(it["completed_at"]).hour] += 1
        except Exception:
            pass
    top2 = sorted(range(24), key=lambda h: hours[h], reverse=True)[:2]
    peak_util = sum(hours[h] for h in top2) / max(1, len(completed_win)) * 100
    # backlog
    netflow = len(created_win) - len(completed_win)
    ages = []
    for it in open_items:
        try:
            ages.append((today - parse_ts(it["created_at"])).total_seconds() / 86400.0)
        except Exception:
            pass
    max_open_age = max(ages) if ages else 0.0
    cycles = sorted(
        (parse_ts(it["completed_at"]) - parse_ts(it["created_at"])).total_seconds() / 86400.0
        for it in completed_win if it.get("completed_at"))
    cycle_p50 = _percentile(cycles, 50) if cycles else 0.0
    # composite indices
    comp_rate = len(completed_win) / max(1, len(completed_win) + len(open_items)) * 100
    consistency = max(0.0, 100.0 - min(100.0, varv * 4))
    trajectory = max(0.0, 100.0 * (1 - max(-1.0, min(1.0, netflow / max(1, len(created_win))))))
    productivity = comp_rate * 0.30 + adherence * 0.30 + consistency * 0.20 + trajectory * 0.20
    open_load = len(open_items) / max(1, len(items))
    overdue_w = len(overdue) / max(1, len(open_items))
    aging_f = min(1.0, (sum(ages) / len(ages) / 90.0) if ages else 0.0)
    imbalance = max(0.0, min(1.0, netflow / max(1, len(created_win))))
    pressure = (open_load * 0.30 + overdue_w * 0.30 + aging_f * 0.25 + imbalance * 0.15) * 100
    # review cadence consistency
    review_weeks = set()
    for it in completed_win:
        if it.get("is_recurring") and "review" in (it.get("content", "").lower()):
            try:
                iso = parse_ts(it["completed_at"]).isocalendar()
                review_weeks.add((iso[0], iso[1]))
            except Exception:
                pass
    review_consistency = min(100.0, len(review_weeks) / weeks * 100)
    return {
        "deadline_adherence": round(adherence, 1),
        "overdue_count": len(overdue),
        "p1_slip_rate": round(p1_slip_rate, 1),
        "weekly_throughput": round(weekly_throughput, 1),
        "stability_variance": round(varv, 1),
        "active_days_per_week": round(active_days_per_week, 1),
        "fragmentation_index": round(fragmentation, 1),
        "weekend_overflow": round(weekend_overflow, 1),
        "peak_window_utilization": round(peak_util, 1),
        "backlog_netflow": netflow,
        "max_open_age": round(max_open_age, 1),
        "cycle_p50": round(cycle_p50, 1),
        "productivity_index": round(productivity, 1),
        "backlog_pressure_index": round(pressure, 1),
        "review_cadence_consistency": round(review_consistency, 1),
    }


def _evaluate_goal(goal, metrics):
    krs = []
    for kr in goal["key_results"]:
        cur = metrics.get(kr["metric"], 0)
        tgt = kr["target"]
        if kr["direction"] == "gte":
            progress = (min(100.0, cur / tgt * 100) if tgt else (100.0 if cur > 0 else 0.0))
        else:  # lte
            if cur <= tgt:
                progress = 100.0
            else:
                progress = (max(0.0, tgt / cur * 100) if cur else 100.0)
        status = "on-track" if progress >= 100 else ("at-risk" if progress >= 60 else "off-track")
        krs.append({
            "metric": kr["metric"], "label": kr["metric"].replace("_", " "),
            "target": tgt, "direction": kr["direction"], "unit": kr["unit"],
            "current": cur, "progress": round(progress, 1), "status": status,
        })
    goal_progress = round(sum(k["progress"] for k in krs) / len(krs), 1) if krs else 0
    goal_status = "on-track" if goal_progress >= 90 else ("at-risk" if goal_progress >= 60 else "off-track")
    out = dict(goal)
    out.pop("key_results", None)
    out["key_results"] = krs
    out["progress"] = goal_progress
    out["status"] = goal_status
    return out


@app.route("/api/analytics/performance", methods=["GET"])
def analytics_performance():
    """Personal Performance scorecard: goals → key results → progress/status."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "30"))
    since, until = _window_bounds(payload, window)
    today = _todoist_today(payload)
    metrics = _performance_metrics(items, window, today, since, until)
    goals = [_evaluate_goal(g, metrics) for g in PERFORMANCE_GOALS]
    overall = round(sum(g["progress"] for g in goals) / len(goals), 1) if goals else 0
    verdict = "on-track" if overall >= 90 else ("at-risk" if overall >= 60 else "off-track")
    on = sum(1 for g in goals if g["status"] == "on-track")
    return jsonify({
        "window_days": window,
        "overall_progress": overall,
        "verdict": verdict,
        "goals_on_track": on,
        "goals_total": len(goals),
         "metrics": metrics,
         "goals": goals,
     })


# ── Markov state model (item-lifecycle transition matrix) ────────────────────
MARKOV_STATES = ['inbox', 'scheduled', 'active', 'overdue', 'stale',
                 'done_on_time', 'done_late']
MARKOV_ABSORBING = {'done_on_time', 'done_late'}
MARKOV_LABELS = {
    'inbox': 'Inbox', 'scheduled': 'Scheduled', 'active': 'Active',
    'overdue': 'Overdue', 'stale': 'Stale',
    'done_on_time': 'Done on-time', 'done_late': 'Done late',
}
MARKOV_COLORS = {
    'inbox': '#8C877B', 'scheduled': '#3F6092', 'active': '#A8854A',
    'overdue': '#A33434', 'stale': '#6B5B95',
    'done_on_time': '#3F6E50', 'done_late': '#962030',
}
# Diagnostic transitions tracked across the historical evolution. Chosen for
# signal: each varies month-to-month and carries an operational reading.
MARKOV_KEY_TRANSITIONS = [
    ('active', 'done_on_time'),   # on-time close efficiency
    ('active', 'overdue'),        # slippage rate (the failure mode)
    ('scheduled', 'done_on_time'),  # planned-work realization
    ('overdue', 'done_late'),     # recovery-to-done (even if late)
]


def _item_state_on_day(it, day):
    """Classify an item's state on a given UTC date. None if item not yet created."""
    created = parse_ts(it["created_at"]).date()
    if day < created:
        return None
    comp_ts = it.get("completed_at")
    comp = parse_ts(comp_ts).date() if comp_ts else None
    due = it.get("due_date")
    if comp is not None and day >= comp:
        if due:
            due_d = parse_ts(due + "T00:00:00Z").date()
            return "done_late" if comp > due_d else "done_on_time"
        return "done_on_time"
    # still open on this day
    if due:
        due_d = parse_ts(due + "T00:00:00Z").date()
        if due_d < day:
            return "overdue"
        if due_d <= day + timedelta(days=1):
            return "active"
        return "scheduled"
    age = (day - created).days
    return "inbox" if age <= 7 else "stale"


def _compute_markov(items, since, until):
    """Walk each item day-by-day in [since, until]; count state transitions.

    Returns (counts, matrix, visits, fate) where matrix rows are normalized to
    probabilities, visits = item-days spent in each state, and fate = observed
    outcome of items that passed through each transient state.
    """
    n = len(MARKOV_STATES)
    idx = {s: i for i, s in enumerate(MARKOV_STATES)}
    counts = [[0] * n for _ in range(n)]
    visits = [0] * n
    # fate[state][outcome] = # items that hit `state` and ended as `outcome`
    fate = {s: {"done_on_time": 0, "done_late": 0, "open": 0} for s in MARKOV_STATES
            if s not in MARKOV_ABSORBING}
    since_d = since.date()
    until_d = until.date()
    for it in items:
        try:
            created = parse_ts(it["created_at"]).date()
        except Exception:
            continue
        comp_ts = it.get("completed_at")
        comp = parse_ts(comp_ts).date() if comp_ts else None
        start = max(created, since_d)
        end = min(comp or until_d, until_d)
        if start > end:
            continue
        # final outcome for fate tracking
        if comp is not None:
            outcome = "done_late" if (it.get("due_date") and comp >
                                      parse_ts(it["due_date"] + "T00:00:00Z").date()) else "done_on_time"
        else:
            outcome = "open"
        seen_states = set()
        day = start
        prev = None
        while day <= end:
            cur = _item_state_on_day(it, day)
            if cur is None:
                day += timedelta(days=1)
                continue
            visits[idx[cur]] += 1
            seen_states.add(cur)
            if prev is not None:
                counts[idx[prev]][idx[cur]] += 1
            prev = cur
            if cur in MARKOV_ABSORBING:
                break
            day += timedelta(days=1)
        # attribute fate: every transient state this item visited gets its outcome
        for s in seen_states:
            if s not in MARKOV_ABSORBING:
                fate[s][outcome] += 1
    # normalize rows → probabilities
    matrix = []
    for i in range(n):
        rs = sum(counts[i])
        if rs:
            matrix.append([round(c / rs, 4) for c in counts[i]])
        else:
            matrix.append([1.0 if (i == j and MARKOV_STATES[i] in MARKOV_ABSORBING) else 0.0
                           for j in range(n)])
    return counts, matrix, visits, fate


@app.route("/api/analytics/markov", methods=["GET"])
def analytics_markov():
    """Markov transition matrix over item lifecycle states (chosen window)."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    window = int(request.args.get("window", "90"))
    since, until = _window_bounds(payload, window)
    counts, matrix, visits, fate = _compute_markov(items, since, until)
    total_visits = max(1, sum(visits))
    return jsonify({
        "window_days": window,
        "states": [{"id": s, "label": MARKOV_LABELS[s], "color": MARKOV_COLORS[s],
                    "absorbing": s in MARKOV_ABSORBING,
                    "visits": visits[i], "visit_share": round(visits[i] / total_visits, 4)}
                   for i, s in enumerate(MARKOV_STATES)],
        "matrix": matrix,
        "counts": counts,
        "fate": {s: {"done_on_time": f["done_on_time"], "done_late": f["done_late"],
                     "open": f["open"],
                     "total": sum(f.values()),
                     "on_time_rate": round(f["done_on_time"] / max(1, sum(f.values())) * 100, 1)}
                 for s, f in fate.items()},
    })


@app.route("/api/analytics/markov-evolution", methods=["GET"])
def analytics_markov_evolution():
    """Monthly sequence of transition matrices + key-transition time series."""
    payload = _load_todoist()
    items = _an_filter_items(payload.get("items", []), request.args)
    months_n = int(request.args.get("months", "6"))
    until = _todoist_today(payload)
    y, m = until.year, until.month
    month_list = []
    for _ in range(months_n):
        month_list.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    month_list.reverse()
    idx = {s: i for i, s in enumerate(MARKOV_STATES)}
    series = {f"{a}→{b}": [] for a, b in MARKOV_KEY_TRANSITIONS}
    out_months = []
    for (yy, mm) in month_list:
        start = datetime(yy, mm, 1, tzinfo=timezone.utc)
        end = datetime(yy + (1 if mm == 12 else 0), 1 + (mm % 12), 1, tzinfo=timezone.utc)
        _, matrix, _, _ = _compute_markov(items, start, end)
        out_months.append({"year": yy, "month": mm, "label": start.strftime("%b"),
                           "matrix": matrix})
        for a, b in MARKOV_KEY_TRANSITIONS:
            series[f"{a}→{b}"].append(round(matrix[idx[a]][idx[b]] * 100, 1))
    labels = [datetime(yy, mm, 1).strftime("%b") for yy, mm in month_list]
    return jsonify({
        "months": months_n,
        "labels": labels,
        "month_matrices": out_months,
        "key_transitions": [{"name": k, "values": v} for k, v in series.items()],
    })


# ============================================================================
# Dashboard stats & Derivative (export/import)
# ============================================================================
@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    actions = load(ACTIONS_PATH)
    blocks = load(BLOCKS_PATH)
    by_kind = Counter(a.get("kind") for a in actions)
    by_sched = Counter(a.get("scheduling_state") for a in actions)
    total_minutes = sum(
        int((parse_ts(b["ends_at"]) - parse_ts(b["starts_at"])).total_seconds() / 60)
        for b in blocks if b.get("status") not in ("cancelled", "completed"))
    blocked = sum(1 for a in actions
                  if any(d["kind"] == "blocked-by" for d in a.get("dependencies", [])))
    return jsonify({
        "total_actions": len(actions),
        "by_kind": dict(by_kind),
        "by_scheduling_state": dict(by_sched),
        "pinned": sum(1 for a in actions if a.get("pinned")),
        "total_blocks": len(blocks),
        "confirmed_blocks": sum(1 for b in blocks if b.get("status") == "confirmed"),
        "conflicts": sum(len(b.get("conflict_flags", [])) for b in blocks),
        "scheduled_minutes": total_minutes,
        "blocked_actions": blocked,
        "google_status": _gc_status(),
    })


@app.route("/api/export", methods=["GET"])
def export_data():
    payload = {"actions": load(ACTIONS_PATH), "blocks": load(BLOCKS_PATH)}
    return Response(json.dumps(payload, indent=2, default=str),
                    mimetype="application/json",
                    headers={"Content-Disposition": "attachment;filename=pwos_export.json"})


@app.route("/api/import", methods=["POST"])
def import_data():
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"error": "Expected {actions:[...], blocks:[...]}"}), 400
    actions = load(ACTIONS_PATH)
    blocks = load(BLOCKS_PATH)
    a_existing = {a["id"] for a in actions}
    b_existing = {b["id"] for b in blocks}
    ai = bi = 0
    for item in data.get("actions", []):
        if item.get("id") and item["id"] not in a_existing:
            actions.append(item); a_existing.add(item["id"]); ai += 1
    for item in data.get("blocks", []):
        if item.get("id") and item["id"] not in b_existing:
            blocks.append(item); b_existing.add(item["id"]); bi += 1
    save(ACTIONS_PATH, actions)
    save(BLOCKS_PATH, blocks)
    return jsonify({"imported_actions": ai, "imported_blocks": bi,
                    "total_actions": len(actions), "total_blocks": len(blocks)})


# ============================================================================
# Documentation
# ============================================================================
@app.route("/docs")
def docs_page():
    return send_from_directory(app.static_folder, "docs.html")


# ============================================================================
# Static serving
# ============================================================================
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)
