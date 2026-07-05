# pais@autoregia — GNOME Shell Focus Bridge

A GNOME Shell extension (45/46/47) that exposes the focused window over the
session D-Bus, so [`shared/focus_watcher.py`](../../focus_watcher.py) can read
the active application + title on GNOME Wayland.

## Why this exists

On modern GNOME, every low-level / no-daemon focus source is blocked:

- `org.gnome.Shell.Introspect.GetWindows` → denied to unprivileged callers.
- `org.gnome.Shell.Eval` → needs unsafe-mode (session-only).
- **AT-SPI** → GTK4 apps don't auto-load the atk-bridge, so they don't publish
  (verified on GNOME 46 — only `gjs`/Desktop publishes).
- X11 EWMH → returns 0 on Wayland.

This extension runs **in-process** in gnome-shell and owns the
`org.autoregia.Focus` D-Bus name, which the focus watcher reads without
restriction. It is **not a daemon** — it is loaded into the already-running
gnome-shell, exactly like any other extension.

## D-Bus interface

```
org.autoregia.Focus  @  /org/autoregia/Focus
  GetActive() → (app:str, title:str, window_id:str)
  Ping()      → (str)
```

## Install

```bash
shared/gnome-extension/install.sh
# then reload the Shell once: Wayland → log out and back in. X11 → Alt+F2 'r'.
python3 -m shared.focus_watcher   # backend should read "gnome-extension"
```

The install script symlinks the extension into
`~/.local/share/gnome-shell/extensions/`, adds it to `enabled-extensions`, and
unsets `disable-user-extensions`. GNOME only scans the extensions directory at
session start, hence the one-time re-login.

## Files

```
pais@autoregia/
├── metadata.json   # uuid, shell-version, session-modes
└── extension.js    # ESM module exporting the focus bridge
```
