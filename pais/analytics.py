"""App-interaction analytics: the join of PAIS mouse/focus + PKTS keystrokes.

This module is the analytical core of PAIS. It reads:

- PAIS processed events (CouchDB db ``pais``) — mouse interactions and focus
  segments, owned by PAIS.
- PKTS processed events (CouchDB db ``pkts``) — keystrokes, owned by PKTS,
  read **only** here (PAIS never writes to it).

Both streams carry the same application attribution (sourced from
:mod:`shared.focus_watcher`), so the join key is simply the application name:
PAIS ``focus.app`` / ``mouse.focus.app`` against PKTS
``context.application_name``.

:func:`compute_analytics` returns a single JSON-serialisable dict with:

- ``window`` — time bounds of the analysis.
- ``totals`` — global counts (active time, keystrokes, clicks, scrolls, …).
- ``apps`` — per-application breakdown: time, keystrokes, clicks,
  keys-per-click, switches, fragmentation index, movement distance.
- ``timeline`` — coarse time-bucketed activity series (for the UI sparkline).
- ``idle_gaps`` — detected idle periods (no input for > ``IDLE_GAP_MS``).
"""
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store, StoreError

IDLE_GAP_MS = 60_000          # ≥ 60 s of no input → idle
TIMELINE_BUCKET_S = 300       # 5-minute buckets


def _parse_iso(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _ms_from_iso(s):
    dt = _parse_iso(s)
    return int(dt.timestamp() * 1000) if dt else None


def _safe_iter(store_name):
    """Read every doc from a store; return [] if the store is unreachable.

    The PKTS join is best-effort: if the ``pkts`` db does not exist yet (PKTS
    not deployed) analytics still works on the mouse/focus data alone.
    """
    try:
        return Store(store_name).all()
    except StoreError:
        return []


def _load_events(since=None, until=None, app_filter=None):
    since_ms = _ms_from_iso(since) if since else None
    until_ms = _ms_from_iso(until) if until else None

    pais_docs = _safe_iter("pais")
    pkts_docs = _safe_iter("pkts")

    mouse, focus, keystrokes = [], [], []
    for d in pais_docs:
        if d.get("doc_type") != "event":
            continue
        t = d.get("mouse", {}).get("hw_time_ms") if d.get("doc_kind") == "mouse" \
            else d.get("focus", {}).get("started_ms")
        if t is None:
            continue
        if since_ms and t < since_ms:
            continue
        if until_ms and t > until_ms:
            continue
        if d.get("doc_kind") == "mouse":
            mouse.append(d)
        elif d.get("doc_kind") == "focus":
            focus.append(d)
    for d in pkts_docs:
        if d.get("doc_type") != "event":
            continue
        t = d.get("timing", {}).get("event_time_ms")
        if t is None:
            continue
        if since_ms and t < since_ms:
            continue
        if until_ms and t > until_ms:
            continue
        keystrokes.append(d)

    if app_filter:
        mouse = [e for e in mouse
                 if e.get("focus", {}).get("app") == app_filter]
        focus = [e for e in focus
                 if e.get("focus", {}).get("app") == app_filter]
        keystrokes = [e for e in keystrokes
                      if e.get("context", {}).get("application_name") == app_filter]

    return mouse, focus, keystrokes


def _per_app_keystrokes(keystrokes):
    by_app = defaultdict(int)
    for ev in keystrokes:
        app = ev.get("context", {}).get("application_name", "unknown")
        by_app[app] += 1
    return by_app


def _timeline(mouse, keystrokes, focus):
    """5-minute buckets of (keystrokes, clicks, scrolls) for the sparkline."""
    buckets = defaultdict(lambda: {"keystrokes": 0, "clicks": 0, "scrolls": 0,
                                   "active_ms": 0})
    for ev in keystrokes:
        t = ev.get("timing", {}).get("event_time_ms")
        if t is None:
            continue
        b = t // (TIMELINE_BUCKET_S * 1000) * (TIMELINE_BUCKET_S * 1000)
        buckets[b]["keystrokes"] += 1
    for ev in mouse:
        m = ev.get("mouse", {})
        t = m.get("hw_time_ms")
        if t is None:
            continue
        b = t // (TIMELINE_BUCKET_S * 1000) * (TIMELINE_BUCKET_S * 1000)
        et = m.get("event_type")
        if et == "click_down":
            buckets[b]["clicks"] += 1
        elif et == "scroll":
            buckets[b]["scrolls"] += 1
    for ev in focus:
        f = ev.get("focus", {})
        dur = f.get("duration_ms", 0) or 0
        if dur <= 0:
            continue
        start = f.get("started_ms")
        if start is None:
            continue
        b = start // (TIMELINE_BUCKET_S * 1000) * (TIMELINE_BUCKET_S * 1000)
        buckets[b]["active_ms"] += dur

    series = [{"bucket_ms": b, **v} for b, v in sorted(buckets.items())]
    return series


def _idle_gaps(mouse, keystrokes):
    """Detect idle periods from the merged input-event timeline."""
    times = []
    for ev in mouse:
        t = ev.get("mouse", {}).get("hw_time_ms")
        if t:
            times.append(t)
    for ev in keystrokes:
        t = ev.get("timing", {}).get("event_time_ms")
        if t:
            times.append(t)
    times.sort()
    gaps = []
    for a, b in zip(times, times[1:]):
        if b - a >= IDLE_GAP_MS:
            gaps.append({"from_ms": a, "to_ms": b, "duration_ms": b - a})
    return gaps


def compute_analytics(since=None, until=None, app=None):
    """Compute the full app-interaction analytics payload.

    Returns a JSON-serialisable dict. Never raises on missing stores: the PKTS
    join degrades to zero keystrokes if the ``pkts`` db is absent.
    """
    mouse, focus, keystrokes = _load_events(since, until, app)

    # Time window (from real event timestamps, not from query bounds).
    all_times = (
        [e.get("mouse", {}).get("hw_time_ms") for e in mouse]
        + [e.get("focus", {}).get("started_ms") for e in focus]
        + [e.get("timing", {}).get("event_time_ms") for e in keystrokes]
    )
    all_times = [t for t in all_times if t]
    window = {
        "from_ms": min(all_times) if all_times else None,
        "to_ms": max(all_times) if all_times else None,
        "filtered_app": app,
    }

    # Per-app aggregation.
    apps = {}
    keys_by_app = _per_app_keystrokes(keystrokes)

    # Seed every app seen in any stream so apps with only keystrokes (no focus
    # segment yet) still appear.
    seen_apps = set(keys_by_app)
    for ev in focus:
        seen_apps.add(ev.get("focus", {}).get("app", "unknown"))
    for ev in mouse:
        seen_apps.add(ev.get("focus", {}).get("app", "unknown"))

    for a in seen_apps:
        apps[a] = {
            "app": a,
            "time_ms": 0,
            "keystrokes": keys_by_app.get(a, 0),
            "clicks": 0,
            "scrolls": 0,
            "move_samples": 0,
            "movement_distance": 0,
            "switches": 0,
            "focus_segments": 0,
            "longest_segment_ms": 0,
        }

    for ev in focus:
        f = ev.get("focus", {})
        a = f.get("app", "unknown")
        dur = f.get("duration_ms", 0) or 0
        apps.setdefault(a, {"app": a, "time_ms": 0, "keystrokes": 0, "clicks": 0,
                            "scrolls": 0, "move_samples": 0, "movement_distance": 0,
                            "switches": 0, "focus_segments": 0, "longest_segment_ms": 0})
        apps[a]["time_ms"] += dur
        apps[a]["focus_segments"] += 1
        apps[a]["longest_segment_ms"] = max(apps[a]["longest_segment_ms"], dur)

    for ev in mouse:
        m = ev.get("mouse", {})
        a = ev.get("focus", {}).get("app", "unknown")
        apps.setdefault(a, {"app": a, "time_ms": 0, "keystrokes": 0, "clicks": 0,
                            "scrolls": 0, "move_samples": 0, "movement_distance": 0,
                            "switches": 0, "focus_segments": 0, "longest_segment_ms": 0})
        et = m.get("event_type")
        if et == "click_down":
            apps[a]["clicks"] += 1
        elif et == "scroll":
            apps[a]["scrolls"] += 1
        elif et == "move_sample":
            apps[a]["move_samples"] += 1
            apps[a]["movement_distance"] += abs(m.get("dx") or 0) + abs(m.get("dy") or 0)

    # Switches = number of focus segments whose immediate predecessor was a
    # different app (computed from the ordered focus timeline).
    focus_ordered = sorted(focus, key=lambda e: e.get("focus", {}).get("started_ms", 0))
    prev_app = None
    for ev in focus_ordered:
        a = ev.get("focus", {}).get("app", "unknown")
        if prev_app is not None and a != prev_app:
            apps[a]["switches"] += 1
        prev_app = a

    # Derived ratios.
    app_list = list(apps.values())
    for a in app_list:
        clicks = a["clicks"] or 1
        a["keys_per_click"] = round(a["keystrokes"] / clicks, 2)
        segs = a["focus_segments"] or 1
        a["mean_segment_ms"] = round(a["time_ms"] / segs, 1)
        # Fragmentation index: lower mean segment → higher fragmentation (0..1).
        a["fragmentation"] = round(1.0 - min(1.0, a["mean_segment_ms"] / 60_000.0), 3)
    app_list.sort(key=lambda x: x["time_ms"], reverse=True)

    totals = {
        "active_time_ms": sum(a["time_ms"] for a in app_list),
        "keystrokes": sum(a["keystrokes"] for a in app_list),
        "clicks": sum(a["clicks"] for a in app_list),
        "scrolls": sum(a["scrolls"] for a in app_list),
        "move_samples": sum(a["move_samples"] for a in app_list),
        "movement_distance": sum(a["movement_distance"] for a in app_list),
        "app_count": len(app_list),
        "app_switches": sum(a["switches"] for a in app_list),
    }
    totals["keys_per_click"] = (round(totals["keystrokes"] / totals["clicks"], 2)
                                if totals["clicks"] else 0)

    return {
        "window": window,
        "totals": totals,
        "apps": app_list,
        "timeline": _timeline(mouse, keystrokes, focus),
        "idle_gaps": _idle_gaps(mouse, keystrokes),
    }
