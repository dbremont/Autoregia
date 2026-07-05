"""Asynchronous interaction processing for PAIS.

Raw batches (posted to ``/api/ingest``) live in CouchDB db ``pais_raw`` as
documents of shape::

    {id, doc_type:"batch", received_at, processed:bool,
     source_info:{}, device_info:{}, events:[RawEvent]}

where each ``RawEvent`` is emitted by :mod:`pais.collector` and is either a
mouse interaction or a completed focus segment::

    mouse  : {doc_kind:"mouse", event_type, button, x, y, dx, dy,
              scroll_axis, modifiers:[], hw_time_ms,
              focused_window_id, application_name, window_title}
    focus  : {doc_kind:"focus", started_ms, ended_ms, duration_ms,
              app, title, window_id, backend, hw_time_ms}

:func:`process_pending` is the RQ job entrypoint. It drains every unprocessed
batch in arrival order, pairs ``click_down``/``click_up`` (deriving
``click_dwell_ms``), sessionizes by idle gap, wraps each raw event into the
schema envelope defined in ``spec/pais/schema.json``, and writes the result
into CouchDB db ``pais`` — the database the read endpoints serve to the web
client and the analytics layer.

Cross-batch continuity (open session, monotonic event counter, in-flight
click presses) is persisted in a single cursor document in ``pais_raw`` so
consecutive ingests stitch into one coherent timeline.
"""
import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import Store

SESSION_GAP_MS = 30_000
CLICK_PAIR_TIMEOUT_MS = 2_000  # abandon pairing if no release within this window


def _stable_event_id(seq):
    digest = hashlib.sha256(f"pais-{seq}".encode()).hexdigest()[:10].upper()
    return f"PEVT-{digest}"


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
    sid = "PSES-{}-{:03d}".format(_date_key_from_epoch_ms(first_ms),
                                  cursor["session_counter"])
    cursor["last_session_id"] = sid
    return sid


def _session_for(cursor, t):
    prev = cursor.get("last_event_time_ms")
    if (prev is None
            or cursor.get("last_session_id") is None
            or (t - prev) > SESSION_GAP_MS):
        return _open_session(cursor, t)
    return cursor["last_session_id"]


def _source_block(batch):
    info = batch.get("source_info", {}) or {}
    return {
        "platform": info.get("platform", "unknown"),
        "capture_scope": info.get("capture_scope", "global"),
        "collector": info.get("collector", "pais-collector"),
        "collector_version": info.get("collector_version", "0.0.0"),
    }


def _device_block(batch):
    info = batch.get("device_info", {}) or {}
    return {
        "device_id": info.get("device_id", "unknown"),
        "hostname": info.get("hostname", "unknown"),
        "machine_type": info.get("machine_type", "unknown"),
        "os": info.get("os", {}),
        "pointer_id": info.get("pointer_id", "unknown"),
        "pointer_type": info.get("pointer_type", "unknown"),
    }


def _next_id(cursor):
    seq = cursor.get("event_seq", 0)
    cursor["event_seq"] = seq + 1
    return _stable_event_id(seq), seq


def _wrap_mouse(raw, cursor, batch, source, device, click_dwell_ms=None):
    t = raw.get("hw_time_ms")
    if t is None:
        return None
    sid = _session_for(cursor, t)
    cursor["last_event_time_ms"] = t
    event_id, _seq = _next_id(cursor)
    session_start_ms = cursor["session_start_ms"]
    return {
        "id": event_id,
        "doc_type": "event",
        "doc_kind": "mouse",
        "event_id": event_id,
        "timestamp_utc": _iso_from_epoch_ms(t),
        "local_timestamp": _iso_from_epoch_ms(t),
        "timezone": (batch.get("device_info", {}) or {}).get("timezone", "UTC"),
        "session_id": sid,
        "source": source,
        "device": device,
        "mouse": {
            "event_type": raw.get("event_type"),
            "button": raw.get("button"),
            "click_dwell_ms": click_dwell_ms,
            "x": raw.get("x"),
            "y": raw.get("y"),
            "dx": raw.get("dx"),
            "dy": raw.get("dy"),
            "scroll_axis": raw.get("scroll_axis"),
            "modifiers": list(dict.fromkeys(raw.get("modifiers", []) or [])),
            "hw_time_ms": t,
        },
        "focus": {
            "app": raw.get("application_name", "unknown"),
            "title": raw.get("window_title", ""),
            "window_id": raw.get("focused_window_id", ""),
        },
        "environment": batch.get("environment", {}) or {},
    }


def _wrap_focus(raw, cursor, batch, source, device):
    started = raw.get("started_ms")
    ended = raw.get("ended_ms")
    if started is None or ended is None:
        return None
    sid = _session_for(cursor, started)
    # A focus segment is a single "event" anchored at its start; advance the
    # session cursor to its end so the next idle-gap check uses real time.
    cursor["last_event_time_ms"] = ended
    event_id, _seq = _next_id(cursor)
    return {
        "id": event_id,
        "doc_type": "event",
        "doc_kind": "focus",
        "event_id": event_id,
        "timestamp_utc": _iso_from_epoch_ms(started),
        "local_timestamp": _iso_from_epoch_ms(started),
        "timezone": (batch.get("device_info", {}) or {}).get("timezone", "UTC"),
        "session_id": sid,
        "source": source,
        "device": device,
        "focus": {
            "started_ms": started,
            "ended_ms": ended,
            "duration_ms": raw.get("duration_ms", ended - started),
            "app": raw.get("app", "unknown"),
            "title": raw.get("title", ""),
            "window_id": raw.get("window_id", ""),
            "backend": raw.get("backend", "none"),
        },
        "environment": batch.get("environment", {}) or {},
    }


def _process_one(batch, cursor, proc_store):
    source = _source_block(batch)
    device = _device_block(batch)
    raw_events = batch.get("events", []) or []
    # Order by hw_time_ms so pairing + sessionization are coherent. Focus
    # segments sort by their hw_time_ms (the moment they were closed), which is
    # always >= ended_ms; the wrapper re-anchors each at started_ms.
    ordered = sorted(raw_events, key=lambda e: e.get("hw_time_ms", 0) or 0)

    emitted = 0
    # In-flight click presses: button -> (raw_down, down_t)
    pending = {}
    # Clicks whose release we have already matched, keyed by id() of the down.
    matched_downs = set()

    for raw in ordered:
        if raw.get("doc_kind") == "focus":
            doc = _wrap_focus(raw, cursor, batch, source, device)
            if doc:
                proc_store.put(doc)
                emitted += 1
            continue

        et = raw.get("event_type")
        btn = raw.get("button")
        t = raw.get("hw_time_ms")
        if et == "click_down" and btn is not None:
            # Expire stale unpaired presses first.
            for k in list(pending):
                if t - pending[k][1] > CLICK_PAIR_TIMEOUT_MS:
                    pending.pop(k, None)
            pending[btn] = (raw, t)
            doc = _wrap_mouse(raw, cursor, batch, source, device)
        elif et == "click_up" and btn is not None:
            down = pending.pop(btn, None)
            dwell = (t - down[1]) if down else None
            doc = _wrap_mouse(raw, cursor, batch, source, device,
                              click_dwell_ms=dwell)
        else:
            doc = _wrap_mouse(raw, cursor, batch, source, device)
        if doc:
            proc_store.put(doc)
            emitted += 1

    # Any clicks still unpaired at batch end are emitted as-is (click_dwell_ms
    # stays null); they were already wrapped when pressed.
    return emitted


def process_pending():
    """Drain every unprocessed raw batch and emit schema-conforming events.

    Idempotent: a batch marked ``processed`` is skipped on subsequent runs, so
    re-enqueueing (or running the job manually) is always safe.
    """
    raw_store = Store("pais_raw")
    proc_store = Store("pais")
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
    print(process_pending())
