# PKTS — Personal Keyword Tracking System (Web Client)

A behavioral telemetry laboratory that exposes temporal dynamics, workflow
structures, cognitive-state indicators, and identity-level signatures derived
from a keystroke stream. This is the **web client prototype**, built against
the global Autoregia UI specification (`spec/ui.spec`) and the PKTS client
spec (`spec/pkts/client.spec`), running entirely on **mock data**.

## Stack

- **Vanilla HTML, CSS, JS** (no framework) — per `spec/ui.spec` §11.1.
- **Apache ECharts** (self-hosted, offline-first) — the charting-library
  exception granted by §11.1, themed to the design tokens.
- **Flask** mock API serving the dataset.

## Run

```bash
# 1. (optional) regenerate the mock dataset
python3 pkts/data/gen_mock.py

# 2. install & run the server
pip install -r pkts/requirements.txt
python3 pkts/server.py
```

Open <http://localhost:5001>. (PRS occupies port 5000.)

## Structure

```
pkts/
├── server.py                 # Flask mock API + static host (port 5001)
├── requirements.txt
├── README.md
├── data/
│   ├── gen_mock.py           # deterministic KeystrokeEvent[] generator
│   └── mock_keystrokes.json  # generated dataset (conforms to schema.json)
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

## Regenerating data

```bash
python3 pkts/data/gen_mock.py   # deterministic (seeded) -> data/mock_keystrokes.json
```
