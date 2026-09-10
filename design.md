# Autoregia Design System

> The working style standard for every Autoregia surface — root pages, sub-system
> apps, and standalone document pages. This document is the entry point; the
> full normative detail lives in [`spec/ui.spec`](spec/ui.spec).

**Normative source:** [`spec/ui.spec`](spec/ui.spec) — tokens, typography,
components, interaction, deviation policy.
**Reference implementation:** [`app/module/prs/static/`](app/module/prs/static/) — when in doubt,
the PRS implementation wins over prose.

---

## 1. Philosophy

The interface is a **scholarly substrate**, not an application dashboard:
`academic journal × private study × fine print craft`. Warm parchment, deep
binding red, a signature gold hairline, hairline borders, editorial small-caps
labels. Beauty comes from *typography, spacing, and composition* — never from
decoration.

**Out of scope, everywhere:** dark telemetry themes, saturated marketing
palettes, generic dashboard chrome, decoration gradients, web-font CDNs.

---

## 2. Core Tokens

### 2.1 Color

| Token          | Value     | Role                                        |
| -------------- | --------- | ------------------------------------------- |
| `--paper`      | `#FAFAF6` | page background                              |
| `--surface`    | `#FFFFFF` | raised surfaces (cards, panels)              |
| `--surface-warm` | `#FBF9F4` | warm tint surfaces                         |
| `--ink`        | `#2C2A26` | primary text                                 |
| `--ink-soft`   | `#44413B` | secondary text                               |
| `--muted`      | `#6B665B` | muted text                                   |
| `--faint`      | `#8C877B` | faint text                                   |
| `--rule`       | `#E2DED4` | hairline borders                             |
| `--rule-soft`  | `#EEEAE0` | soft borders                                 |
| `--oxford`     | `#7A1A2A` | accent — links, primary actions, emphasis    |
| `--oxford-deep`| `#641020` | accent hover / destructive-deep              |
| `--gold`       | `#A8854A` | gold rule, eyebrows, section labels          |
| `--gold-soft`  | `#C7A972` | gold hairlines                               |
| `--gold-tint`  | `#F6EFE1` | gold-tinted fills                            |

Semantic status (meaning only, never decoration):

| Token      | Value     | Use                                |
| ---------- | --------- | ---------------------------------- |
| success    | `#3F6E50` / bg `#ECF3EE` | completed, enacted, healthy |
| warning    | `#B07A2A` / bg `#FBF1E3` | pending, timed out, partial |
| danger     | `#7A1A2A` (oxford) / bg `#F4E8EA` | failed, blocked    |
| info       | `#3F6092` / bg `#EAEFF6` | informational               |

### 2.2 Typography

> Self-hosted and offline-first. No web-font CDNs.

| Token    | Stack                                                          | Role                          |
| -------- | -------------------------------------------------------------- | ----------------------------- |
| `--serif`| `"Spectral", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` | titles, prose, editorial |
| `--sans` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`   | UI chrome, labels, controls |
| `--mono` | `"IBM Plex Mono", "SF Mono", Consolas, monospace`              | identifiers, code, timestamps, data |

Type scale is modular (1.250, major third) — see `spec/ui.spec` §4.2.

### 2.3 Signature elements

- **Gold rule** — `1px` horizontal hairline, `64px` wide, centered, `--gold`.
- **Eyebrow** — small-caps sans label, wide tracking (`.2em+`), `--gold` or `--muted`.
- **Editorial tables** — thin sans uppercase headers with a `2px` ink bottom
  border; row hairlines `--rule`; code cells in `--mono` + `--oxford`.
- **Footer colophon** — mono micro-text, e.g. `PPS · VSM System 5 — Policy`.

---

## 3. Page Archetypes

### 3.1 App shell (interactive sub-system UIs)

Mirror the PRS structure — `static/css/`:

```
variables.css   # tokens — single source of truth
fonts.css       # @font-face, self-hosted
base.css        # reset, globals, eyebrow, kbd
layout.css      # app-shell, header, sidebar, grids
components.css  # component catalog
views.css       # view-specific styles
command-palette.css
```

Users of this archetype: `prs`, `pkts`, `pais`, `peos`, `gis`, `aias`,
`aoos`, `loop`.

### 3.2 Standalone document page (landings, policies, deliberations)

Self-contained HTML with the token block inlined in `<style>` (copy §2.1–2.2
exactly — do not invent values), parchment background, centered column
(`max-width: ~880px`), breadcrumb `← Index`, masthead (eyebrow · title ·
gold rule · lede), sections with `.section-label`, editorial tables, footer
colophon.

Users of this archetype: `pps` (policy pages), `pras` (deliberations),
`asrs`, `acsms`, root plates (`index.html`, `about.html`, `docs.html`).

---

## 4. Rules

1. **Semantic color only** — color communicates meaning; never decoration.
2. **Offline-first** — self-hosted fonts/assets; no CDNs; vanilla HTML/CSS/JS
   (frameworks are not permitted; charting libraries only inside the tokens).
3. **Extend, don't contradict** — a sub-project may add tokens/components; it
   may not introduce an alien theme (`spec/ui.spec` §11.4).
4. **Mono for data** — identifiers, timestamps, payloads, and numeric data set
   in `--mono`.
5. **Motion with purpose** — guarded by `prefers-reduced-motion`.

---

## 5. Conformance Matrix

| Surface                            | Archetype | Status |
| ---------------------------------- | --------- | ------ |
| `prs`, `pkts`, `pais`, `peos`, `gis`, `aoos`, `aias`, `loop` | app shell | ✅ conforms (token set) |
| `pps` — policy pages               | standalone | ✅ conforms |
| `pras` — deliberations             | standalone | ✅ conforms |
| `asrs`                             | standalone | ✅ conforms |
| `acsms` — landing                  | standalone | ✅ conforms |
| `awes` — console                   | standalone | ✅ conforms (restyled 2026-09) |
| `index.html`, `about.html`, `docs.html` (root plates) | standalone | ✅ conforms (tokens aligned 2026-09) |

**Residual convergence items** (tracked, non-blocking):

- Root plates do not yet load self-hosted `@font-face` (they rely on the
  fallback chain); serve `static/fonts/` from the root app when convenient.
- Derived SVG tints in the Fig. 1 control-loop plate (`#f7f0df`, `#f3ecdb`,
  `#e0d2b0`, `#f4ecda`, …) predate the token set; they sit inside the family
  and may converge onto token-derived values progressively.

---

## 6. Migration Guide (legacy → canonical)

| Legacy value                  | Canonical token        |
| ----------------------------- | ---------------------- |
| `--parchment: #f7f3ea`        | `--paper: #FAFAF6`     |
| `--gold: #b8893a`             | `--gold: #A8854A`      |
| `--green: #4ade80`            | success `#3F6E50` / `#ECF3EE` |
| `--yellow: #fbbf24`           | warning `#B07A2A` / `#FBF1E3` |
| `--red: #f87171`              | danger `#7A1A2A` / `#F4E8EA` |
| `--blue: #60a5fa` (buttons)   | `--oxford: #7A1A2A`    |
| `--bg: #1a1a1e` (dark themes) | `--paper: #FAFAF6`     |
| serif without `Spectral`      | `Spectral`-first stack |
| `-apple-system`-first sans    | `Inter`-first stack    |

---

## References

- [`spec/ui.spec`](spec/ui.spec) — normative specification (§3 tokens, §4
  typography, §7 component catalog, §11 implementation conventions).
- [`app/module/prs/static/css/variables.css`](app/module/prs/static/css/variables.css) — canonical
  token file (extended ramp).
- [`app/module/pps/static/css/policy.css`](app/module/pps/static/css/policy.css) — canonical
  standalone token block.
