"""Focused-window watcher for Autoregia — low-level, no daemons.

Single source of truth for "what window/app was focused at time T". Consumed by
PKTS (stamps each keystroke with its application context) and by PAIS (the focus
timeline and per-event mouse attribution).

A collector imports :func:`start` once; a background thread refreshes the cached
snapshot every ``interval_s`` seconds. Every collector thread then reads the
latest value via :func:`current`. A one-shot :func:`probe` is also exposed.

Backends are tried in order; the first that yields real data wins. They are all
either kernel/display libraries or compositor tools that are *already present*
on their respective desktops — nothing new is run, nothing is GNOME-specific:

X11 session:
    1. python-xlib EWMH — ``_NET_ACTIVE_WINDOW`` → ``_NET_WM_NAME`` + ``WM_CLASS``

Wayland session (compositor-native CLI / bridge, where available):
    1. GNOME (ext)  — ``org.autoregia.Focus`` session D-Bus (the
                      ``pais@autoregia`` Shell extension; the *reliable* path
                      on GNOME — the only one that works on GTK4, where AT-SPI
                      no longer publishes). Not a daemon: loaded into the
                      already-running gnome-shell like any extension. Install
                      once via ``shared/gnome-extension/install.sh``.
    2. Hyprland — ``hyprctl activewindow -j``  (already on Hyprland)
    3. Sway     — ``swaymsg -t get_tree``      (already on Sway)
    4. KDE/KWin — ``qdbus org.gnome.KWin /KWin queryWindowInfo``
    5. AT-SPI   — the freedesktop accessibility bus (best-effort bonus; on
                  modern GNOME/GTK4 it does not publish app windows, but it
                  still works on GTK3 desktops that have atk-bridge loaded).

When no backend yields data, :func:`current` returns a degraded snapshot with
``app == "unknown"`` and emits a one-time warning. Keystroke and mouse capture
keep working — only app attribution is lost.

Privacy: window titles can carry sensitive content. Set
``PAIS_TITLE_REDACT_REGEX`` (comma-separated Python regexes) to mask matching
substrings in titles *before* they leave this process.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import time
from dataclasses import dataclass, asdict

XDG_SESSION_TYPE = os.environ.get("XDG_SESSION_TYPE", "unknown").lower()

_REDACT_RAW = os.environ.get("PAIS_TITLE_REDACT_REGEX", "")
_REDACT_PATTERNS = [re.compile(p) for p in _REDACT_RAW.split(",") if p.strip()]


@dataclass
class FocusSnapshot:
    """The active window at one instant, as best the running backend can tell."""

    app: str            # application id (WM_CLASS / app-id / class)
    title: str          # window title (may be redacted)
    window_id: str      # backend-native id; stable within a focus segment
    backend: str        # which backend produced this ("x11-ewmh", "atspi", "none", ...)
    captured_at_ms: int # when this snapshot was taken (epoch ms)


_UNKNOWN = FocusSnapshot(app="unknown", title="", window_id="",
                         backend="none", captured_at_ms=0)

_lock = threading.Lock()
_current: FocusSnapshot = _UNKNOWN
_warned_no_backend = False


def _now_ms() -> int:
    return int(time.time() * 1000)


def _redact(title: str) -> str:
    if not title or not _REDACT_PATTERNS:
        return title
    out = title
    for pat in _REDACT_PATTERNS:
        out = pat.sub("[…] redacted", out)
    return out


# ═══════════════════════════════════════════════════════════════════════
# Backend 1 — GNOME Shell extension (org.autoregia.Focus)
# ═══════════════════════════════════════════════════════════════════════
def _gdbus_session(dest, path, method, timeout=0.8):
    try:
        out = subprocess.run(
            ["gdbus", "call", "--session", "--dest", dest, "--object-path", path,
             "--method", method], capture_output=True, text=True, timeout=timeout)
    except Exception:
        return None
    return out.stdout.strip() if out.returncode == 0 and out.stdout.strip() else None


def _try_gnome_extension() -> FocusSnapshot | None:
    """org.autoregia.Focus — the pais@autoregia GNOME Shell extension.

    The reliable path on GNOME Wayland (the only one that works on GTK4, where
    AT-SPI no longer publishes). The extension owns the name, so no access
    restrictions. Install once via ``shared/gnome-extension/install.sh``.
    """
    raw = _gdbus_session("org.autoregia.Focus", "/org/autoregia/Focus",
                         "org.autoregia.Focus.GetActive")
    if not raw:
        return None
    # GetActive() → ('app', 'title', 'window_id'); GVariant escapes embedded
    # quotes as \' so a naive '[^']*' breaks on titles like "John's doc".
    parts = re.findall(r"'((?:[^'\\]|\\.)*)'", raw)
    parts = [p.replace("\\'", "'").replace('\\"', '"') for p in parts]
    if len(parts) < 3 or not parts[0]:
        return None
    app, title, win_id = parts[0], parts[1], parts[2]
    return FocusSnapshot(app=app, title=_redact(title),
                         window_id=f"gnome-ext:{win_id}", backend="gnome-extension",
                         captured_at_ms=_now_ms())


# ═══════════════════════════════════════════════════════════════════════
# Backend 2 — X11 EWMH (python-xlib)
# ═══════════════════════════════════════════════════════════════════════
def _try_xlib() -> FocusSnapshot | None:
    try:
        from Xlib import X, display  # type: ignore
    except Exception:
        return None
    d = None
    try:
        d = display.Display()
        root = d.screen().root
        prop = root.get_full_property(d.intern_atom("_NET_ACTIVE_WINDOW"),
                                      X.AnyPropertyType)
        if not prop or not prop.value:
            return None
        win_id = int(prop.value[0])
        if win_id == 0:
            return None  # no focus (or Wayland reading XWayland)
        win = d.create_resource_object("window", win_id)
        cls = win.get_wm_class()
        app = (cls[1] if cls and len(cls) > 1
               else (cls[0] if cls else "unknown"))
        np = win.get_full_property(d.intern_atom("_NET_WM_NAME"),
                                   X.AnyPropertyType)
        title = np.value if np else (win.get_wm_name() or "")
        return FocusSnapshot(app=str(app) or "unknown", title=_redact(str(title)),
                             window_id=f"x11:{win_id:x}", backend="x11-ewmh",
                             captured_at_ms=_now_ms())
    except Exception:
        return None
    finally:
        if d is not None:
            try:
                d.close()
            except Exception:
                pass


# ═══════════════════════════════════════════════════════════════════════
# Compositor-native CLIs (already installed on their respective desktops)
# ═══════════════════════════════════════════════════════════════════════
def _run_json(cmd, timeout=1.0):
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if out.returncode != 0 or not out.stdout.strip():
            return None
        return json.loads(out.stdout)
    except Exception:
        return None


def _try_hyprland() -> FocusSnapshot | None:
    w = _run_json(["hyprctl", "activewindow", "-j"])
    if not w or not w.get("address"):
        return None
    return FocusSnapshot(app=str(w.get("class") or "unknown"),
                         title=_redact(str(w.get("title") or "")),
                         window_id=f"hypr:{w.get('address')}", backend="hyprland",
                         captured_at_ms=_now_ms())


def _try_sway() -> FocusSnapshot | None:
    tree = _run_json(["swaymsg", "-t", "get_tree"])
    if not tree:
        return None

    def focused(node):
        if node.get("focused"):
            return node
        for key in ("nodes", "floating_nodes"):
            for child in node.get(key, []):
                hit = focused(child)
                if hit:
                    return hit
        return None

    node = focused(tree)
    if not node:
        return None
    app = (node.get("app_id")
           or node.get("window_properties", {}).get("class") or "unknown")
    return FocusSnapshot(app=app, title=_redact(str(node.get("name") or "")),
                         window_id=f"sway:{node.get('id')}", backend="sway",
                         captured_at_ms=_now_ms())


def _try_kde_kwin() -> FocusSnapshot | None:
    for qdbus in ("qdbus", "qdbus6", "qdbus-qt6"):
        try:
            out = subprocess.run([qdbus, "org.kde.KWin", "/KWin", "queryWindowInfo"],
                                 capture_output=True, text=True, timeout=1.0)
        except FileNotFoundError:
            continue
        except Exception:
            continue
        if out.returncode != 0 or not out.stdout.strip():
            continue
        app = title = ""
        for ln in out.stdout.splitlines():
            low = ln.strip().lower()
            if low.startswith("caption:"):
                title = ln.split(":", 1)[1].strip()
            elif low.startswith(("window class:", "resourceclass:")):
                app = ln.split(":", 1)[1].strip()
        if app:
            return FocusSnapshot(app=app, title=_redact(title), window_id="kde:kwin",
                                 backend="kde-kwin", captured_at_ms=_now_ms())
    return None


# ═══════════════════════════════════════════════════════════════════════
# AT-SPI — freedesktop accessibility bus (cross-desktop no-daemon fallback)
# ═══════════════════════════════════════════════════════════════════════
# AT-SPI runs already on every GTK desktop; enable once with:
#   gsettings set org.gnome.desktop.interface toolkit-accessibility true
# We traverse the desktop root → apps → top-level windows and return the first
# whose StateSet has ATSPI_STATE_ACTIVE (value 1, i.e. bit 0x2) — falling back
# to ATSPI_STATE_FOCUSED (value 8, i.e. bit 0x100) if none is active.

_ATSPI_ACTIVE_BIT = 0x2       # ATSPI_STATE_ACTIVE = 1
_ATSPI_FOCUSED_BIT = 0x100    # ATSPI_STATE_FOCUSED = 8


def _a11y_address() -> str | None:
    try:
        out = subprocess.run(
            ["gdbus", "call", "--session", "--dest", "org.a11y.Bus",
             "--object-path", "/org/a11y/bus", "--method", "org.a11y.Bus.GetAddress"],
            capture_output=True, text=True, timeout=0.8)
    except Exception:
        return None
    if out.returncode != 0:
        return None
    m = re.search(r"'([^']*)'", out.stdout)
    return m.group(1) if m else None


def _a11y_call(addr, dest, path, method, timeout=0.4):
    try:
        out = subprocess.run(
            ["gdbus", "call", "--address", addr, "--dest", dest,
             "--object-path", path, "--method", method],
            capture_output=True, text=True, timeout=timeout)
    except Exception:
        return None
    return out.stdout.strip() if out.returncode == 0 and out.stdout.strip() else None


def _a11y_get(addr, dest, path, prop, timeout=0.4):
    try:
        out = subprocess.run(
            ["gdbus", "call", "--address", addr, "--dest", dest,
             "--object-path", path, "--method", "org.freedesktop.DBus.Properties.Get",
             "org.a11y.atspi.Accessible", prop],
            capture_output=True, text=True, timeout=timeout)
    except Exception:
        return None
    return out.stdout.strip() if out.returncode == 0 and out.stdout.strip() else None


def _gvariant_str(raw: str) -> str:
    """Pull a string out of a GVariant literal like <'foo'> or ('foo',)."""
    m = re.search(r"'((?:[^'\\]|\\.)*)'", raw)
    if not m:
        return ""
    return m.group(1).replace("\\'", "'").replace('\\"', '"')


def _gvariant_uints(raw: str) -> list[int]:
    return [int(x) for x in re.findall(r"\d+", raw)]


def _atspi_scan(addr, want_bit) -> FocusSnapshot | None:
    """Traverse desktop → apps → windows; return first whose StateSet has want_bit."""
    children_raw = _a11y_call(addr, "org.a11y.atspi.Registry",
                              "/org/a11y/atspi/accessible/root",
                              "org.a11y.atspi.Accessible.GetChildren")
    if not children_raw:
        return None
    for app_bus, app_path in re.findall(r"\('(:[\d.]+)',\s*'([^']+)'\)", children_raw):
        win_raw = _a11y_call(addr, app_bus, app_path,
                             "org.a11y.atspi.Accessible.GetChildren")
        if not win_raw:
            continue
        for wb, wp in re.findall(r"\('(:[\d.]+)',\s*'([^']+)'\)", win_raw):
            states_raw = _a11y_get(addr, wb, wp, "States")
            if not states_raw:
                continue
            bits = _gvariant_uints(states_raw)
            if not bits or not (bits[0] & want_bit):
                continue
            app = _gvariant_str(_a11y_get(addr, app_bus, app_path, "Name") or "")
            title = _gvariant_str(_a11y_get(addr, wb, wp, "Name") or "")
            if not app:
                continue
            return FocusSnapshot(app=app, title=_redact(title),
                                 window_id=f"atspi:{app}", backend="atspi",
                                 captured_at_ms=_now_ms())
    return None


def _try_atspi() -> FocusSnapshot | None:
    addr = _a11y_address()
    if not addr:
        return None
    return (_atspi_scan(addr, _ATSPI_ACTIVE_BIT)
            or _atspi_scan(addr, _ATSPI_FOCUSED_BIT))


# ═══════════════════════════════════════════════════════════════════════
# Chain + public API
# ═══════════════════════════════════════════════════════════════════════
_X11_CHAIN = [_try_xlib]
_WAYLAND_CHAIN = [
    _try_gnome_extension,   # reliable on GNOME (the only GTK4-capable path)
    _try_hyprland,
    _try_sway,
    _try_kde_kwin,
    _try_atspi,             # bonus: GTK3 apps that load atk-bridge
]


def _chain_for_session() -> list:
    if XDG_SESSION_TYPE == "x11":
        return _X11_CHAIN
    if XDG_SESSION_TYPE == "wayland":
        return _WAYLAND_CHAIN
    return _X11_CHAIN + _WAYLAND_CHAIN  # unknown: try everything (each is cheap)


def probe() -> FocusSnapshot:
    """One-shot: run the backend chain and return the best snapshot."""
    for backend in _chain_for_session():
        snap = backend()
        if snap is not None:
            return snap
    return FocusSnapshot(app="unknown", title="", window_id="", backend="none",
                         captured_at_ms=_now_ms())


def current() -> FocusSnapshot:
    """Return the most recent cached snapshot (thread-safe)."""
    with _lock:
        return _current


def _refresh_loop(interval_s: float):
    global _current, _warned_no_backend
    while True:
        snap = probe()
        with _lock:
            _current = snap
        if snap.backend == "none" and not _warned_no_backend:
            _warned_no_backend = True
            print("[focus_watcher] no backend yielded focused-window data "
                  "(app attribution will be 'unknown'). See the module docstring "
                  "for how to enable focus tracking on your desktop.")
        time.sleep(interval_s)


_started = False


def start(interval_s: float = 0.5) -> None:
    """Start the background refresh thread (idempotent, daemon)."""
    global _current, _started
    with _lock:
        _current = probe()
    if _started:
        return
    _started = True
    threading.Thread(target=_refresh_loop, args=(interval_s,), daemon=True).start()


def snapshot_dict() -> dict:
    """Return :func:`current` as a plain dict (for JSON-serialising into events)."""
    return asdict(current())


# ── smoke test entrypoint ───────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"session_type={XDG_SESSION_TYPE}")
    print("probing backends…")
    snap = probe()
    print(f"  app       = {snap.app!r}")
    print(f"  title     = {snap.title!r}")
    print(f"  window_id = {snap.window_id!r}")
    print(f"  backend   = {snap.backend!r}")
    if snap.backend == "none":
        print("\nNo backend succeeded. To enable focus tracking:")
        print("  • GNOME (Wayland or X11): install the Shell extension once:")
        print("        shared/gnome-extension/install.sh")
        print("    then reload the Shell (Wayland: log out/in; X11: Alt+F2 → r).")
        print("    It's not a daemon — it loads into the running gnome-shell")
        print("    like any other extension, and owns org.autoregia.Focus,")
        print("    which the gnome-extension backend reads without restriction.")
        print("  • Hyprland / Sway / KDE / X11: work out of the box.")
