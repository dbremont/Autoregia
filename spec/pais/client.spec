# PAIS Client Spec

> Defines the PAIS web client: the dashboard artifacts rendered from the
> `/pais/api/analytics` and `/pais/api/events` endpoints, and the interaction
> model. Built against `spec/ui.spec`.

## Surface

A single dashboard view (no tabs in the skeleton). All artifacts compute live
from the analytics join of PAIS mouse/focus + PKTS keystrokes.

## Artifacts

| Region | Artifact | Source |
| --- | --- | --- |
| Totals row | active time · keystrokes (PKTS) · clicks · scrolls · app switches · keys/click · apps seen · movement | `totals` |
| Time-per-app chart | horizontal bar, top-15 apps by time, tooltip with duration + % share | `apps[]` |
| Application breakdown | sortable table: time, keys, clicks, keys/click, scrolls, movement, segments, mean segment, fragmentation, switches | `apps[]` |
| Activity timeline | 3-line chart (keystrokes / clicks / scrolls) over 5-min buckets | `timeline[]` |
| Idle gaps | table of detected idle periods (≥ 60 s) | `idle_gaps[]` |

## Interaction

- **Refresh button** — re-fetch analytics.
- **App filter** (header search) — re-fetch with `?app=`; updates totals + table.
- **Export** — downloads `/api/export`.
- Auto-refresh every 15 s; jobs-status footer every 10 s.

## Data contract

See [`schema.json`](schema.json) (`InteractionEvent` → `MouseEvent` /
`FocusEvent`) and `/api/analytics` response shape in
[`pais/analytics.py`](../../pais/analytics.py).

## Status

Skeleton — overview dashboard shipped. Future tabs (per-app detail,
click-coordinate heatmaps, focus-flow Sankey) deferred.
