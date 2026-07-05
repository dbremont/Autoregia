"""Cross-cutting libraries shared by Autoregia sub-systems.

Currently houses :mod:`shared.focus_watcher` — the single source of truth for
"which window/app was focused at time T" — consumed by PKTS (to stamp each
keystroke with its application context) and by PAIS (the focus timeline and
per-event mouse attribution). Import the submodule explicitly::

    from shared import focus_watcher
    focus_watcher.start()
    snap = focus_watcher.current()
"""
