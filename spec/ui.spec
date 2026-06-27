# Autoregia UI Specification

> This document establishes the **canonical user-interface standard for every Autoregia sub-project** — the Personal Recording System (PRS), the Personal Keyword Tracking System (PKTS), the Autoregia landing/index pages, and any future tool developed within this workspace.

> Its purpose is **standardization and consistency**: a single visual language, a single design-token vocabulary, and a single component grammar shared across all surfaces, so that any Autoregia tool is instantly recognizable and behaves predictably.

> The reference implementation is the **Personal Recording System (PRS)** prototype. Its design tokens (`prs/static/css/variables.css`), typography, layout, and component library are normative: every value, name, and pattern below is lifted from that implementation. PRS is the source of truth; all other sub-projects must converge on it.

> **Relation to other specs:** This is the *project-wide* UI layer. Sub-project conceptual/architectural specs live alongside it: [`spec/prs/`](prs/) (PRS foundations & functionality) and [`spec/pkts/`](pkts/) (PKTS client behavior). Where a sub-project spec describes *what* a screen must do, this document specifies *how every screen must look and feel*.

---

## 1. Design Philosophy

> The interface should be visually calm, consistent, and minimal, with aesthetics emerging from clarity, hierarchy, and purposeful design rather than decoration.

> The interface follows an elegant, timeless, **Oxford-inspired aesthetic** — `academic journal × private study × fine print craft` — characterized by clarity, restraint, refined typography, balanced composition, and the absence of unnecessary ornamentation.

The Autoregia interface is a **scholarly substrate**, not an application dashboard. It reads as premium print matter brought to the screen: warm parchment, deep binding red, a signature gold hairline, hairline borders, and editorial small-caps labels. Beauty is achieved through *typography, spacing, and composition* — never through ornamentation, gradients-as-decoration, or gratuitous color.

This register is mandatory across all sub-projects. A dark neon telemetry theme, a saturated marketing palette, or a generic dashboard look are all **out of scope** for Autoregia tools.

---

## 2. UX Guiding Principles

> This when applicable.

| Category                   | Principle                      | Description                                                                                                                              |
| -------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Interaction Model**      | Keyboard shortcuts             | The most relevant actions should be accessible via keyboard, including a command palette, shortcuts, bulk operations, and navigation optimized for power users. |
| **Interaction Model**      | Progressive disclosure         | Expose essential information first; reveal advanced metadata, provenance, diagnostics, and configuration only when needed.               |
| **Interaction Model**      | Command palette everywhere     | Provide a universal command interface (`Ctrl/Cmd + K`) for all actions and navigation on every surface.                                  |
| **Data Integrity & Trust** | Validity in the editor         | Surface schema violations, grammar errors, broken references, and enum mismatches inline.                                                |
| **Data Integrity & Trust** | Immutable-by-default model     | Make revisions explicit; keep history and diffs always discoverable.                                                                     |
| **Data Integrity & Trust** | Transparent system state       | Clearly communicate save status, synchronization, validation, and background processing states.                                          |
| **Data Integrity & Trust** | Explainability over magic      | Generated suggestions, automations, and inferences should be inspectable, never opaque.                                                  |
| **Visual Design**          | Sophisticated restraint        | Prioritize typography, spacing, clarity, and composition over decoration.                                                               |
| **Visual Design**          | Whitespace as structure        | Use spacing intentionally to create cognitive grouping and improve scanning.                                                             |
| **Visual Design**          | Semantic color usage           | Colors must communicate meaning (type, status, priority), never serve as decoration.                                                     |
| **Visual Design**          | Consistent visual language     | Maintain predictable patterns, components, iconography, and behaviors across every tool.                                                 |
| **Visual Design**          | Motion with purpose            | Animations should communicate causality, continuity, and state transitions — and must be guarded by `prefers-reduced-motion`.            |
| **Expert User Experience** | Offline-first                  | Self-host fonts and assets; the interface must function without a network.                                                               |
| **Expert User Experience** | Data legibility                | Use tabular figures everywhere data appears; honor a defined reading measure for prose.                                                  |

---

## 3. Design Tokens

All tokens are CSS custom properties defined once per project in a `variables.css` file. **Names below are normative** — every Autoregia sub-project must adopt the same token names so components and views are portable. Token *values* are normative for the default (light) theme.

### 3.1 Warm Neutral Ink Ramp

> A 10-step warm-neutral ramp, from near-black ink to paper. This is the backbone of the palette — borders, text, and surfaces are all drawn from it.

| Token        | Hex       | Role                       |
| ------------ | --------- | -------------------------- |
| `--ink-0`    | `#1E1C19` | Headlines (near-black)     |
| `--ink-1`    | `#2C2A26` | Primary text               |
| `--ink-2`    | `#44413B` | Strong secondary           |
| `--ink-3`    | `#5B574E` | Secondary text             |
| `--ink-4`    | `#6B665B` | Tertiary text              |
| `--ink-5`    | `#8C877B` | Muted text                 |
| `--ink-6`    | `#A7A296` | Faint text                 |
| `--ink-7`    | `#C9C4B8` | Hairline (strong)          |
| `--ink-8`    | `#E2DED4` | Borders                    |
| `--ink-9`    | `#EEEAE0` | Light borders              |
| `--ink-10`   | `#F4F1EA` | Surface-warm tint          |
| `--paper`    | `#FAFAF6` | Page background            |

### 3.2 Surfaces (tonal layering)

| Token                  | Value            | Use                          |
| ---------------------- | ---------------- | ---------------------------- |
| `--color-bg`           | `--paper`        | Page background              |
| `--color-surface`      | `#FFFFFF`        | Cards, modals (base layer)   |
| `--color-surface-1`    | `#FDFCF8`        | Raised subtle layer          |
| `--color-surface-2`    | `--ink-10`       | Inputs, inset surfaces       |
| `--color-surface-warm` | `#FBF9F4`        | Sidebar, modal footers       |

### 3.3 Borders

| Token                    | Value            |
| ------------------------ | ---------------- |
| `--color-border`         | `--ink-8`        |
| `--color-border-light`   | `--ink-9`        |
| `--color-border-strong`  | `--ink-7`        |
| `--color-border-focus`   | `--oxford`       |

### 3.4 Text

| Token                     | Value      |
| ------------------------- | ---------- |
| `--color-text`            | `--ink-1`  |
| `--color-text-secondary`  | `--ink-3`  |
| `--color-text-muted`      | `--ink-5`  |
| `--color-text-faint`      | `--ink-6`  |

### 3.5 Oxford Accent (library binding red)

> The single brand accent. Used for primary actions, focus rings, selection, and active navigation. Deepened from a classic library binding red.

| Token                   | Value            |
| ----------------------- | ---------------- |
| `--oxford`              | `#7A1A2A`        |
| `--oxford-deep`         | `#641020`        |
| `--oxford-bright`       | `#962030`        |
| `--oxford-tint`         | `#F4E8EA`        |
| `--oxford-bg`           | `#FAF1F2`        |
| `--color-accent`        | `--oxford`       |
| `--color-accent-hover`  | `--oxford-deep`  |
| `--color-accent-light`  | `--oxford-tint`  |
| `--color-accent-bg`     | `--oxford-bg`    |

### 3.6 Signature Gold Rule

> The decorative-but-functional divider. Marks active states, stat-card accents, detail headers, and the editorial rule. Never used for primary affordances.

| Token                | Value            |
| -------------------- | ---------------- |
| `--gold`             | `#A8854A`        |
| `--gold-soft`        | `#C7A972`        |
| `--gold-tint`        | `#F6EFE1`        |
| `--rule-gold`        | `--gold-soft`    |
| `--color-gold`       | `--gold`         |
| `--color-gold-light` | `--gold-tint`    |

### 3.7 Semantic Status Colors

| Token                    | Hex       | Meaning                |
| ------------------------ | --------- | ---------------------- |
| `--color-success`        | `#3F6E50` | Completed / healthy    |
| `--color-success-light`  | `#ECF3EE` | Success surface        |
| `--color-warning`        | `#B4742A` | Caution / pending      |
| `--color-warning-light`  | `#FBF1E3` | Warning surface        |
| `--color-danger`         | `#A33434` | Error / blocked        |
| `--color-danger-light`   | `#FAECEC` | Danger surface         |
| `--color-info`           | `#3F6092` | Neutral informational  |
| `--color-info-light`     | `#EAEFF6` | Info surface           |

### 3.8 Domain-Specific Color Maps

These encode record/model semantics. They are **semantic, not decorative** — a status badge must use its status color; a priority badge must use its priority color.

**Status:** `--status-active` `#2D6A4F` · `--status-draft` `--ink-5` · `--status-pending` `#B4742A` · `--status-blocked` `#A33434` · `--status-completed` `#3F6092` · `--status-archived` `--ink-5` · `--status-scheduled` `#3F6092` · `--status-cancelled` `#A33434`.

**Priority:** `--priority-critical` `--oxford` · `--priority-high` `#B4742A` · `--priority-medium` `--gold` · `--priority-low` `--ink-5`.

**State Class:** `--class-internal` `--oxford` · `--class-external` `#3F6E50` · `--class-social` `#3F6092` · `--class-reflective` `--gold` · `--class-identity` `#5C4E78` · `--class-knowledge` `#2D6A4F` · `--class-task` `#B4742A` · `--class-environmental` `#3F6E50`.

### 3.9 Geometry, Shadows, Motion, Z-index

**Radii** — *architectural, intentionally sharp* to read as classic craft:
`--radius-xs` `2px` · `--radius-sm` `3px` · `--radius-md` `5px` · `--radius-lg` `7px` · `--radius-xl` `10px` · `--radius-pill` `999px`. Border weight: `--hairline` `1px`.

**Shadows** — multi-layer ambient elevation (ink-tinted, never pure black):
`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, and `--ring-focus` `0 0 0 3px rgba(122,26,42,0.16)`.

**Motion** — easing vocabulary:
`--ease-out-expo` `cubic-bezier(0.16,1,0.3,1)` · `--ease-out-soft` `cubic-bezier(0.25,0.8,0.4,1)` · `--ease-spring` `cubic-bezier(0.34,1.4,0.64,1)`; durations `--transition-fast` `110ms`, `--transition-normal` `200ms`, `--transition-slow` `360ms`.

**Z-index layers:**
`--z-dropdown` `100` · `--z-sticky` `200` · `--z-overlay` `300` · `--z-modal` `400` · `--z-palette` `500` · `--z-toast` `600`.

---

## 4. Typography

### 4.1 Type Families

> Self-hosted and offline-first. No web-font CDNs. All fonts are OFL/IBM licensed and committed per project under `static/fonts/`.

| Token             | Stack                                                            | Role                                  |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------- |
| `--font-display`  | `'Spectral', 'Georgia', 'Times New Roman', serif`                | Headlines, titles, prose body, editorial IDs |
| `--font-body`     | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | UI chrome, labels, controls, metadata |
| `--font-mono`     | `'IBM Plex Mono', 'SF Mono', 'Consolas', monospace`              | Identifiers, timestamps, keyboard hints, numeric data |

### 4.2 Modular Type Scale (1.250 — major third)

| Token          | Size        | Role                          |
| -------------- | ----------- | ----------------------------- |
| `--text-2xs`   | `0.625rem`  | Keycaps, folio micro-text     |
| `--text-xs`    | `0.6875rem` | Labels, eyebrow               |
| `--text-sm`    | `0.8125rem` | Body small, controls          |
| `--text-base`  | `0.875rem`  | Body (root control size)      |
| `--text-md`    | `1rem`      | Body lead, search input       |
| `--text-lg`    | `1.25rem`   | h3                            |
| `--text-xl`    | `1.5rem`    | h2                            |
| `--text-2xl`   | `1.953rem`  | h1                            |
| `--text-3xl`   | `2.441rem`  | Display / stat values         |
| `--text-4xl`   | `3.052rem`  | Hero                          |

### 4.3 Leading, Tracking, Measure

- **Leading:** `--leading-tight` `1.18` (headings) · `--leading-snug` `1.35` · `--leading-normal` `1.5` (body) · `--leading-relaxed` `1.7` (prose).
- **Tracking:** `--tracking-tight` `-0.02em` (display) · `--tracking-snug` `-0.01em` · `--tracking-normal` `0` · `--tracking-wide` `0.04em` · `--tracking-wider` `0.08em` · `--tracking-widest` `0.16em`.
- **Measure:** `--measure` `64ch` · `--measure-narrow` `52ch` — prose columns never exceed the reading measure.

### 4.4 Typographic Conventions

- Headings use `--font-display`, weight 600, `--leading-tight`, `--tracking-tight`, color `--ink-0`.
- Body uses `--font-body`, `--leading-normal`.
- **Tabular figures everywhere data appears** — `font-variant-numeric: tabular-nums` on `.stat-value`, `.stat-card`, `code`, `.detail-id`, `.folio`, `.data-num`, `.text-mono`, and all timestamp/ID displays.
- **Editorial eyebrow** — `.eyebrow`: small-caps, uppercase, `--tracking-wider`, `--gold`. Used as a section label above titles.
- OpenType features enabled globally: `kern`, `liga`, `calt`, `common-ligatures`.
- Selection: `::selection { background: --oxford-tint; color: --oxford-deep; }`.

---

## 5. Spacing & Layout

### 5.1 Spacing — 4/8 Baseline Grid

| Token        | rem       | px |
| ------------ | --------- | -- |
| `--space-1`  | `0.25rem` | 4  |
| `--space-2`  | `0.5rem`  | 8  |
| `--space-3`  | `0.75rem` | 12 |
| `--space-4`  | `1rem`    | 16 |
| `--space-5`  | `1.25rem` | 20 |
| `--space-6`  | `1.5rem`  | 24 |
| `--space-8`  | `2rem`    | 32 |
| `--space-10` | `2.5rem`  | 40 |
| `--space-12` | `3rem`    | 48 |
| `--space-16` | `4rem`    | 64 |
| `--space-20` | `5rem`    | 80 |
| `--space-24` | `6rem`    | 96 |

All paddings, margins, gaps, and grid gutters must be drawn from this scale.

### 5.2 App Shell Layout

| Token               | Value    | Role                        |
| ------------------- | -------- | --------------------------- |
| `--sidebar-width`   | `268px`  | Persistent left navigation  |
| `--header-height`   | `58px`   | Sticky top header           |
| `--content-max`     | `1200px` | Max content column          |

The canonical **application shell** is a two-column CSS grid: a sticky header spanning both columns, a warm-toned left sidebar, and a scrolling main content region. This shell is normative for full application surfaces (PRS, PKTS).

```
┌──────────────────────────────────────────────┐
│  Header (brand · search · primary actions)    │  z-sticky
├──────────────┬───────────────────────────────┤
│              │                                │
│  Sidebar     │       Main content             │
│  (warm)      │       (paper, reading measure) │
│              │                                │
└──────────────┴───────────────────────────────┘
```

### 5.3 Content Grids & Breakpoints

Grid utilities: `.grid-2`, `.grid-3`, `.grid-4` (responsive, collapsing at 900px and 650px). Detail/reading views center within `max-width: 760px` (manuscript column). Content padding scales down at 980px; below 650px the sidebar hides and grids collapse to a single column.

---

## 6. Iconography

> Icons are drawn from the **Lucide** monoline set: 1.6px stroke, 24px grid, rounded line caps/joins. **No Unicode glyphs or emoji** may substitute for an icon.

Icons are rendered via a per-project custom element (`<prs-icon name="…">` in PRS; each tool defines an analogous `<*-icon>` element) backed by a self-hosted icon registry (`icons.js`). Icon color inherits `currentColor` so icons tint with their context; opacity sits at ~0.85 inside buttons and ~0.9 in nav.

---

## 7. Component Catalog

> The PRS component library is normative. Each sub-project must reproduce these components with identical names, tokens, and behaviors. Components live in one `components.css` file (plus `command-palette.css` for the overlay class).

### 7.1 Buttons

`.btn` (base, inline-flex, `--radius-md`, `--transition-fast`).
Variants: `.btn-primary` (Oxford fill, cream text, lift on hover), `.btn-secondary` (surface fill, hairline border), `.btn-ghost` (transparent, surface-2 on hover). Sizes: `.btn-sm`, `.btn-lg`. Icons inside buttons use `.prs-icon` at `size="15"`–`17`.

`.btn-icon` — 32×32 square icon button (transparent → surface-2 on hover), used for close/overflow actions.

### 7.2 Cards

`.card` — surface fill, hairline border, `--radius-lg`, `--space-5` padding, gains `--shadow-sm` on hover. Sub-parts: `.card-header`, `.card-body`, `.card-footer`.

`.record-card` — list-item card with a left status/type accent stripe (`::before`), hover lift + accent border, used for record/entity rows.

### 7.3 Badges & Tags

Status/priority/type pills (`--radius-pill`, small-caps or uppercase, tinted background + semantic text color, drawn from the §3.8 maps). Tags must **always** be colored by their semantic category, never chosen for decoration.

### 7.4 Form Controls

Inputs/selects: `--surface-2` background, hairline border, `--radius-md`, focus state switches to `--color-surface` + Oxford border + `--ring-focus`. `.tag-input-container` for multi-value token input. `.form-group` / labels in `.eyebrow` style.

### 7.5 Modal & Overlay

`.modal-overlay` — fixed inset, ink-tinted scrim (`rgba(28,26,23,0.42)`), blur+saturate backdrop-filter, `fadeIn` entrance. `.modal` — `--radius-xl`, `--shadow-xl`, sticky header, optional sticky footer on warm surface, `modalIn` entrance. Closes on `Esc` and scrim click.

### 7.6 Command Palette

`.cmd-palette-overlay` (`z-palette`) → `.cmd-palette` (580px, top-anchored). Fuzzy search input, grouped results (`.cmd-group-label` small-caps headers), `.cmd-result-item` with gold left-border active state, optional `.cmd-result-shortcut` keycap. Opened globally by `Ctrl/Cmd + K`. **Mandatory on every application surface.**

### 7.7 Scratchpad / Quick Capture

`.scratchpad-overlay` (`z-modal`) → `.scratchpad` (640px, top-anchored), borderless Spectral textarea for friction-free capture. Opened by `Ctrl/Cmd + Shift + N`.

### 7.8 Stat Cards & Empty States

`.stat-card` — surface + hairline + a 2px `--rule-gold` left accent (`::after`); `.stat-value` in `--font-display` `--text-3xl`; `.stat-label` small-caps muted.

`.empty-state` — centered, muted, 48px faded icon, short headline + constrained paragraph. Every collection view must define its empty state.

### 7.9 Keycaps & Toasts

`.kbd` / `.kbd-hint` — mono, gradient surface, 2px bottom border to read as a physical key; used to surface keyboard shortcuts inline.

`.wm-toast` (or generic toast) — fixed bottom-right, `--ink-0` fill, cream text, `--z-toast`, fade+slide entrance.

### 7.10 Editorial Details

`.detail-header` uses a 2px `--rule-gold` bottom border. `.detail-section h4` labels are small-caps, `--gold`, `--tracking-widest`. `.sidebar-colophon` closes the sidebar with a gold rule + italic display title + mono meta line (e.g. version/state). These editorial flourishes are what distinguish the Autoregia register from generic dashboards and are mandatory.

---

## 8. Interaction Model

### 8.1 Keyboard Shortcuts

A baseline set every application surface must honor (tool-specific actions may extend it):

| Shortcut               | Action                         |
| ----------------------- | ------------------------------ |
| `Ctrl/Cmd + K`          | Open Command Palette           |
| `Ctrl/Cmd + Shift + N`  | Quick Capture (Scratchpad)     |
| `N`                     | New primary entity / record    |
| `Esc`                   | Close modals / palette         |
| `Enter` (in palette)    | Select first / active result   |
| `↑` / `↓` (in palette)  | Navigate results               |
| `/`                     | Focus global search            |

### 8.2 Progressive Disclosure

Essential metadata first; advanced sections collapse (`.meta-section` with chevron). Long detail renders within a reading-measure manuscript column; diagnostics, provenance, and configuration are hidden behind disclosure or modals.

### 8.3 Focus Conventions

`:focus-visible` renders a 2px Oxford outline, `2px` offset, `--radius-xs`. Inputs additionally gain the `--ring-focus` glow. Focus is always visible and always Oxford-tinted.

---

## 9. Motion

- **Entrance:** `fadeIn`, `slideUp`, `fadeInUp`, `modalIn`, `paletteIn` — all `--ease-out-expo` or `--ease-out-soft`, 120–360ms.
- **Staggered reveals:** `.animate-in` + `.delay-1` … `.delay-5` (50ms steps) for list/dashboard entrance.
- **Micro-interactions:** button hover lift (`translateY(-1px)`), card shadow growth, chevron rotate on disclosure — all `--transition-fast`.
- **Guard:** all non-essential animation is disabled under `@media (prefers-reduced-motion: reduce)` (`.animate-in`, `.modal` → `animation: none`).

---

## 10. Platform & Accessibility

- **Offline-first:** fonts and icons are self-hosted per project; no runtime CDN dependencies for core UI.
- **Reduced motion:** respected (§9).
- **Reduced transparency:** the paper-grain overlay (`body::before`) is hidden under `@media (prefers-reduced-transparency: reduce)`.
- **Data legibility:** tabular figures on all numeric data (§4.4); reading measure enforced on prose.
- **Color contrast:** text colors drawn from the ink ramp maintain WCAG AA against `--paper`; semantic colors are reserved for non-text badges/accents unless paired with compliant text.
---

## 11. Implementation Conventions

### 11.1 Stack

> UI is built with **vanilla CSS, JS, and HTML**. Libraries are permitted; **frameworks are not.** (Per the PRS technical element set; applies project-wide.)

Exceptions for data-rich visualization surfaces (e.g., PKTS) may adopt a charting library (Apache ECharts) — but must do so *within* this design system: chart palettes, typography, and grid must reference the tokens in §3–§4, not introduce an alien theme.

### 11.2 CSS File Split (normative)

Each project's `static/css/` must mirror the PRS structure:

```
css/
├── variables.css        # §3 tokens (single source of truth)
├── fonts.css            # @font-face, self-hosted, offline-first
├── base.css             # reset, typography globals, utilities, eyebrow, kbd
├── layout.css           # app-shell, header, sidebar, grids, breakpoints
├── components.css       # §7 component catalog
├── views.css            # view/route-specific styles
└── command-palette.css  # palette + scratchpad overlays
```

Stylesheets are linked in this order so tokens always precede consumers.

### 11.3 Naming

- Custom properties: `--category-role` / `--category-role-modifier` (e.g. `--color-text-secondary`, `--status-active`).
- Component classes: `.btn`, `.card`, `.modal`, `.cmd-palette` — single-purpose, token-driven, no utility-framework shorthand.
- Custom elements: `<*-icon>` per tool, backed by a shared icon registry.

### 11.4 Per-Project Deviation Policy

A sub-project may **extend** the token set or component catalog (new views, domain-specific visualizations) but may **not contradict** it. Divergent themes (dark neon, saturated marketing, generic dashboard chrome) are out of scope and must be refactored to converge on this standard. The current PKTS dark/cyan/Tailwind prototype is the canonical example of divergence to be reconciled: when implemented against this spec it must adopt the warm parchment palette, Spectral/Inter/IBM Plex Mono typography, the app-shell layout, and the Lucide icon set.

### 11.5 Reference Implementation

The PRS prototype (`prs/static/`) is the reference. When in doubt, the PRS implementation wins over prose in this document; contradictions should be filed against this spec, not the code.

---

## References

- [Autoregia](../README.md) — workspace overview & VSM mapping.
- [PRS — README](prs/README.md) / [spec](prs/spec.md) — conceptual foundations, functionality, and the `UI - UX Guiding Principle` table this spec promotes project-wide.
- [PKTS — client spec](pkts/client.spec) — analytical surface to be reconciled with this standard.
- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6)
- [Lucide Icons](https://lucide.dev) — icon source set.

- **Semantics:** landmarks use `<header>`, `<aside>`, `<main>`; icons in buttons carry `aria-hidden` or `title`; modals close on `Esc`.

