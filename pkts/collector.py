#!/usr/bin/env python3
"""PKTS keystroke collector daemon.

Captures a **full keystroke log** — every ``key_down``, ``key_up``, and
``auto_repeat`` — and streams it to the PKTS ingest endpoint.

Two interchangeable backends, auto-selected so the collector runs identically
on X11 and Wayland:

* **evdev** (default, universal) — reads ``/dev/input/event*`` below the
  compositor. Works on Wayland *and* X11. systemd-logind grants the active
  console user an ACL on those nodes automatically (the ``+`` in
  ``ls -l /dev/input/event*``); if access is denied, add yourself to the
  ``input`` group (``sudo usermod -aG input $USER``) and log back in. evdev
  is the only backend that cleanly distinguishes auto-repeat (kernel
  ``value == 2``).

* **pynput** (X11 fallback) — uses the XRecord extension, fully unprivileged,
  no input-group access required. Selected automatically when evdev finds no
  readable keyboard devices and the session is X11. Auto-repeat is detected
  heuristically (a press of an already-held key without an intervening
  release).

Override auto-selection with ``PKTS_BACKEND=evdev|pynput|auto``.

Events are buffered and POSTed in batches every few seconds; failed POSTs are
re-queued so transient server downtime loses no data.

Run:  python3 pkts/collector.py
Env:  PKTS_BACKEND             (default auto)
      PKTS_INGEST_URL          (default http://localhost:5001/api/ingest)
      PKTS_FLUSH_INTERVAL_S    (default 5)
      PKTS_FLUSH_BATCH_SIZE    (default 50)
"""
import json
import os
import platform
import select
import socket
import sys
import threading
import time
import urllib.request

import evdev
from evdev import ecodes

try:
    from pynput import keyboard as pkbd
    _PYNPUT_AVAILABLE = True
except Exception:
    pkbd = None
    _PYNPUT_AVAILABLE = False

try:
    import psutil
except ImportError:
    psutil = None

# Shared focused-window watcher — the single source of truth for the
# application context stamped onto every keystroke (see shared/focus_watcher.py).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from shared import focus_watcher
except Exception:
    focus_watcher = None

INGEST_URL = os.environ.get("PKTS_INGEST_URL", "http://localhost:8080/pkts/api/ingest")
FLUSH_INTERVAL_S = float(os.environ.get("PKTS_FLUSH_INTERVAL_S", "5"))
FLUSH_BATCH_SIZE = int(os.environ.get("PKTS_FLUSH_BATCH_SIZE", "50"))
MAX_BUFFER = 20000
COLLECTOR_VERSION = "0.2.0"

# ═══════════════════════════════════════════════════════════════════════
# Shared state + buffering (backend-agnostic)
# ═══════════════════════════════════════════════════════════════════════
_buffer = []
_buffer_lock = threading.Lock()
_modifiers = set()
_device_info = None


def session_type():
    return os.environ.get("XDG_SESSION_TYPE", "unknown")


def emit(key, key_code, event_type):
    """Record one raw keylog tuple. Called by whichever backend is active."""
    snap = focus_watcher.current() if focus_watcher is not None else None
    entry = {
        "key": key,
        "key_code": key_code,
        "event_type": event_type,
        "modifiers": sorted(_modifiers),
        "hw_time_ms": int(time.time() * 1000),
        # Application context — where the user's attention was at this instant.
        # Sourced from the shared focus watcher (see shared/focus_watcher.py);
        # all three default to empty/"unknown" when no backend yields data, so
        # capture never breaks on a compositor that hides focus info.
        "focused_window_id": (snap.window_id if snap else ""),
        "application_name": (snap.app if snap else "unknown"),
        "window_title": (snap.title if snap else ""),
    }
    flush_needed = False
    with _buffer_lock:
        if len(_buffer) >= MAX_BUFFER:
            del _buffer[:len(_buffer) - MAX_BUFFER + 1]
            print("[collector] buffer full; dropped oldest event")
        _buffer.append(entry)
        flush_needed = len(_buffer) >= FLUSH_BATCH_SIZE
    if flush_needed:
        flush()


def add_modifier(name):
    _modifiers.add(name)


def drop_modifier(name):
    _modifiers.discard(name)


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
            "collector": "pkts-collector",
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
# Device / environment profiling (shared)
# ═══════════════════════════════════════════════════════════════════════
def _distro_name():
    try:
        with open("/etc/os-release", encoding="utf-8") as fh:
            for line in fh:
                if line.startswith("PRETTY_NAME="):
                    return line.split("=", 1)[1].strip().strip('"')
    except Exception:
        pass
    return ""


def _local_timezone():
    if os.environ.get("TZ"):
        return os.environ["TZ"]
    try:
        with open("/etc/timezone", encoding="utf-8") as fh:
            return fh.read().strip()
    except Exception:
        return "UTC"


def _battery_present():
    if psutil is None:
        return False
    try:
        return psutil.sensors_battery() is not None
    except Exception:
        return False


def build_device_info():
    return {
        "device_id": socket.gethostname(),
        "hostname": socket.gethostname(),
        "machine_type": "laptop" if _battery_present() else "desktop",
        "os": {
            "family": platform.system(),
            "distribution": _distro_name(),
            "version": platform.release(),
        },
        "keyboard_id": "default",
        "layout": os.environ.get("XKB_DEFAULT_LAYOUT", "us"),
        "connection_type": "integrated",
        "application_name": "unknown",
        "timezone": _local_timezone(),
    }


def read_environment():
    if psutil is None:
        return {}
    env = {}
    try:
        env["cpu_load_percent"] = round(psutil.cpu_percent(interval=None), 1)
        env["memory_usage_percent"] = round(psutil.virtual_memory().percent, 1)
        bat = psutil.sensors_battery()
        if bat is not None:
            env["battery_percent"] = round(bat.percent, 1)
    except Exception:
        pass
    return env


# ═══════════════════════════════════════════════════════════════════════
# Backend 1 — evdev (universal: X11 + Wayland)
# ═══════════════════════════════════════════════════════════════════════
_LETTERS = {getattr(ecodes, f"KEY_{L}"): (L.lower(), f"Key{L}")
            for L in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
_DIGITS = {getattr(ecodes, f"KEY_{n}"): (str(n), f"Digit{n}")
           for n in range(10)}
_SPECIAL = {
    ecodes.KEY_SPACE: ("space", "Space"),
    ecodes.KEY_ENTER: ("enter", "Enter"),
    ecodes.KEY_KPENTER: ("enter", "Enter"),
    ecodes.KEY_BACKSPACE: ("Backspace", "Backspace"),
    ecodes.KEY_TAB: ("tab", "Tab"),
    ecodes.KEY_ESC: ("escape", "Escape"),
    ecodes.KEY_UP: ("ArrowUp", "ArrowUp"),
    ecodes.KEY_DOWN: ("ArrowDown", "ArrowDown"),
    ecodes.KEY_LEFT: ("ArrowLeft", "ArrowLeft"),
    ecodes.KEY_RIGHT: ("ArrowRight", "ArrowRight"),
    ecodes.KEY_DELETE: ("Delete", "Delete"),
    ecodes.KEY_INSERT: ("Insert", "Insert"),
    ecodes.KEY_HOME: ("Home", "Home"),
    ecodes.KEY_END: ("End", "End"),
    ecodes.KEY_PAGEUP: ("PageUp", "PageUp"),
    ecodes.KEY_PAGEDOWN: ("PageDown", "PageDown"),
    ecodes.KEY_CAPSLOCK: ("CapsLock", "CapsLock"),
}
_FUNCS = {getattr(ecodes, f"KEY_F{n}"): (f"F{n}", f"F{n}") for n in range(1, 25)}
_EVDEV_MOD_KEYS = {
    ecodes.KEY_LEFTSHIFT: ("shift", "ShiftLeft"),
    ecodes.KEY_RIGHTSHIFT: ("shift", "ShiftRight"),
    ecodes.KEY_LEFTCTRL: ("ctrl", "ControlLeft"),
    ecodes.KEY_RIGHTCTRL: ("ctrl", "ControlRight"),
    ecodes.KEY_LEFTALT: ("alt", "AltLeft"),
    ecodes.KEY_RIGHTALT: ("alt", "AltRight"),
    ecodes.KEY_LEFTMETA: ("meta", "MetaLeft"),
    ecodes.KEY_RIGHTMETA: ("meta", "MetaRight"),
}
_EVDEV_KEY_MAP = {**_LETTERS, **_DIGITS, **_SPECIAL, **_FUNCS}
for _code, (_mod, _kc) in _EVDEV_MOD_KEYS.items():
    _EVDEV_KEY_MAP[_code] = (_kc.replace("Left", "").replace("Right", ""), _kc)


def evdev_find_keyboards():
    keyboards = []
    for path in evdev.list_devices():
        try:
            dev = evdev.InputDevice(path)
            keys = dev.capabilities().get(ecodes.EV_KEY, [])
            if (ecodes.KEY_A in keys and ecodes.KEY_SPACE in keys
                    and ecodes.KEY_LEFTSHIFT in keys):
                keyboards.append(dev)
        except (PermissionError, OSError):
            continue
    return keyboards


def _evdev_handle(event):
    if event.type != ecodes.EV_KEY:
        return
    code = event.code
    value = event.value
    mod_info = _EVDEV_MOD_KEYS.get(code)
    if mod_info:
        if value == 1:
            add_modifier(mod_info[0])
        elif value == 0:
            drop_modifier(mod_info[0])
    desc = _EVDEV_KEY_MAP.get(code)
    if desc is None:
        return
    key, key_code = desc
    if value == 2:
        emit(key, key_code, "auto_repeat")
    elif value == 1:
        emit(key, key_code, "key_down")
    elif value == 0:
        emit(key, key_code, "key_up")


def evdev_run(keyboards):
    print(f"[collector] evdev: {len(keyboards)} keyboard device(s)")
    for dev in keyboards:
        print(f"  {dev.path}  {dev.name!r}")
    while True:
        readable, _, _ = select.select(keyboards, [], [])
        for dev in readable:
            for event in dev.read():
                _evdev_handle(event)


# ═══════════════════════════════════════════════════════════════════════
# Backend 2 — pynput (X11 / XRecord, unprivileged)
# ═══════════════════════════════════════════════════════════════════════
def _build_pynput_maps():
    if not _PYNPUT_AVAILABLE:
        return {}
    K = pkbd.Key
    m = {
        K.space: ("space", "Space", None),
        K.enter: ("enter", "Enter", None),
        K.tab: ("tab", "Tab", None),
        K.backspace: ("Backspace", "Backspace", None),
        K.esc: ("escape", "Escape", None),
        K.caps_lock: ("CapsLock", "CapsLock", "caps_lock"),
        K.delete: ("Delete", "Delete", None),
        K.insert: ("Insert", "Insert", None),
        K.home: ("Home", "Home", None),
        K.end: ("End", "End", None),
        K.page_up: ("PageUp", "PageUp", None),
        K.page_down: ("PageDown", "PageDown", None),
        K.up: ("ArrowUp", "ArrowUp", None),
        K.down: ("ArrowDown", "ArrowDown", None),
        K.left: ("ArrowLeft", "ArrowLeft", None),
        K.right: ("ArrowRight", "ArrowRight", None),
        K.shift: ("Shift", "Shift", "shift"),
        K.shift_l: ("Shift", "ShiftLeft", "shift"),
        K.shift_r: ("Shift", "ShiftRight", "shift"),
        K.ctrl: ("Control", "Control", "ctrl"),
        K.ctrl_l: ("Control", "ControlLeft", "ctrl"),
        K.ctrl_r: ("Control", "ControlRight", "ctrl"),
        K.alt: ("Alt", "Alt", "alt"),
        K.alt_l: ("Alt", "AltLeft", "alt"),
        K.alt_r: ("Alt", "AltRight", "alt"),
        K.alt_gr: ("Alt", "AltGraph", "alt"),
        K.cmd: ("Meta", "Meta", "meta"),
        K.cmd_l: ("Meta", "MetaLeft", "meta"),
        K.cmd_r: ("Meta", "MetaRight", "meta"),
    }
    for n in range(1, 25):
        member = getattr(K, f"f{n}", None)
        if member is not None:
            m[member] = (f"F{n}", f"F{n}", None)
    return m


_PYNPUT_MAP = _build_pynput_maps()
_pynput_pressed = {}  # key_code -> last emit time; for auto-repeat heuristic


def _pynput_describe(key):
    if isinstance(key, pkbd.KeyCode):
        char = key.char
        if char is None:
            return None
        if char.isalpha():
            return char.lower(), f"Key{char.upper()}", None
        return char, f"Digit{char}" if char.isdigit() else f"Bracket{char}", None
    return _PYNPUT_MAP.get(key)


def _pynput_on_press(key):
    desc = _pynput_describe(key)
    if desc is None:
        return
    key_name, key_code, mod = desc
    now_ms = int(time.time() * 1000)
    if mod:
        add_modifier(mod)
    if key_code in _pynput_pressed:
        gap = now_ms - _pynput_pressed[key_code]
        if gap < 250:
            emit(key_name, key_code, "auto_repeat")
            _pynput_pressed[key_code] = now_ms
            return
    _pynput_pressed[key_code] = now_ms
    emit(key_name, key_code, "key_down")


def _pynput_on_release(key):
    desc = _pynput_describe(key)
    if desc is None:
        return
    key_name, key_code, mod = desc
    _pynput_pressed.pop(key_code, None)
    if mod:
        drop_modifier(mod)
    emit(key_name, key_code, "key_up")


def pynput_run():
    if not _PYNPUT_AVAILABLE:
        raise RuntimeError("pynput is not installed")
    print("[collector] pynput: XRecord backend (X11)")
    listener = pkbd.Listener(on_press=_pynput_on_press, on_release=_pynput_on_release)
    listener.start()
    listener.join()


# ═══════════════════════════════════════════════════════════════════════
# Backend selection
# ═══════════════════════════════════════════════════════════════════════
def select_backend():
    """Return ``("evdev", [devices])`` or ``("pynput", None)`` per policy."""
    desired = os.environ.get("PKTS_BACKEND", "auto").lower()
    session = session_type()

    if desired == "evdev":
        keyboards = evdev_find_keyboards()
        if not keyboards:
            raise RuntimeError("PKTS_BACKEND=evdev but no readable keyboard devices")
        return "evdev", keyboards

    if desired == "pynput":
        if not _PYNPUT_AVAILABLE:
            raise RuntimeError("PKTS_BACKEND=pynput but pynput is not installed")
        return "pynput", None

    keyboards = evdev_find_keyboards()
    if keyboards:
        return "evdev", keyboards
    if _PYNPUT_AVAILABLE and session == "x11":
        print("[collector] evdev found no readable devices; falling back to pynput (X11)")
        return "pynput", None
    raise RuntimeError(
        "no capture backend available — evdev has no readable keyboard devices "
        "and pynput is unavailable or not on X11. Try `sudo usermod -aG input $USER`.")


def main():
    global _device_info
    backend, arg = select_backend()
    _device_info = build_device_info()
    print(f"[collector] session={session_type()}  backend={backend}  "
          f"ingest={INGEST_URL}")
    threading.Thread(target=_flush_loop, daemon=True).start()
    if focus_watcher is not None:
        focus_watcher.start()
        snap = focus_watcher.current()
        print(f"[collector] focus backend: {snap.backend} (app={snap.app!r})")
    else:
        print("[collector] shared.focus_watcher unavailable — keystrokes will "
              "carry app='unknown'")
    print("[collector] running — Ctrl+C to stop")
    try:
        if backend == "evdev":
            evdev_run(arg)
        else:
            pynput_run()
    except KeyboardInterrupt:
        print("\n[collector] stopping…")
    finally:
        flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
