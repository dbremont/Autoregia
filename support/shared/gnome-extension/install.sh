#!/usr/bin/env bash
# Install + enable the Autoregia PAIS Focus Bridge GNOME Shell extension.
#
# The extension exports the focused window (app + title) over the session
# D-Bus as org.autoregia.Focus, which shared/focus_watcher.py reads. On modern
# GNOME (GTK4) AT-SPI does not publish app windows, so this is the only
# reliable focus source. Not a daemon — loaded into the already-running
# gnome-shell like any other extension.
#
# One-time setup. After enabling you need to reload the Shell once so it scans
# the extensions directory:
#   Wayland → log out and back in.
#   X11     → Alt+F2, type 'r', Enter.
# Run:  shared/gnome-extension/install.sh
set -euo pipefail

UUID="pais@autoregia"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/$UUID"
EXT_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions"
DEST="$EXT_DIR/$UUID"

echo "[install] extension source: $SRC"
echo "[install] extension dest:   $DEST"

if [ ! -d "$SRC" ]; then
    echo "[install] ERROR: source not found ($SRC)" >&2
    exit 1
fi

mkdir -p "$EXT_DIR"

# Symlink so repo edits are picked up without re-installing. Replace any
# existing entry (backing up a real directory first).
if [ -L "$DEST" ]; then
    rm "$DEST"
elif [ -d "$DEST" ]; then
    mv "$DEST" "$DEST.bak.$(date +%s)"
fi
ln -s "$SRC" "$DEST"
echo "[install] symlinked $DEST -> $SRC"

# Enable it for the next session (and ensure user extensions aren't globally
# disabled). `gnome-extensions enable` queries the running Shell which may not
# have loaded the extension yet, so set gsettings directly for reliability.
if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.shell disable-user-extensions false 2>/dev/null || true
    CUR="$(gsettings get org.gnome.shell enabled-extensions 2>/dev/null)"
    case "$CUR" in
        *"$UUID"*) : ;;  # already present
        *) gsettings set org.gnome.shell enabled-extensions \
              "$(echo "$CUR" | sed "s/\]/, '$UUID']/")" 2>/dev/null || true ;;
    esac
    echo "[install] enabled-extensions: $(gsettings get org.gnome.shell enabled-extensions)"
fi

# Best-effort live enable (no-op if the running Shell hasn't scanned yet).
gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell/Extensions \
    --method org.gnome.Shell.Extensions.EnableExtension "$UUID" >/dev/null 2>&1 || true

# Probe: is the D-Bus name up yet?
sleep 1
if gdbus call --session --dest org.autoregia.Focus --object-path /org/autoregia/Focus \
        --method org.autoregia.Focus.Ping >/dev/null 2>&1; then
    echo "[install] SUCCESS — extension is live:"
    gdbus call --session --dest org.autoregia.Focus --object-path /org/autoregia/Focus \
        --method org.autoregia.Focus.GetActive 2>&1 || true
    echo "[install] verify with:  python3 -m shared.focus_watcher"
    exit 0
fi

cat <<EOF

[install] The extension is installed and enabled, but the running GNOME Shell
[install] only scans the extensions directory at session start. To activate it:
[install]     Wayland → log out and back in once.
[install]     X11     → Alt+F2, type 'r', Enter.
[install] Then verify the focus backend resolves real apps:
[install]     python3 -m shared.focus_watcher
EOF
