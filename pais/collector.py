#!/usr/bin/env python3
"""PAIS interaction collector daemon.

Captures three signals PKTS does not, and streams them to the PAIS ingest
endpoint:

1. **Mouse events** — button presses/releases (``click_down``/``click_up``),
   scroll ticks (``scroll``), and coalesced pointer movement
   (``move_sample``). Raw kernel-rate movement is *never* stored; it is
   accumulated and emitted at most every ``PAIS_MOVE_SAMPLE_INTERVAL_MS``
   (default 200 ms ≈ 5 Hz) or on a direction change, whichever comes first.

2. **Focus segments** — continuous-focus intervals ``(app, title, window_id,
   started_ms, ended_ms)``. The collector reads the shared focus watcher
   (see :mod:`shared.focus_watcher`) and, whenever the active window changes,
   closes the previous segment and opens a new one. This is the authoritative
   "where the user's attention was" record.

3. **Application attribution** — every mouse event is stamped with the focus
   snapshot current at that instant, identical to how PKTS stamps keystrokes.

Backends (auto-selected, same policy as PKTS):

* **evdev** (default, universal) — reads ``/dev/input/event*`` pointer devices.
  Works on Wayland *and* X11. Only yields *relative* deltas, so absolute
  coordinates are integrated from a screen-center origin and clamped to the
  screen bounds (drifting approximation; fine for heatmaps).
* **pynput** (X11 fallback) — uses the XTest/record extension, fully
  unprivileged, and yields true absolute coordinates.

Override auto-selection with ``PAIS_BACKEND=evdev|pynput|auto``.

Events are buffered and POSTed in batches every few seconds; failed POSTs are
re-queued so transient server downtime loses no data.

Run:  python3 pais/collector.py
Env:  PAIS_BACKEND                   (default auto)
      PAIS_INGEST_URL                (default http://localhost:8080/pais/api/ingest)
      PAIS_FLUSH_INTERVAL_S          (default 5)
      PAIS_FLUSH_BATCH_SIZE          (default 50)
      PAIS_MOVE_SAMPLE_INTERVAL_MS   (default 200)
      PAIS_FOCUS_POLL_INTERVAL_S     (default 0.5)
      PAIS_SCREEN_W / PAIS_SCREEN_H  (default 1920 / 1080; used to clamp integrated coords)
"""
import json
import os
import socket
import sys
import threading
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import focus_watcher  # noqa: E402

try:
    import evdev
    from evdev import ecodes
except Exception:
    evdev = None
    ecodes = None

try:
    from pynput import mouse as pmouse
    from pynput import keyboard as pkbd  # for modifier tracking only
    _PYNPUT_AVAILABLE = True
except Exception:
    pmouse = pkbd = None
    _PYNPUT_AVAILABLE = False

INGEST_URL = os.environ.get("PAIS_INGEST_URL", "http://localhost:8080/pais/api/ingest")
FLUSH_INTERVAL_S = float(os.environ.get("PAIS_FLUSH_INTERVAL_S", "5"))
FLUSH_BATCH_SIZE = int(os.environ.get("PAIS_FLUSH_BATCH_SIZE", "50"))
MOVE_SAMPLE_INTERVAL_MS = int(os.environ.get("PAIS_MOVE_SAMPLE_INTERVAL_MS", "200"))
FOCUS_POLL_INTERVAL_S = float(os.environ.get("PAIS_FOCUS_POLL_INTERVAL_S", "0.5"))
SCREEN_W = int(os.environ.get("PAIS_SCREEN_W", "1920"))
SCREEN_H = int(os.environ.get("PAIS_SCREEN_H", "1080"))
MAX_BUFFER = 20000
COLLECTOR_VERSION = "0.1.0"

# ═══════════════════════════════════════════════════════════════════════
# Shared state + buffering
# ═══════════════════════════════════════════════════════════════════════
_buffer = []
_buffer_lock = threading.Lock()
_modifiers = set()
_device_info = None

# Integrated absolute pointer position (evdev gives only relative deltas).
_abs_x = SCREEN_W // 2
_abs_y = SCREEN_H // 2
_move_accum_dx = 0
_move_accum_dy = 0
_move_accum_lock = threading.Lock()

# The currently-open focus segment. Closed (emitted) on focus change / shutdown.
_open_segment = None
_segment_lock = threading.Lock()


def session_type():
    return os.environ.get("XDG_SESSION_TYPE", "unknown")


def _now_ms():
    return int(time.time() * 1000)


def _stamp_focus(entry):
    snap = focus_watcher.current()
    entry["focused_window_id"] = snap.window_id
    entry["application_name"] = snap.app
    entry["window_title"] = snap.title
    return entry


def emit_mouse(event_type, button=None, x=None, y=None, dx=None, dy=None,
               scroll_axis=None):
    """Record one mouse interaction (click, scroll, or coalesced move sample)."""
    entry = {
        "doc_kind": "mouse",
        "event_type": event_type,
        "button": button,
        "x": x,
        "y": y,
        "dx": dx,
        "dy": dy,
        "scroll_axis": scroll_axis,
        "modifiers": sorted(_modifiers),
        "hw_time_ms": _now_ms(),
    }
    _stamp_focus(entry)
    _enqueue(entry)


def _enqueue(entry):
    flush_needed = False
    with _buffer_lock:
        if len(_buffer) >= MAX_BUFFER:
            del _buffer[:len(_buffer) - MAX_BUFFER + 1]
            print("[collector] buffer full; dropped oldest event")
        _buffer.append(entry)
        flush_needed = len(_buffer) >= FLUSH_BATCH_SIZE
    if flush_needed:
        flush()


def _close_open_segment(at_ms):
    """Finalize and emit the open focus segment (if any)."""
    global _open_segment
    with _segment_lock:
        seg = _open_segment
        _open_segment = None
    if seg is None:
        return
    seg["ended_ms"] = at_ms
    seg["duration_ms"] = at_ms - seg["started_ms"]
    if seg["duration_ms"] < 1:  # sub-millisecond segments are noise
        return
    _enqueue({"doc_kind": "focus", **{k: seg[k] for k in
             ("started_ms", "ended_ms", "duration_ms", "app", "title",
              "window_id", "backend")}, "hw_time_ms": at_ms})


def _open_or_extend_segment(snap, at_ms):
    """Open a new focus segment if the active window changed; extend otherwise."""
    global _open_segment
    with _segment_lock:
        seg = _open_segment
        same = (seg is not None
                and seg["window_id"] == snap.window_id
                and seg["app"] == snap.app
                and seg["title"] == snap.title)
        if same:
            return  # still focused on the same window; segment stays open
        _open_segment = {
            "started_ms": at_ms,
            "ended_ms": None,
            "duration_ms": None,
            "app": snap.app,
            "title": snap.title,
            "window_id": snap.window_id,
            "backend": snap.backend,
        }
        prev = seg
    if prev is not None:
        prev["ended_ms"] = at_ms
        prev["duration_ms"] = at_ms - prev["started_ms"]
        if prev["duration_ms"] >= 1:
            _enqueue({"doc_kind": "focus",
                      **{k: prev[k] for k in
                       ("started_ms", "ended_ms", "duration_ms", "app", "title",
                        "window_id", "backend")},
                      "hw_time_ms": at_ms})


# ── modifier tracking (so mouse events carry the active modifiers) ──────────
def add_modifier(name):
    _modifiers.add(name)


def drop_modifier(name):
    _modifiers.discard(name)


# ═══════════════════════════════════════════════════════════════════════
# Movement coalescing + focus-segment loops (backend-agnostic)
# ═══════════════════════════════════════════════════════════════════════
def _move_sample_loop():
    """Emit a coalesced move_sample every MOVE_SAMPLE_INTERVAL_MS when moving."""
    global _move_accum_dx, _move_accum_dy
    interval = MOVE_SAMPLE_INTERVAL_MS / 1000.0
    while True:
        time.sleep(interval)
        with _move_accum_lock:
            dx, dy = _move_accum_dx, _move_accum_dy
            _move_accum_dx = 0
            _move_accum_dy = 0
        if dx or dy:
            emit_mouse("move_sample", x=_abs_x, y=_abs_y, dx=dx, dy=dy)


def _apply_delta(dx, dy):
    """Integrate a relative delta into the absolute pointer estimate (clamped)."""
    global _abs_x, _abs_y
    _abs_x = max(0, min(SCREEN_W, _abs_x + dx))
    _abs_y = max(0, min(SCREEN_H, _abs_y + dy))


def _focus_segment_loop():
    """Poll the focus watcher; open/close segments on window change."""
    while True:
        snap = focus_watcher.current()
        _open_or_extend_segment(snap, _now_ms())
        time.sleep(FOCUS_POLL_INTERVAL_S)


# ═══════════════════════════════════════════════════════════════════════
# Backend 1 — evdev (universal: X11 + Wayland)
# ═══════════════════════════════════════════════════════════════════════
_BTN_MAP = {
    ecodes.BTN_LEFT: "left",
    ecodes.BTN_RIGHT: "right",
    ecodes.BTN_MIDDLE: "middle",
    ecodes.BTN_SIDE: "x1",
    ecodes.BTN_EXTRA: "x2",
} if ecodes is not None else {}

_PRESSED = set()


def evdev_find_pointers():
    """Devices that look like a mouse/touchpad: have BTN_LEFT and REL_X/Y."""
    if evdev is None:
        return []
    pointers = []
    for path in evdev.list_devices():
        try:
            dev = evdev.InputDevice(path)
            caps = dev.capabilities()
            keys = caps.get(ecodes.EV_KEY, [])
            rels = caps.get(ecodes.EV_REL, [])
            if ecodes.BTN_LEFT in keys and ecodes.REL_X in rels and ecodes.REL_Y in rels:
                pointers.append(dev)
        except (PermissionError, OSError):
            continue
    return pointers


def _evdev_handle(event):
    global _move_accum_dx, _move_accum_dy
    if event.type == ecodes.EV_KEY:
        btn = _BTN_MAP.get(event.code)
        if btn is None:
            return
        if event.value == 1:
            _PRESSED.add(btn)
            emit_mouse("click_down", button=btn, x=_abs_x, y=_abs_y)
        elif event.value == 0:
            _PRESSED.discard(btn)
            emit_mouse("click_up", button=btn, x=_abs_x, y=_abs_y)
    elif event.type == ecodes.EV_REL:
        if event.code == ecodes.REL_X:
            with _move_accum_lock:
                _move_accum_dx += event.value
            _apply_delta(event.value, 0)
        elif event.code == ecodes.REL_Y:
            with _move_accum_lock:
                _move_accum_dy += event.value
            _apply_delta(0, event.value)
        elif event.code == ecodes.REL_WHEEL:
            emit_mouse("scroll", x=_abs_x, y=_abs_y, dy=int(event.value),
                       scroll_axis="vertical")
        elif event.code == ecodes.REL_HWHEEL:
            emit_mouse("scroll", x=_abs_x, y=_abs_y, dx=int(event.value),
                       scroll_axis="horizontal")


def evdev_run(pointers):
    import select
    print(f"[collector] evdev: {len(pointers)} pointer device(s)")
    for dev in pointers:
        print(f"  {dev.path}  {dev.name!r}")
    while True:
        readable, _, _ = select.select(pointers, [], [])
        for dev in readable:
            try:
                for event in dev.read():
                    _evdev_handle(event)
            except OSError:
                continue


# ═══════════════════════════════════════════════════════════════════════
# Backend 2 — pynput (X11, unprivileged, true absolute coords)
# ═══════════════════════════════════════════════════════════════════════
def _pynput_button_name(btn):
    return {pmouse.Button.left: "left", pmouse.Button.right: "right",
            pmouse.Button.middle: "middle"}.get(btn, "x1")


def _pynput_on_click(x, y, button, pressed):
    btn = _pynput_button_name(button)
    if pressed:
        _PRESSED.add(btn)
        emit_mouse("click_down", button=btn, x=int(x), y=int(y))
    else:
        _PRESSED.discard(btn)
        emit_mouse("click_up", button=btn, x=int(x), y=int(y))


def _pynput_on_scroll(x, y, dx, dy):
    emit_mouse("scroll", x=int(x), y=int(y), dx=int(dx), dy=int(dy),
               scroll_axis="vertical")


# pynput calls on_move at high frequency; we ignore it here and let the
# coalescing loop sample via the evdev path. On pynput we have no relative
# deltas, so we emit a move_sample directly but rate-limit it.
_last_pynput_move_ms = [0]


def _pynput_on_move(x, y):
    global _abs_x, _abs_y
    _abs_x, _abs_y = int(x), int(y)
    now = _now_ms()
    if now - _last_pynput_move_ms[0] >= MOVE_SAMPLE_INTERVAL_MS:
        _last_pynput_move_ms[0] = now
        emit_mouse("move_sample", x=_abs_x, y=_abs_y)


def pynput_run():
    if not _PYNPUT_AVAILABLE:
        raise RuntimeError("pynput is not installed")
    print("[collector] pynput: X11 mouse backend")
    listener = pmouse.Listener(on_click=_pynput_on_click,
                               on_scroll=_pynput_on_scroll,
                               on_move=_pynput_on_move)
    listener.start()
    listener.join()


# ═══════════════════════════════════════════════════════════════════════
# Backend selection + device/env profiling
# ═══════════════════════════════════════════════════════════════════════
def select_backend():
    desired = os.environ.get("PAIS_BACKEND", "auto").lower()
    if desired == "evdev":
        pointers = evdev_find_pointers()
        if not pointers:
            raise RuntimeError("PAIS_BACKEND=evdev but no readable pointer devices")
        return "evdev", pointers
    if desired == "pynput":
        if not _PYNPUT_AVAILABLE:
            raise RuntimeError("PAIS_BACKEND=pynput but pynput is not installed")
        return "pynput", None
    pointers = evdev_find_pointers()
    if pointers:
        return "evdev", pointers
    if _PYNPUT_AVAILABLE and session_type() == "x11":
        print("[collector] evdev found no readable devices; falling back to pynput (X11)")
        return "pynput", None
    raise RuntimeError(
        "no capture backend available — evdev has no readable pointer devices "
        "and pynput is unavailable or not on X11. Try `sudo usermod -aG input $USER`.")


def build_device_info():
    import platform
    try:
        import psutil
        battery = psutil.sensors_battery() is not None
    except Exception:
        battery = False
    return {
        "device_id": socket.gethostname(),
        "hostname": socket.gethostname(),
        "machine_type": "laptop" if battery else "desktop",
        "os": {"family": platform.system(), "version": platform.release()},
        "pointer_id": "default",
        "pointer_type": "unknown",
        "timezone": _local_timezone(),
    }


def _local_timezone():
    if os.environ.get("TZ"):
        return os.environ["TZ"]
    try:
        with open("/etc/timezone", encoding="utf-8") as fh:
            return fh.read().strip()
    except Exception:
        return "UTC"


def read_environment():
    try:
        import psutil
    except ImportError:
        return {}
    env = {}
    try:
        env["cpu_load_percent"] = round(psutil.cpu_percent(interval=None), 1)
        env["memory_usage_percent"] = round(psutil.virtual_memory().percent, 1)
    except Exception:
        pass
    return env


# ═══════════════════════════════════════════════════════════════════════
# Flush / POST
# ═══════════════════════════════════════════════════════════════════════
def flush():
    with _buffer_lock:
        if not _buffer:
            return
        batch = _buffer[:]
        _buffer.clear()
    if _post(batch):
        print(f"[collector] flushed {len(batch)} events")
    else:
        with _buffer_lock:
            _buffer[:0] = batch


def _post(events):
    payload = {
        "source": {
            "platform": session_type(),
            "capture_scope": "global",
            "collector": "pais-collector",
            "collector_version": COLLECTOR_VERSION,
        },
        "device": _device_info,
        "environment": read_environment(),
        "events": events,
    }
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            INGEST_URL, data=data,
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return 200 <= resp.status < 300
    except Exception as exc:
        print(f"[collector] POST failed ({exc}); {len(events)} events re-queued")
        return False


def _flush_loop():
    while True:
        time.sleep(FLUSH_INTERVAL_S)
        flush()


# ═══════════════════════════════════════════════════════════════════════
# Entrypoint
# ═══════════════════════════════════════════════════════════════════════
def main():
    global _device_info
    backend, arg = select_backend()
    _device_info = build_device_info()
    focus_watcher.start()
    snap = focus_watcher.current()
    print(f"[collector] session={session_type()}  backend={backend}  "
          f"focus={snap.backend}  ingest={INGEST_URL}")
    threading.Thread(target=_flush_loop, daemon=True).start()
    threading.Thread(target=_move_sample_loop, daemon=True).start()
    threading.Thread(target=_focus_segment_loop, daemon=True).start()
    _open_or_extend_segment(focus_watcher.current(), _now_ms())
    print("[collector] running — Ctrl+C to stop")
    try:
        if backend == "evdev":
            evdev_run(arg)
        else:
            pynput_run()
    except KeyboardInterrupt:
        print("\n[collector] stopping…")
    finally:
        _close_open_segment(_now_ms())
        flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
