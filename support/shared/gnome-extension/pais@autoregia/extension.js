// Autoregia PAIS Focus Bridge — GNOME Shell extension (45/46/47, ESM).
//
// Exposes the focused window over the session D-Bus so the PAIS collector
// (shared/focus_watcher.py) can read the active application + title on GNOME
// Wayland. On modern GNOME (GTK4) AT-SPI does not publish app windows, and
// org.gnome.Shell.Introspect is denied / Shell.Eval needs unsafe-mode — so this
// in-process extension is the only reliable focus source. It owns the
// org.autoregia.Focus D-Bus name, so there are no access-control barriers.
//
//   org.autoregia.Focus  @ /org/autoregia/Focus
//     GetActive() → (app:str, title:str, window_id:str)
//     Ping()      → (str)
//
// Not a daemon: loaded into the already-running gnome-shell (like any other
// extension). Install + enable: shared/gnome-extension/install.sh

import Gio from 'gi://Gio';

const BUS_NAME = 'org.autoregia.Focus';
const BUS_PATH = '/org/autoregia/Focus';

const IFACE_XML = `
<node>
  <interface name="org.autoregia.Focus">
    <method name="GetActive">
      <arg type="s" name="app" direction="out"/>
      <arg type="s" name="title" direction="out"/>
      <arg type="s" name="window_id" direction="out"/>
    </method>
    <method name="Ping">
      <arg type="s" name="pong" direction="out"/>
    </method>
  </interface>
</node>`;

export default class PAISFocusExtension {
    enable() {
        this._impl = Gio.DBusExportedObject.wrapJSObject(IFACE_XML, this);
        this._impl.export(Gio.DBus.session, BUS_PATH);
        this._owner = Gio.DBus.session.own_name(
            BUS_NAME,
            Gio.BusNameOwnerFlags.NONE,
            () => log('[pais@autoregia] D-Bus name acquired: ' + BUS_NAME),
            () => log('[pais@autoregia] D-Bus name lost: ' + BUS_NAME));
    }

    disable() {
        if (this._owner !== null) {
            Gio.DBus.session.unown_name(this._owner);
            this._owner = null;
        }
        if (this._impl) {
            this._impl.unexport();
            this._impl = null;
        }
    }

    // ── org.autoregia.Focus implementation ─────────────────────────────────
    // global.display.get_focus_window() always returns the current focus at
    // call time, so no caching is needed.
    GetActive() {
        const w = global.display ? global.display.get_focus_window() : null;
        if (!w) {
            return ['', '', ''];
        }
        // WM_CLASS instance is the lowercase app id (e.g. "firefox"); matches
        // the X11 EWMH convention used by the other backends.
        const app = w.get_wm_class_instance() || w.get_wm_class() || '';
        const title = w.get_title() || '';
        const windowId = String(w.get_id());
        return [app, title, windowId];
    }

    Ping() {
        return ['pong'];
    }
}
