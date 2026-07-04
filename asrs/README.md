# Agent Self Representation System (ASRS) — Reference Implementation

> ASRS is the **Agent Self Representation System** — the integration layer that composes the agent's **World** boundary `(External, Internal)`, the external-world **Model** ([PWMS](../spec/asrs/pwms/README.md)), the **Self Model** ([PSMS](../spec/asrs/psms/README.md)), and the **Policy System** ([PPS](../spec/asrs/pps/README.md)) into one coherent self-representation.

> This directory contains the **reference implementation**. The conceptual foundations — the four parts, their composition, and the generative consistency check — live in [`../spec/asrs/README.md`](../spec/asrs/README.md).

## Reference Implementation

A Flask server plus a vanilla HTML/CSS/JS client that conforms to the Autoregia UI specification ([`../spec/ui.spec`](../spec/ui.spec)). Where the three constituent sub-systems each maintain a fragment, ASRS renders the **integrated whole** and runs the **consistency check** — the generative function that detects when the represented self disagrees with itself.

- **Data:** a seed self-representation in [`data/seed.json`](data/seed.json) — the World boundary plus representative PWMS entity/relation/event/domain types, PSMS identity/capability/resource/belief/commitment/constraint facets, and PPS charter/values/principles.
- **Composition view:** renders the four parts as one structure — Policy over `World = (External, Internal)`, with the Model in the external half and the Self Model in the internal half.
- **Consistency check:** examines the representation for (1) resource over-allocation, (2) constraint violation, (3) value/belief drift. The seed is intentionally crafted so the checker reports a time over-allocation and a sleep-floor violation.

> The three constituents are specification skeletons today; ASRS stands them up together with representative data so the integration — and its generative function — can be seen and exercised. As PWMS/PSMS gain implementations, ASRS will read from them rather than from seed data.

## Parts

- **[`server.py`](server.py)** — Flask app; loads `data/seed.json`, exposes `/api/representation`, `/api/world`, `/api/model`, `/api/self`, `/api/policy`, and `/api/check`, and serves the index and static assets.
- **[`data/seed.json`](data/seed.json)** — the seed self-representation (the data).
- **[`index.html`](index.html)** — landing page: the composition diagram, the four-part facet panels, and the consistency check.
- **[`static/`](static)** — `css/asrs.css`, `js/app.js`.

## API

| Endpoint              | Returns |
| --------------------- | ------- |
| `/asrs/api/representation` | The full integrated structure: World + Model + Self + Policy. |
| `/asrs/api/world`          | The `(External, Internal)` boundary. |
| `/asrs/api/model`          | The PWMS external-world ontology. |
| `/asrs/api/self`           | The PSMS self-model facets. |
| `/asrs/api/policy`         | The PPS normative layer. |
| `/asrs/api/check`          | The consistency check findings. |

## Run

Under the unified Autoregia server:

```bash
python3 app.py
# open http://localhost:8080/asrs/
```

Standalone:

```bash
pip install -r asrs/requirements.txt
python3 asrs/server.py
# open http://localhost:5007
```

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** representational substrate of [Agent State](../spec/about.md) (S5 – Policy) — the unified model-of-self-in-the-world the control loop perceives, decides, and learns against.
- **Composed of:** the World boundary, [PWMS](../spec/asrs/pwms/README.md) (Model), [PSMS](../spec/asrs/psms/README.md) (Self Model), and [PPS](../spec/asrs/pps/README.md) (Policy System).
- **Adapted by:** [PRAS](../spec/pras/README.md) — the feedback arc that revises this representation when intention and outcome diverge.
