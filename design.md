# Autoregia Design System

> The working style standard for every Autoregia surface — root pages, sub-system
> apps, and standalone document pages. This document is the entry point; the
> full normative detail lives in [`spec/ui.spec`](spec/ui.spec).

**Normative source:** [`spec/ui.spec`](spec/ui.spec) — tokens, typography,
components, interaction, deviation policy.
**Reference implementation:** [`app/module/pbs/static/`](app/module/pbs/static/) — when in doubt,
the PBS implementation wins over prose.

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
| warning    | `#B4742A` / bg `#FBF1E3` | pending, timed out, partial |
| danger     | `#A33434` / bg `#FAECEC` | failed, blocked    |
| info       | `#3F6092` / bg `#EAEFF6` | informational               |

(These match `spec/ui.spec` §3.7 and every module's `variables.css`; the
semantic layer is independent of the oxford accent.)

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
- **Footer colophon** — mono micro-text, e.g. `AGS · VSM System 5 — Policy`.

---

## 3. Page Archetypes

### 3.1 App shell (interactive sub-system UIs)

Mirror the PBS structure — `static/css/`:

```
variables.css   # tokens — single source of truth
fonts.css       # @font-face, self-hosted
base.css        # reset, globals, eyebrow, kbd
layout.css      # app-shell, header, sidebar, grids
components.css  # component catalog
views.css       # view-specific styles
command-palette.css
```

Users of this archetype: `pbs`, `pkts`, `pwts`, `wos`, `gis`, `aias`,
`aoos`, `loop`.

The shell's sticky header and sidebar — closed by the `.sidebar-colophon` —
satisfy the context-chrome rule (Rule 7): no additional navbar/footer is
required on these surfaces.

### 3.2 Standalone document page (landings, policies, deliberations)

Self-contained HTML with the token block inlined in `<style>` (copy §2.1–2.2
exactly — do not invent values), parchment background, centered column
(`max-width: ~880px`), breadcrumb `← Index`, masthead (eyebrow · title ·
gold rule · lede), sections with `.section-label`, editorial tables, footer
colophon.

Every standalone page must contain its own `<nav>` navbar and `<footer>`
(Rule 7, context chrome) — self-contained markup, no shared include. The
navbar copies the root landing's `topnav` styling; its links are contextual
to the page's own project.

Users of this archetype: `ags` (policy pages), `pras` (deliberations),
`ags`, `acsms`, root plates (`index.html`, `about.html`, `docs.html`).

---

## 4. Rules

1. **Semantic color only** — color communicates meaning; never decoration.
2. **Offline-first** — self-hosted fonts/assets; no CDNs; vanilla HTML/CSS/JS
   (frameworks are not permitted; charting libraries only inside the tokens).
3. **Extend, don't contradict** — a sub-project may add tokens/components; it
   may not introduce an alien theme (`spec/ui.spec` §11.4).
4. **Mono for data** — identifiers, timestamps, payloads, and numeric data set
   in `--mono`.
5. **Accessibility baseline** — WCAG 2.2 AA is the conformance floor for
   every surface: token-ramp contrast, visible Oxford focus, full keyboard
   operation with shortcut guards, named controls, APG-compliant dialogs.
   Normative details: `spec/ui.spec` §10.
6. **Motion with purpose** — guarded by `prefers-reduced-motion`.
7. **Context chrome** — every page must have a **navbar** and a **footer**.
   Both provide context. The navbar follows the root landing's `topnav`
   styling (sticky bar, serif `Autoregia` lockup, sans links with accent
   hover-underline); its **links are contextual** — the index, siblings, and
   parents of the page's own project, plus About/Docs — never a bare global
   list of systems. Each page implements its own markup; no shared include
   (`spec/ui.spec` §12).

---

## 5. Conformance Matrix

| Surface                            | Archetype | Status |
| ---------------------------------- | --------- | ------ |
| `pbs`, `pkts`, `pwts`, `aias`, `ate` — toolbox index, `gial`, `sarl` | app shell / standalone | ✅ conforms (token set) |
| `wos`, `gis`, `aoos`, `loop` | app shell | ⚠ conforms, raw `#FAF1E6` + glyph icons tracked below |
| `ags` — policy pages               | standalone | ✅ conforms |
| `pras` — deliberations             | standalone | ✅ conforms |
| `ags`, `gwob`, `pks` — landing plates | standalone | ⚠ legacy token block (§6 migration) |
| `acsms` — landing                  | standalone | ⚠ legacy token block + glyph icons |
| `awes` — console (`/ate/tool/awes/`) | standalone | ✅ conforms (restyled 2026-09) |
| `index.html`, `about.html`, `docs.html` (root plates) | standalone | ✅ conforms (self-hosted fonts added 2026-09) |

**Tracked non-conformances** (audit 2026-09, against `spec/ui.spec` §10 —
fix or accept per §11.4):

- **Legacy token blocks** — `ags`, `gwob`, `pks`, `acsms`, `about.html`,
  `docs.html` inline `#1c1916/#4a443d/#7a736a/#d8d0c4/#fffdf8` instead of
  the §2.1 neutrals (§6 migration rows exist).
- **Unnamed on-accent tint** — raw `#FAF1E6` as text-on-accent in
  `wos`/`gis`/`aoos`/`loop` CSS+JS (~29 uses); tokenize as
  `--paper-on-accent` (§10.1).
- **Glyph icons** — unicode characters doing icon work: `aoos` (`⚠`,
  `▲▶▼`), `wos` (`✕`, `★`), `awes` (`▶`, `✓`, `✗`), `acsms` (`▼`),
  `pras` (`★`), landing (`↗`, `❯`) — replace with Lucide SVGs (§6
  iconography).
- **Contrast outliers** — landing maps `--muted` to `#8C877B` at
  9.5–10.5px; gold `#A8854A` body-size text on `about`/`docs`;
  `#8A6A34` (`wos` crossref pill) — §10.1.
- **Destructive flows use native `confirm()`** — `aoos` (×4), `aias`,
  `gis` — replace with the in-app modal (§10.6).
- **Missing accessible names** — icon-only modal close buttons and
  unlabeled search inputs across app shells (§10.5).
- **Keyboard baseline gaps** — `/` search shortcut missing on
  `wos`/`gis`/`aoos`/`loop` (§8.1).
- **Sub-10px micro-labels** — `aoos` (8px), `wos` (9px), `loop` (8px SVG
  arc labels) (§4.2 floor).
- **Landing finder** — search hits link to module roots, not the matched
  record.
- **Standalone-page hygiene** — `about`/`docs` missing `← Index`
  breadcrumb; `about` duplicated blockquote + placeholder table row;
  `aoos` `docs.html`/`share.html` lack context chrome; dead 0-byte
  `aoos/static/about.html`.

Derived SVG tints in the Fig. 1 control-loop plate (`#f7f0df`, `#f3ecdb`,
`#e0d2b0`, `#f4ecda`, …) predate the token set; they sit inside the family
and may converge onto token-derived values progressively.

---

## 6. Migration Guide (legacy → canonical)

| Legacy value                  | Canonical token        |
| ----------------------------- | ---------------------- |
| `--parchment: #f7f3ea`        | `--paper: #FAFAF6`     |
| `--gold: #b8893a`             | `--gold: #A8854A`      |
| `--green: #4ade80`            | success `#3F6E50` / `#ECF3EE` |
| `--yellow: #fbbf24`           | warning `#B4742A` / `#FBF1E3` |
| `--red: #f87171`              | danger `#A33434` / `#FAECEC` |
| `--blue: #60a5fa` (buttons)   | `--oxford: #7A1A2A`    |
| `--ink: #1c1916` (legacy plates) | `--ink: #2C2A26`    |
| `--ink-soft: #4a443d`         | `--ink-soft: #44413B`  |
| `--muted: #7a736a`            | `--muted: #6B665B`     |
| `--rule: #d8d0c4`             | `--rule: #E2DED4`      |
| `--rule-soft: #e8e1d4`        | `--rule-soft: #EEEAE0` |
| `--surface: #fffdf8`          | `--surface: #FFFFFF`   |
| raw `#FAF1E6` (text on accent) | `--paper-on-accent` (`spec/ui.spec` §10.1) |
| `--bg: #1a1a1e` (dark themes) | `--paper: #FAFAF6`     |
| serif without `Spectral`      | `Spectral`-first stack |
| `-apple-system`-first sans    | `Inter`-first stack    |

---

## References

- [`spec/ui.spec`](spec/ui.spec) — normative specification (§3 tokens, §4
  typography, §7 component catalog, §11 implementation conventions).
- [`app/module/pbs/static/css/variables.css`](app/module/pbs/static/css/variables.css) — canonical
  token file (extended ramp).
- [`app/module/ags/static/css/policy.css`](app/module/ags/static/css/policy.css) — canonical
  standalone token block.
