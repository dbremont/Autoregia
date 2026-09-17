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

Type scale: eleven `--text-*` steps (10–49px) in `/ui/css/tokens.css`;
strict 1.250 ratio from `--text-lg` up, hand-tuned body range. All
font-sizes use the tokens — raw px only inside fluid `clamp()`
(`spec/ui.spec` §4.2).

### 2.3 Signature elements

- **Gold rule** — `1px` horizontal hairline, `64px` wide, centered, `--gold`.
- **Eyebrow** — small-caps sans label, wide tracking (`.2em+`), `--gold` or `--muted`.
- **Editorial tables** — thin sans uppercase headers with a `2px` ink bottom
  border; row hairlines `--rule`; code cells in `--mono` + `--oxford`.
- **Footer colophon** — mono micro-text, e.g. `AGS · VSM System 5 — Policy`.

---

## 3. Page Archetypes

### 3.1 App shell (interactive sub-system UIs)

Link the shared layer, then the tool's own files:

```html
<link rel="stylesheet" href="/ui/css/tokens.css">   <!-- §2.1 tokens -->
<link rel="stylesheet" href="/ui/css/fonts.css">    <!-- self-hosted -->
<link rel="stylesheet" href="/ui/css/base.css">
<link rel="stylesheet" href="/<tool>/css/layout.css">
<link rel="stylesheet" href="/<tool>/css/components.css">
<link rel="stylesheet" href="/<tool>/css/views.css">
<link rel="stylesheet" href="/<tool>/css/command-palette.css">
```

The shared layer lives in `app/support/ui/`, served at `/ui/` — there are
no per-module copies of tokens or fonts (ui.spec §11.2). The tool's
`layout.css` carries the app shell (header, sidebar, grids) and its own
`<x-icon>` element rule; `views.css` is view-specific.

Users of this archetype: `pbs`, `pkts`, `pwts` (shares pkts's shell +
`pwts.css`), `wos` (+`wos.css`), `gis`, `aias`, `aoos`, `loop`.

The shell's sticky header and sidebar — closed by the `.sidebar-colophon` —
satisfy the context-chrome rule (Rule 7): no additional navbar/footer is
required on these surfaces.

### 3.2 Standalone document page (landings, policies, deliberations)

Self-contained HTML: link the shared layer, then one page `<style>` block
for **page rules only** — never re-declare tokens or fonts:

```html
<link rel="stylesheet" href="/ui/css/tokens.css">
<link rel="stylesheet" href="/ui/css/fonts.css">
<link rel="stylesheet" href="/ui/css/standalone.css">  <!-- --ink, --accent, … aliases -->
```

Parchment background, centered column (`max-width: ~880px`), breadcrumb
`← Index`, masthead (eyebrow · title · gold rule · lede), sections with
`.section-label`, editorial tables, footer colophon.

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
| `pbs`, `pkts`, `pwts`, `aias`, `ate` — toolbox index, `gial`, `sarl` | app shell / standalone | ✅ conforms (token set; aias dialect noted, motion+focus guards added 2026-09) |
| `wos`, `gis`, `aoos`, `loop` | app shell | ✅ conforms (paper-on-accent token, Lucide icons, contrast — 2026-09) |
| `ags` — policy pages               | standalone | ✅ conforms |
| `pras` — deliberations             | standalone | ✅ conforms |
| `ags`, `gwob`, `pks` — landing plates | standalone | ✅ conforms (canonical tokens 2026-09) |
| `acsms` — landing                  | standalone | ✅ conforms (canonical tokens 2026-09) |
| `awes` — console (`/ate/tool/awes/`) | standalone | ✅ conforms (restyled 2026-09) |
| `index.html`, `about.html`, `docs.html` (root plates) | standalone | ✅ conforms (self-hosted fonts, canonical tokens 2026-09) |

**Tracked non-conformances** (re-audit 2026-09-17, remediation pass):
the 2026-09 audit items were re-tested against WCAG 2.2 AA / APG /
Nielsen practice and the following were found outstanding and are now
**fixed in this pass**: silent localStorage fallbacks reporting success
(pbs/pkts/aias/gis stores now write through to the API and report
"saved locally — sync pending" honestly), broken `<label>` association
in JS-generated forms (gis/pbs/aias helpers emit `for=`), missing modal
APG contract (all modals/palettes wire `AUTOREGIA.dialog`: `role="dialog"`,
`aria-modal`, focus trap, restore-to-invoker), AOOS Space-key hijack of
button activation, single-char shortcuts firing with modifiers held,
unlabeled icon-only buttons and selects, contrast failures (informative
`--ink-6`/`--faint` text swept to passing steps; gold-as-text now uses
`--gold-ink` `#8A6A2F`), sub-24px chip-remove targets, palette search
focus visibility, native `alert()` in pbs, unhandled fetch failures
(awes/wos/pwts/pras), pure-black shadows, off-token chart hues
(pbs private palette, purple/pink/brown/light-blue converging onto §3
values via `AUTOREGIA.CHART`), dead per-tool `css/{fonts,base}.css`
links, missing `↑/↓` navigation in the AOOS palette, missing palettes
on pwts and awes, missing `<main>` on standalone plates, missing
`tabular-nums`/breakpoints on pwts, and pras missing `base.css`.
Known remaining deviations: AOOS `docs.html` dark code-block pair
(`--code-bg` `#2A2620`/`#E8E2D4`, sanctioned §11.4 domain surface);
document plates keep their layout px (§5.1) — raw radii/spacing there
are grandfathered; ECharts canvas `fontSize` numerics remain (canvas
cannot consume CSS vars — palettes/colors are token-derived via
`AUTOREGIA.CHART`); pbs delete is client-side only (no server DELETE
endpoint) and is reported as unpersisted.

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
