"""Asynchronous keystream processing for PKTS.

Raw batches (posted to ``/api/ingest``) live in CouchDB db ``pkts_raw`` as
documents of shape::

    {id, doc_type:"batch", received_at, processed:bool,
     source_info:{}, device_info:{}, events:[RawEvent]}

where each ``RawEvent`` is the minimal tuple a keylogger can emit without
privileged access::

    {key, key_code, event_type:"key_down"|"key_up",
     modifiers:[], hw_time_ms:int}

(``hw_time_ms`` is a Unix-epoch millisecond timestamp.)

:func:`process_pending` is the RQ job entrypoint. It drains every unprocessed
batch in arrival order, pairs ``key_down``/``key_up`` events, derives the full
``KeystrokeEvent`` schema defined in ``spec/pkts/schema.json`` (hold/flight/
digraph timing, words-per-minute, sessionization, hand/finger metadata), and
writes the result into CouchDB db ``pkts`` — the database the
``/api/keystrokes`` endpoint serves to the web client.

The full keystroke log is preserved: ``auto_repeat`` events from the collector
are emitted as their own ``KeystrokeEvent`` records (``event_type`` =
``auto_repeat``, ``hold_time_ms`` = null) interleaved with the paired
``key_down`` records by timestamp. ``key_up`` is encoded implicitly via each
press's ``hold_time_ms``.

Cross-batch continuity (previous key, open session, monotonic session and
event counters) is persisted in a single cursor document in ``pkts_raw`` so
consecutive ingests stitch into one coherent timeline rather than isolated
windows.
"""
import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store

SESSION_GAP_MS = 30_000
WORD_MS = 12_000  # 60000 ms/min ÷ 5 chars/word

FINGERS = {
    "L-pinky": "`1qaz", "L-ring": "2wsx", "L-mid": "3edc", "L-index": "45rfvtgb",
    "R-index": "6yhnujm", "R-mid": "7ik,", "R-ring": "8ol.", "R-pinky": "9p;/0-=][\\'",
}
FINGER_OF = {k: f for f, ks in FINGERS.items() for k in ks}
HAND_OF = {f: "L" if f.startswith("L") else "R" for f in FINGERS}
LEFT_KEYS = set("qwertasdfgzxcvb12345")


def _stable_event_id(seq):
    digest = hashlib.sha256(f"pkts-{seq}".encode()).hexdigest()[:10].upper()
    return f"EVT-{digest}"


def _iso_from_epoch_ms(ms):
    from datetime import datetime, timezone
    return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def _date_key_from_epoch_ms(ms):
    return _iso_from_epoch_ms(ms)[:10].replace("-", "")


def _load_cursor(raw_store):
    cursor = raw_store.get("cursor")
    if not cursor:
        cursor = {
            "id": "cursor",
            "doc_type": "cursor",
            "last_event_time_ms": None,
            "last_key": None,
            "session_counter": 0,
            "last_session_id": None,
            "session_start_ms": None,
            "event_seq": 0,
        }
    cursor.setdefault("doc_type", "cursor")
    cursor.setdefault("event_seq", 0)
    return cursor


def _open_session(cursor, first_ms):
    cursor["session_counter"] = cursor.get("session_counter", 0) + 1
    cursor["session_start_ms"] = first_ms
    sid = "SES-{}-{:03d}".format(_date_key_from_epoch_ms(first_ms),
                                 cursor["session_counter"])
    cursor["last_session_id"] = sid
    return sid


def _source_block(batch):
    info = batch.get("source_info", {}) or {}
    return {
        "platform": info.get("platform", "unknown"),
        "capture_scope": info.get("capture_scope", "application_local"),
        "collector": info.get("collector", "pkts-collector"),
        "collector_version": info.get("collector_version", "0.0.0"),
    }


def _device_block(batch):
    info = batch.get("device_info", {}) or {}
    return {
        "device_id": info.get("device_id", "unknown"),
        "hostname": info.get("hostname", "unknown"),
        "machine_type": info.get("machine_type", "unknown"),
        "os": info.get("os", {}),
    }


def _keyboard_block(batch):
    info = batch.get("device_info", {}) or {}
    return {
        "keyboard_id": info.get("keyboard_id", "unknown"),
        "layout": info.get("layout", "us"),
        "connection_type": info.get("connection_type", "unknown"),
    }


def _classify_task(key, mods, application):
    if any(m in mods for m in ("ctrl", "alt", "meta")):
        return "terminal" if application == "Terminal" else "coding"
    if application == "Terminal":
        return "terminal"
    if application in ("Code", "Vim", "Emacs"):
        return "coding"
    if application in ("Firefox", "Chrome"):
        return "navigation"
    return "writing"


def _derive_event(raw_ev, t, cursor, batch, source, device, keyboard,
                  event_type="key_down", up_t=None):
    key = raw_ev.get("key") or ""
    key_code = raw_ev.get("key_code") or key or "Unknown"
    mods = list(dict.fromkeys(raw_ev.get("modifiers", []) or []))

    prev_down_ms = cursor.get("last_event_time_ms")
    prev_key = cursor.get("last_key")

    if (prev_down_ms is None
            or cursor.get("last_session_id") is None
            or (t - prev_down_ms) > SESSION_GAP_MS):
        sid = _open_session(cursor, t)
    else:
        sid = cursor["last_session_id"]

    session_start_ms = cursor["session_start_ms"]
    flight = (t - prev_down_ms) if prev_down_ms is not None else None
    hold = (up_t - t) if up_t is not None else None
    digraph = (flight if (prev_key and prev_key not in ("space", "enter")
                          and key not in ("space", "enter")
                          and flight is not None) else None)
    wpm = max(5.0, min(140.0, WORD_MS / max(1.0, flight))) if flight else None

    seq = cursor.get("event_seq", 0)
    cursor["event_seq"] = seq + 1
    cursor["last_event_time_ms"] = t
    cursor["last_key"] = key
    event_id = _stable_event_id(seq)

    finger = FINGER_OF.get(key.lower())
    if finger:
        hand = HAND_OF[finger]
    else:
        hand = "L" if (key and key.lower() in LEFT_KEYS) else "R"

    app = (raw_ev.get("application_name")
           or (batch.get("device_info", {}) or {}).get("application_name")
           or "unknown")
    window_title = raw_ev.get("window_title") or ""
    focused_window_id = raw_ev.get("focused_window_id") or ""
    context = {
        "language": (batch.get("device_info", {}) or {}).get("language", "en"),
        "task_type": _classify_task(key, mods, app),
        "application_name": app,
        "window_title": window_title,
        "focused_window_id": focused_window_id,
        "input_field_type": (batch.get("device_info", {}) or {}).get("input_field_type", "other"),
    }

    return {
        "id": event_id,
        "doc_type": "event",
        "event_id": event_id,
        "timestamp_utc": _iso_from_epoch_ms(t),
        "local_timestamp": _iso_from_epoch_ms(t),
        "timezone": (batch.get("device_info", {}) or {}).get("timezone", "UTC"),
        "session_id": sid,
        "source": source,
        "device": device,
        "keyboard": keyboard,
        "event": {
            "event_type": event_type,
            "key": key,
            "key_code": key_code,
            "modifiers": mods,
            "is_composition": False,
            "is_shortcut": bool("ctrl" in mods or "meta" in mods or "alt" in mods),
        },
        "timing": {
            "event_time_ms": t,
            "hold_time_ms": round(hold, 1) if hold is not None else None,
            "flight_time_ms": round(flight, 1) if flight is not None else None,
            "digraph_latency_ms": round(digraph, 1) if digraph is not None else None,
            "typing_speed_wpm": round(wpm, 1) if wpm is not None else None,
            "session_elapsed_ms": t - session_start_ms,
        },
        "context": context,
        "environment": batch.get("environment", {}) or {},
        "tags": [],
        "metadata": {"hand": hand, "finger": finger or "R-index"},
    }


def _process_one(batch, cursor, proc_store):
    source = _source_block(batch)
    device = _device_block(batch)
    keyboard = _keyboard_block(batch)

    raw_events = batch.get("events", []) or []
    ordered = sorted(raw_events, key=lambda e: e.get("hw_time_ms", 0) or 0)

    pending_down = {}
    presses = []   # (down_ev, down_t, up_t)
    repeats = []   # (raw_ev, t)
    for ev in ordered:
        event_type = ev.get("event_type", "key_down")
        key_code = ev.get("key_code") or ev.get("key") or "Unknown"
        t = ev.get("hw_time_ms")
        if t is None:
            continue
        if event_type == "key_down":
            pending_down[key_code] = (ev, t)
        elif event_type == "key_up":
            down = pending_down.pop(key_code, None)
            if down is None:
                continue
            presses.append((down[0], down[1], t))
        elif event_type == "auto_repeat":
            repeats.append((ev, t))

    emits = ([("press", p[1], p) for p in presses]
             + [("repeat", r[1], r) for r in repeats])
    emits.sort(key=lambda x: x[1])

    emitted = 0
    for _kind, _t, item in emits:
        if _kind == "press":
            down_ev, down_t, up_t = item
            doc = _derive_event(down_ev, down_t, cursor, batch,
                               source, device, keyboard,
                               event_type="key_down", up_t=up_t)
        else:
            raw_ev, t = item
            doc = _derive_event(raw_ev, t, cursor, batch,
                               source, device, keyboard,
                               event_type="auto_repeat", up_t=None)
        proc_store.put(doc)
        emitted += 1
    return emitted


def process_pending():
    """Drain every unprocessed raw batch and emit schema-conforming events.

    Returns a small status dict. Idempotent: a batch marked ``processed`` is
    skipped on subsequent runs, so re-enqueueing (or running the job manually)
    is always safe. Designed to be enqueued by ``/api/ingest`` and executed by
    an RQ worker (``python3 pkts/worker.py``).
    """
    raw_store = Store("pkts_raw")
    proc_store = Store("pkts")
    cursor = _load_cursor(raw_store)

    batches = [b for b in raw_store.all()
               if b.get("doc_type") == "batch" and not b.get("processed")]
    batches.sort(key=lambda b: b.get("received_at", ""))

    total_emitted = 0
    for batch in batches:
        try:
            total_emitted += _process_one(batch, cursor, proc_store)
        except Exception as exc:
            batch["process_error"] = str(exc)
        batch["processed"] = True
        raw_store.put(batch)

    raw_store.put(cursor)
    return {"processed_batches": len(batches), "emitted_events": total_emitted}


if __name__ == "__main__":
    result = process_pending()
    print(result)
