# Personal Reflection & Adaptation System (PRAS) — Prototype

> PRAS is the **Personal Reflection & Adaptation System** — the Autoregia **Feedback / Intelligence (VSM System 4)** component. It is the stage of the control loop where the agent observes the consequences of what it executed, makes sense of the gap between intention and outcome, and adapts its models, goals, and policies accordingly.

> This directory contains the **prototype implementation**. Conceptual foundations, the data model, and the full functional specification live in [`../spec/pras/`](../spec/pras) ([`README.md`](../spec/pras/README.md), [`spec.md`](../spec/pras/spec.md)).

## Prototype

A Flask server plus a vanilla HTML/CSS/JS client that conforms to the Autoregia UI specification ([`../spec/ui.spec`](../spec/ui.spec)). It mirrors the [PPS](../pps) "documents-as-data" model: **the deliberations are the data** — a set of HTML files under [`deliberations/`](deliberations), indexed at startup to provide search and a grouped listing.

- **Atomic unit:** a *deliberation* — observation → deliberation → adaptation.
- **Lifecycle:** `open → concluded → enacted` (or `superseded`), expressed in each document's `pra-status` meta tag.
- **Adaptation routing:** each deliberation declares the system(s) its adaptation *feeds* — `pps`, `aoos`, `prs`, `ptocs` — via the `pra-feeds` meta tag. Enactment into PPS/AOOS is a manual cross-link in this prototype (a future `AdaptationEnacted` event on the [ISCB](../spec/iscb/spec.md) bus will automate it).

## Parts

- **[`server.py`](server.py)** — Flask app; indexes `deliberations/*.html` at startup, exposes `/api/deliberations` and `/api/search`, serves the index and the documents.
- **[`index.html`](index.html)** — landing page: search, status/type filters, and the deliberation index grouped by domain, with the **Reflection Practice** pinned as the apex.
- **[`deliberations/`](deliberations)** — the deliberation documents (the data):
  - [`practice.html`](deliberations/practice.html) — the apex: the standing reflection method.
  - examples spanning the lifecycle — a weekly review, an enacted deviation (feeds PPS), an open hypothesis, and a retrospective.
- **[`static/`](static)** — `css/deliberation.css`, `js/search.js`.

## Run

Under the unified Autoregia server:

```bash
python3 app.py
# open http://localhost:8080/pras/
```

Standalone:

```bash
pip install -r pras/requirements.txt
python3 pras/server.py
# open http://localhost:5006
```

> **Note on the URL prefix.** PRAS mounts at `/pras/` — distinct from the Recording System's `/prs/`. The full names disambiguate them in the UI.

## To add a deliberation

Drop an `.html` file into `pras/deliberations/` with the `pra-*` meta tags (`title`, `summary`, `domain`, `type`, `status`, `date`, `tags`, optional `feeds`) and restart — the index rebuilds at startup. See [`deliberations/practice.html`](deliberations/practice.html) for the template.

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Loop stage:** Feedback (outer arc).
- **VSM level:** System 4 – Intelligence (deviation detection overlaps S3\* Audit).
- **Reads from:** [PRS](../prs), [AOOS](../aoos) analytics, [PTOCS](../ptocs), [PKTS](../pkts).
- **Feeds:** [PPS](../pps) (policy amendments), [AOOS](../aoos) (corrective actions), [PRS](../prs) (records), [PTOCS](../ptocs) (capability revisions).
- **Specification:** [`../spec/pras/`](../spec/pras).
