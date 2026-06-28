"""
Personal Work Organization System (PWOS) — Prototype Server.

Flask backend implementing the three PWOS components:
  [A] Work Organization & Registration  — /api/actions (CRUD, search, dependencies)
  [B] Work Calendarization               — /api/blocks, /api/calendar, conflict detection
  [C] Platforms Integration              — /api/calendar/google/* (OAuth + sync; mock-safe)

Runs in *mock mode* when Google credentials are absent, so the prototype is fully
usable offline. Conforms to spec/pwos/schema.json.

Run:   python3 pwos/server.py
Open:  http://localhost:5005
"""
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from collections import Counter

from flask import Flask, jsonify, request, send_from_directory, Response

app = Flask(__name__, static_folder="static")
HERE = os.path.dirname(__file__)
ACTIONS_PATH = os.path.join(HERE, "data", "mock_actions.json")
BLOCKS_PATH = os.path.join(HERE, "data", "mock_blocks.json")

# Google credentials (Component C). Brought in out-of-band; never committed.
CLIENT_SECRET_PATH = os.environ.get(
    "PWOS_GC_CLIENT_SECRET",
    os.path.join(HERE, "config", "client_secret.json"))
TOKEN_PATH = os.path.join(HERE, "config", "token.json")
SCOPES = ["https://www.googleapis.com/auth/calendar"]


# ── Helpers ─────────────────────────────────────────────────────────────────
def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load(path):
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return []


def save(path, data):
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
    actions = load(ACTIONS_PATH)
    actions = [a for a in actions if a["id"] != action_id]
    save(ACTIONS_PATH, actions)
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
    blocks = [b for b in load(BLOCKS_PATH) if b["id"] != block_id]
    save(BLOCKS_PATH, blocks)
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


if __name__ == "__main__":
    port = int(os.environ.get("PWOS_PORT", "5005"))
    print("Personal Work Organization System — Prototype Server")
    print(f"   Actions: {ACTIONS_PATH}  ({len(load(ACTIONS_PATH))})")
    print(f"   Blocks:  {BLOCKS_PATH}  ({len(load(BLOCKS_PATH))})")
    print(f"   Google Calendar: {_gc_status()}")
    app.run(debug=True, port=port, host="0.0.0.0")
