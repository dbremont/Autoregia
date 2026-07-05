# Autoregia Agency Dashboard (`loop/`)

> A read-only **analytical dashboard** that presents aspects of the **agent's agency** — the agent interacting with its environment — through a set of instruments over the data the agent generates about itself and its world. It is built for self-management: to let the agent *see* its own operation clearly enough to steer it.

> This is **not** a VSM system-map surface. It is organized around the **agent** (`spec/about.md` — the agent as an adaptive control system acting on an environment), and the facets of its agency: the environment it is in, its internal reserves, what it does and causes, where its attention goes, what it owes, and what it believes.

> Each panel is an **analytical tool** over a distinct aspect. The prototype runs on a deterministic mock substrate; every metric is computed live in the browser.

## Run

```bash
pip install -r loop/requirements.txt
python3 loop/server.py          # http://localhost:5006
# or mounted under the unified server:  python3 app.py  ->  /loop/
```

To regenerate the mock substrate:

```bash
python3 loop/data/gen_mock.py   # deterministic -> loop/data/mock_loop.json
```

## Aspects (the panels)

| Aspect | Operates over | Agential question |
| --- | --- | --- |
| **Overview** | all aspects, at a glance | "How is the agent doing, overall?" |
| **Environment** | the discrete event stream (occurrence · outcome · trigger · observational) + entities + domains | "What is my world doing, and how fast?" |
| **Internal State** | the essential variables — time · energy · attention · money | "Are my reserves sustainable?" |
| **Action & Outcome** | sessions executed vs outcomes observed; effort calibration | "What did my actions cause?" |
| **Attention** | attention allocation across domains/entities over time | "Where is my scarcest resource going?" |
| **Commitments** | obligations, deadlines, reliability | "What do I owe, and do I keep my word?" |
| **Time & Rhythm** | spent hours by domain/project/mode (deep · shallow · low), weekly rhythm, focus windows | "Where do my hours actually go?" |

## Stack & Conformance

- **Vanilla HTML/CSS/JS** (no framework) + self-hosted **Apache ECharts** (the `ui.spec` §11.1 charting exception), themed to the design tokens.
- Strict conformance to [`spec/ui.spec`](../ui.spec): warm-parchment Oxford aesthetic, shared design tokens, app-shell layout, command palette (`Ctrl/Cmd+K`), progressive disclosure, tabular figures, Lucide icons, offline-first self-hosted fonts.
- **Read-only.** It observes; it does not steer.

## Structure

```
loop/
├── server.py                 # Flask mock API + static host (port 5006; mountable at /loop/)
├── requirements.txt
├── data/
│   ├── gen_mock.py           # deterministic whole-loop substrate generator
│   └── mock_loop.json        # generated dataset
└── static/
    ├── index.html            # app shell: header · sidebar · main · footer
    ├── fonts/                # self-hosted Spectral / Inter / IBM Plex Mono
    ├── css/                  # variables · fonts · base · layout · components · views · command-palette
    └── js/
        ├── vendor/echarts.min.js
        ├── store.js          # data layer + every agency-aspect computation
        ├── icons.js          # <loop-icon> Lucide registry
        ├── charts.js         # ECharts token-themed wrapper
        ├── views.js          # shared card helpers
        ├── app.js            # router, sidebar, window selector, keyboard
        ├── overview.js · environment.js · internal.js
        ├── action.js · attention.js · commitments.js · time.js
        ├── command-palette.js
        └── scratchpad.js
```

## Relation to Autoregia

- **Parent:** [Autoregia](../../README.md).
- **Model basis:** the **agent** and the **agent control loop** ([`spec/about.md`](../about.md)), not the VSM system map.
- **Reads from (the agent's data):** [PRS](../prs/) records (perception, beliefs, commitments), the environment event stream, [AOOS](../aoos/) sessions (actions/execution), [PKTS](../pkts/) accounting (attention/resources), [PRAS](../pras/) reflection.
- **Decision log:** [`logos.log.md`](../../logos.log.md).
- **Full specification:** [`spec.md`](spec.md).
