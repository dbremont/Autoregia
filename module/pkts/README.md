# PKTS — Personal Keyword Tracking System

A behavioral telemetry laboratory that exposes temporal dynamics, workflow
structures, cognitive-state indicators, and identity-level signatures derived
from a live keystroke stream. Built against the global Autoregia UI
specification (`spec/ui.spec`) and the PKTS client spec
(`spec/pkts/client.spec`).

Three cooperating parts — **collector**, **ingestion + processing**, and
**web client** — turn raw kernel key events into the analytical artifacts
rendered in the UI.

## Stack

- **Vanilla HTML, CSS, JS** (no framework) — per `spec/ui.spec` §11.1.
- **Apache ECharts** (self-hosted, offline-first) — the charting-library
  exception granted by §11.1, themed to the design tokens.
- **Flask** API + static host.
- **evdev** keystroke collector (reads `/dev/input/event*`; works on X11 and
  Wayland).
- **CouchDB** persistence (shared `storage.Store`; dbs `pkts_raw`, `pkts`).
- **Redis + RQ** asynchronous processing of raw keylog batches into the
  schema-conforming `KeystrokeEvent[]` the client consumes.

## Run

PKTS runs under Autoregia's unified dispatcher (`app.py`), which mounts every
sub-system under a path prefix — PKTS lives at `/pkts/`. The web client's
static assets and API calls are all prefix-relative, so it must be served
through the dispatcher (not `pkts/server.py` standalone).

```bash
# 0. dependencies (Python) + running CouchDB (:5984) and Redis (:6379)
pip install -r pkts/requirements.txt

# 1. unified dispatcher — serves /pkts/ (and every other sub-system) on :8080
python3 app.py

# 2. RQ worker — drains the pkts queue                    (terminal 2)
python3 pkts/worker.py

# 3. keystroke collector — captures & POSTs to /pkts/api/ingest  (terminal 3)
python3 pkts/collector.py
```

Open <http://localhost:8080/pkts/>. (The unified landing page is at
<http://localhost:8080/>.)

The UI starts empty and fills as the collector streams events. The collector
defaults to `http://localhost:8080/pkts/api/ingest`; override with
`PKTS_INGEST_URL` (e.g. for standalone `pkts/server.py` on :5001, set it to
`http://localhost:5001/api/ingest`).

## Structure

```
pkts/
├── server.py                 # Flask API + static host (port 5001): /api/ingest + read endpoints
├── collector.py              # evdev keystroke collector daemon (X11 + Wayland)
├── jobs.py                   # RQ job: KeystrokeEvent[] derivation (pair, time, sessionize)
├── tasks.py                  # Redis/RQ connection + best-effort enqueue helper
├── worker.py                 # RQ worker entrypoint (run alongside server.py)
├── requirements.txt
├── README.md
└── static/
    ├── index.html            # app shell: header · tab bar · main · footer · toolbox
    ├── fonts/                # self-hosted Spectral / Inter / IBM Plex Mono (offline-first)
    ├── css/                  # variables · fonts · base · layout · components · views · command-palette
    └── js/
        ├── vendor/echarts.min.js
        ├── store.js          # data layer + every analytical computation
        ├── icons.js          # <pkts-icon> Lucide registry
        ├── charts.js         # ECharts token-themed wrapper
        ├── app.js            # router, tabs, keyboard shortcuts, docs/export
        ├── views.js          # shared card helpers
        ├── overview.js · signature.js · temporal.js · composition.js
        ├── cognitive.js · workflow.js · telemetry.js   # the 7 tab views
        ├── command-palette.js  # Ctrl+K
        └── scratchpad.js       # Ctrl+Shift+N
```

## Collector

`pkts/collector.py` reads keyboard events directly from the Linux kernel
input layer via evdev. Because it reads below the compositor it works
identically on X11 and Wayland, at the cost of read access to
`/dev/input/event*`. systemd-logind grants the active console user an ACL on
those nodes automatically (the `+` in `ls -l /dev/input/event*`), so on a
typical single-user laptop session no extra setup is needed. If access is
denied:

```bash
sudo usermod -aG input $USER          # then fully log out and back in
```

Auto-repeat events (kernel value `2`) are skipped so the worker's
`key_down`/`key_up` pairing stays clean. Events are buffered and POSTed every
~5 s or 50 events (configurable via `PKTS_FLUSH_INTERVAL_S` /
`PKTS_FLUSH_BATCH_SIZE`). Failed POSTs are re-queued, so transient server
downtime loses no data.

## Pipeline

```
[collector.py]  →  POST /api/ingest  →  CouchDB db "pkts_raw"  (raw keylog batches)
                       │                          │
                       └─ enqueue(pkts.jobs.process_pending)
                                                  ▼
                                     [RQ worker: pkts/worker.py]
                                       pair key_down/key_up → derive hold/flight/digraph/wpm
                                       → sessionize by idle gap → tag hand/finger
                                                  ▼
                                            CouchDB db "pkts"
                                                  ▼
                              GET /api/keystrokes  →  static/js/store.js
```

A raw keylog tuple posted by the collector:

```jsonc
{"key": "h", "key_code": "KeyH", "event_type": "key_down",
 "modifiers": [], "hw_time_ms": 1750000000123}
```

`hw_time_ms` is a Unix-epoch millisecond timestamp. `/api/ingest` returns
`202 Accepted` with a `batch_id`; processing runs off the request path on the
`pkts` RQ queue. Redis outage never loses data — the batch is persisted to
CouchDB first, and the worker drains *every* unprocessed batch on each run,
so a missed enqueue is recovered by the next ingest.

Inspect backlog via `GET /api/jobs/status`:
`{raw_batches, pending_batches, processed_events}`.

## Tabs (Artifacts)

Per `spec/pkts/client.spec`, each tab presents **concrete epistemic artifacts**,
all computed live from the raw telemetry:

| Tab | Representative Artifacts |
| --- | --- |
| **Overview** | Volume, throughput WPM, consistency index, fatigue frequency, session count, behavioral-state distribution, cross-session trend, time-series + derivative |
| **Behavioral Signature** | Dwell/flight distribution fingerprints, hand-alternation ratio, finger utilization, modifier strain, keyboard reach heatmap, correction topology |
| **Temporal Dynamics** | Transition-probability matrix, digraph timing matrix, spectral density (FFT), pause structure, interaction entropy |
| **Composition Process** | Burst composition, burst/inter-burst distributions, correction depth, word-level timing vector, production–revision ratio |
| **Cognitive State** | Cognitive load estimator, pause-to-keystroke ratio, fatigue dynamics trajectory, circadian fatigue distribution, flow-state probability trace, fatigue event log |
| **Workflow & Expertise** | Workflow state machine, state-transition matrix, task archetype classifier, command fluency |
| **Raw Telemetry** | Keystroke event log (filterable), hardware timestamp trace, key-code mapping, session index |

## Keyboard

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` | Command palette |
| `Ctrl/Cmd + Shift + N` | Quick capture (scratchpad) |
| `Esc` | Close overlays |

## Design conformance

Implements the warm-parchment Oxford aesthetic, the `variables.css` token
vocabulary, the Spectral/Inter/IBM Plex Mono type system, the app-shell
layout, the §7 component catalog, and the §8 interaction model. The previous
dark/cyan/Tailwind direction is explicitly superseded by this standard
(`spec/ui.spec` §11.4).
