# PAIS — Personal Application Interaction System

A behavioral telemetry laboratory that records **how the agent interacts with
applications** — mouse pointer, clicks, scroll, and the focused-window
timeline — and joins that telemetry with the [PKTS](../pkts/README.md)
keystroke stream to surface **application-interaction analytics**: where time
is spent, how attention is fragmented, and how input is distributed across
apps. Built against the global Autoregia UI specification (`spec/ui.spec`).

Three cooperating parts — **collector**, **ingestion + processing**, and **web
client** — turn raw mouse/focus events into the analytical artifacts rendered
in the UI.

## Relation to PKTS and the shared focus watcher

PAIS is a sibling of PKTS. The two share a single source of truth for the
focused window — [`shared/focus_watcher.py`](../shared/) — so every keystroke
(owned by PKTS) and every mouse event + focus segment (owned by PAIS) carries
identical application attribution:

```
                         ┌───────────────────────┐
                         │ shared/focus_watcher   │  ← X11 + Wayland backend chain
                         └───────────┬───────────┘
                          read by    │          owns the timeline
                  ┌──────────────────┴──────────────────┐
                  ▼ (stamps each keystroke)             ▼ (stamps each mouse event
        ┌──────────────────┐                    ┌──────────────────┐
        │ pkts/collector.py│                    │ pais/collector.py│
        └────────┬─────────┘                    └────────┬─────────┘
                 │                                       │
           db "pkts" (read-only join ◄──────────── db "pais")
```

PAIS does **not** re-capture keystrokes; those remain PKTS's contract. The
analytics layer (`pais/analytics.py`) reads the processed `pkts` CouchDB
database read-only and joins on the application name.

## Stack

- **Vanilla HTML, CSS, JS** (no framework) — per `spec/ui.spec §11.1`.
- **Apache ECharts** (reused from PKTS) — token-themed.
- **Flask** API + static host.
- **evdev** mouse collector (reads `/dev/input/event*`; works on X11 and
  Wayland), with a **pynput** X11 fallback.
- **CouchDB** persistence (shared `storage.Store`; dbs `pais_raw`, `pais`).
- **Redis + RQ** asynchronous processing of raw batches into the
  schema-conforming `MouseEvent` / `FocusEvent` documents the client consumes.

## Run

PAIS runs under Autoregia's unified dispatcher (`app.py`), mounted at
`/pais/`.

```bash
# 0. dependencies (Python) + running CouchDB (:5984) and Redis (:6379)
pip install -r pais/requirements.txt

# 1. unified dispatcher — serves /pais/ (and every other sub-system) on :8080
python3 app.py

# 2. RQ worker — drains the pais queue                    (terminal 2)
python3 pais/worker.py

# 3. interaction collector — captures & POSTs to /pais/api/ingest  (terminal 3)
python3 pais/collector.py
```

Open <http://localhost:8080/pais/>. The dashboard starts empty and fills as the
collector streams events. The collector defaults to
`http://localhost:8080/pais/api/ingest`; override with `PAIS_INGEST_URL`.

## Structure

```
pais/
├── server.py                 # Flask API + static host: /api/ingest + read + analytics endpoints
├── collector.py              # evdev/pynput mouse collector + focus-timeline emitter
├── jobs.py                   # RQ job: pair clicks, sessionize, wrap into schema docs
├── analytics.py              # the PAIS/PKTS join — app-interaction analytics
├── tasks.py                  # Redis/RQ connection + best-effort enqueue helper
├── worker.py                 # RQ worker entrypoint
├── requirements.txt
├── README.md
└── static/
    ├── index.html            # dashboard shell
    ├── css/pais.css          # PAIS-specific layout (Oxford tokens via /pkts/css/)
    └── js/
        ├── store.js          # API + formatting helpers
        ├── views.js          # card + chart renderers
        └── app.js            # router, controls, polling
```

## Collector

`pais/collector.py` reads mouse events directly from the Linux kernel input
layer via evdev (universal: X11 + Wayland), with a pynput fallback on X11. It
also reads the shared focus watcher every ~0.5 s and emits a **focus segment**
(`FocusEvent`) whenever the active window changes — the authoritative "where
the user's attention was" record.

**Movement coalescing**: raw kernel-rate pointer movement is *never* stored. It
is accumulated and emitted as a `move_sample` at most every
`PAIS_MOVE_SAMPLE_INTERVAL_MS` (default 200 ms ≈ 5 Hz). On evdev, which yields
only relative deltas, absolute coordinates are integrated from a screen-center
origin and clamped to the screen bounds (`PAIS_SCREEN_W` / `PAIS_SCREEN_H`).

Events are buffered and POSTed every ~5 s or 50 events; failed POSTs are
re-queued, so transient server downtime loses no data.

### Focused-window attribution

Input capture (keyboard + mouse) is kernel-level via evdev and works
everywhere. **Focus attribution is compositor-level, not kernel-level** — the
shared watcher (`shared/focus_watcher.py`) uses the lowest-level source each
desktop exposes, no separate daemons:

| Desktop | Source |
| --- | --- |
| X11 | EWMH `_NET_ACTIVE_WINDOW` (python-xlib) |
| Hyprland / Sway / wlroots | `hyprctl` / `swaymsg` (already installed) |
| KDE | `qdbus org.gnome.KWin` (already installed) |
| **GNOME (Wayland or X11)** | **the `pais@autoregia` Shell extension** — `org.autoregia.Focus` D-Bus |
| GTK3 desktops (bonus) | AT-SPI accessibility bus (best-effort) |

GNOME blocks every low-level path: `org.gnome.Shell.Introspect` is denied,
`Shell.Eval` needs unsafe-mode, and on GTK4 AT-SPI no longer publishes app
windows (verified — only `gjs`/Desktop appears on the a11y bus). The extension
is the only reliable source on modern GNOME. It is **not a daemon** — it loads
into the already-running gnome-shell like any other extension (you likely have
several enabled already), and owns `org.autoregia.Focus`, which the watcher
reads without restriction. One-time install:

```bash
shared/gnome-extension/install.sh
# then reload the Shell once: Wayland → log out/in; X11 → Alt+F2 'r'.
python3 -m shared.focus_watcher   # backend should read "gnome-extension"
```

Where no backend yields data, the watcher returns `app="unknown"` with a
one-time warning; keystroke and mouse capture continue unaffected.

Window titles can carry sensitive content. Set `PAIS_TITLE_REDACT_REGEX`
(comma-separated Python regexes) in the collector's environment to mask
matching substrings *before* they leave the focus watcher process.

## Pipeline

```
[collector.py]  →  POST /api/ingest  →  CouchDB db "pais_raw"  (raw batches)
                       │                          │
                       └─ enqueue(pais.jobs.process_pending)
                                                  ▼
                                     [RQ worker: pais/worker.py]
                                       pair click_down/click_up → derive click_dwell_ms
                                       sessionize by idle gap → wrap into MouseEvent/FocusEvent
                                                  ▼
                                             CouchDB db "pais"
                                                  ▼
                          GET /api/events  ·  GET /api/analytics  →  web client
```

A raw mouse tuple posted by the collector:

```jsonc
{"doc_kind": "mouse", "event_type": "click_down", "button": "left",
 "x": 812, "y": 540, "modifiers": [], "hw_time_ms": 1750000000123,
 "focused_window_id": "gnome:1", "application_name": "firefox", "window_title": "GH issue"}
```

A raw focus segment (emitted on window change):

```jsonc
{"doc_kind": "focus", "started_ms": 1750000000000, "ended_ms": 1750000010000,
 "duration_ms": 10000, "app": "firefox", "title": "GH issue",
 "window_id": "gnome:1", "backend": "gnome-introspect", "hw_time_ms": 1750000010000}
```

`/api/ingest` returns `202 Accepted` with a `batch_id`; processing runs off the
request path on the `pais` RQ queue. Redis outage never loses data — the batch
is persisted to CouchDB first, and the worker drains *every* unprocessed batch
on each run. Inspect backlog via `GET /api/jobs/status`.

## Analytics

`GET /api/analytics` runs the PAIS/PKTS join live. It returns:

| Block | Artifacts |
| --- | --- |
| `totals` | active time, keystrokes (from PKTS), clicks, scrolls, movement distance, app switches, keys/click, apps seen |
| `apps[]` | per-application: time, keystrokes, clicks, keys/click, scrolls, movement, focus segments, mean segment, fragmentation index, switches |
| `timeline[]` | 5-minute buckets of keystrokes / clicks / scrolls / active-ms |
| `idle_gaps[]` | detected idle periods (≥ 60 s of no input) |

Query params: `from` / `to` (ISO 8601 bounds), `app` (filter to one application).

## Keyboard

| Shortcut | Action |
| --- | --- |
| (none yet) | — |

## Design conformance

Implements the warm-parchment Oxford aesthetic via the shared token vocabulary
served at `/pkts/css/`. PAIS ships only PAIS-specific layout in `css/pais.css`;
the full design system is reused from PKTS (the two sub-systems are always
co-deployed).

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md)
- **Role:** VSM System 3 – Audit / Accounting (sibling of PKTS)
- **Spec:** [`../spec/pais/spec.md`](../spec/pais/README.md), [`schema`](../spec/pais/schema.json)
- **Sibling sub-projects:** [PRS](../prs/), [PKTS](../pkts/), [PTOCS](../ptocs/),
  [PPS](../pps/), [AOOS](../aoos/), [PRAS](../pras/), [AWES](../awes/)
- **Decision log:** [`../logos.log.md`](../logos.log.md)
