# General Integration Abstraction Layer

> This document establishes the conceptual foundations, data model, functionality,
> and design of a **General Integration Abstraction Layer (GIAL)**. A GIAL is a
> technical object engineered to `integrate external systems` — it gives the agent
> one uniform abstraction for connecting to the services the world runs on
> (Gmail, Google Drive, GitHub, or any HTTP API), in the tradition of Zapier and
> n8n: a registry of **integrations**, configured **connections** with managed
> credentials, schema-described **actions**, and logged **executions**, with a
> playground in which every connection can be opened, exercised, and observed.

> Within the Autoregia Personal Viable System Model (PVSM), GIAL is not an organ
> of the control loop: it is a tool of the **Agent Toolbox Ecosystem (ATE)**,
> mounted at `/ate/tool/gial/`. It extends the reach of two stages at once —
> **Execution** (where AWES acts on the world through computational environments,
> GIAL acts through the APIs of external systems) and **Perception** (external
> observations arrive through the same doors). It is deliberately *not* a
> workflow engine: orchestration — chaining actions into sequences — is AWES
> territory. GIAL is the connection layer the rest of the toolbox orchestrates
> over.

Fundamentally, a GIAL exists to make *reaching an external system* a uniform,
inspectable, repeatable operation. These include:

- **Integrations** — the connector definitions: one per external system, each a
  Python adapter declaring its authentication scheme and its action set. The
  unit of capability.
- **Actions** — the operations an integration exposes, each with a declared
  parameter schema (the unit of work the playground can render a form for).
- **Connections** — configured instances of an integration: name, settings, and
  credentials held server-side. The unit of access.
- **Executions** — logged runs of an action over a connection: request,
  response, status, latency. The unit of evidence.

## The Model

### Integration

An integration is a Python adapter module in the tool's `integrations/`
package, subclassing a common base:

| Field | Meaning |
| --- | --- |
| `id` | stable slug (`http`, `rss`, `github`, `gmail`, `drive`) |
| `name`, `summary` | human-facing identity |
| `auth_scheme` | one of `none · bearer · basic · api_key_header · oauth2` |
| `actions()` | the action set, each with its parameter schema |
| `test_connection(conn)` | health check behind the connection's Test button |

The registry is discovered from the package — adding an integration is adding
one module; no central list to edit.

### Action

An action is one operation on an integration: `execute(connection, params) →
result dict`, plus a declared parameter schema (`name, type, required, default,
description`) from which the playground generates its run form.

Every action carries an **operation kind** — the taxonomy follows Zapier's
per-app model:

| Kind | Meaning | Example |
| --- | --- | --- |
| `action` | a write or mutation | upload file, send email, create folder |
| `search` | a pure read, no side effects | find file, list issues |
| `find_or_create` | search first, create if missing — idempotent by construction | find-or-create folder |
| `trigger` | an event that starts work | *reserved* — no scheduler exists in this design; the kind is declared in schemas so the extension point is real |

### Connection

A connection is a configured instance of an integration: name, settings
(base URLs, defaults), and credentials. Credentials live server-side only —
**every API response masks them to presence flags** (`{"bearer": "●●●"}`), so
no secret ever crosses the API edge.

Connection status depends on the scheme:

- Key schemes (`bearer`, `basic`, `api_key_header`): `untested → ok | error`,
  set by the Test button.
- `oauth2`: `disconnected → awaiting_consent → connected`, driven by the
  consent flow below; `connected` carries the granted scopes and token expiry.

### Execution

Every run is logged: connection, action, params, status (`ok | error`), HTTP
status code, `duration_ms`, a request summary (method + URL), the response body
**truncated to 4 KiB** with a selected header subset, and any error text.
Executions are GIAL's evidence trail — the analogue of AWES sessions and PBS
records.

## Conventions

- **`confirm`** — destructive actions declare a boolean `confirm` parameter;
  the runner renders it as an explicit checkbox and the adapter refuses to run
  without it (Zapier's "Confirm deletion" pattern).
- **`idempotency_key`** — write actions accept an optional key, forwarded as an
  `Idempotency-Key` header over HTTP; `find_or_create` actions are idempotent
  by construction.
- **Masked credentials** — presence flags only, everywhere, no exceptions.
- **Bounded responses** — bodies truncated, headers subset, so a runaway
  payload can never flood the plate or the log.

## Authentication

| Scheme | User experience |
| --- | --- |
| `none` | connect immediately — nothing to configure |
| `bearer` | paste one token |
| `basic` | paste username + password |
| `api_key_header` | paste a key + the header name it travels in |
| `oauth2` | **click and consent — no keys handled at all** (below) |

### The OAuth2 flow — click-consent

The one-time cost belongs to setup, not to use: a Google Cloud OAuth client
(client ID + secret) is pasted **once per connection** — the n8n model; no
platform escapes registering the app with the provider. Everything after that
is automatic:

1. **Connect** — the playground's Connect button opens the provider's consent
   screen (scopes declared by the integration; `state` carries a CSRF token;
   PKCE where the provider supports it).
2. **Consent** — the user clicks; the provider redirects back to
   `/auth/callback`.
3. **Exchange & store** — GIAL exchanges the code for access + refresh tokens
   and stores them server-side, masked at the API edge.
4. **Refresh** — actions go through the scheme: on expiry or 401 it refreshes
   once and retries transparently.

The user never sees, copies, or pastes a token.

## Adapters (v1)

| Integration | Auth | Status | Actions |
| --- | --- | --- | --- |
| `http` | bearer · basic · api_key | **live** | `request` — the universal operation (method, url, query, headers, body); the n8n HTTP Request workhorse |
| `rss` | none | **live** | `read` — feed entries via stdlib XML; the zero-config demo |
| `github` | bearer (optional) | **live** | `list_repos`, `list_issues` — public API; a PAT only lifts rate limits |
| `gmail` | oauth2 | **flow-complete, dormant** | `send`, `list`, `find` |
| `drive` | oauth2 | **flow-complete, dormant** | `upload_file`, `create_folder`, `move_file`, `find_file`, `find_or_create_folder` — modeled on Zapier's Drive operation set |

*Dormant* means the code path is complete — exchange, refresh, actions — and
tested against a mock token endpoint, but unexercisable against Google until a
real OAuth client is pasted once. Dormancy is visible in the registry as the
connection's `disconnected` state with setup copy, never as missing code.

## API Surface

| Endpoint | Description |
| --- | --- |
| `GET /api/integrations` | registry: integrations, action schemas, kinds, availability |
| `POST /api/connections` | create a connection (credentials accepted once here) |
| `GET /api/connections` | list connections, credentials masked |
| `GET /api/connections/<id>` | connection detail |
| `DELETE /api/connections/<id>` | remove connection + stored credentials |
| `POST /api/connections/<id>/test` | health check |
| `GET /api/connections/<id>/auth/start` | 302 to the provider consent screen (oauth2) |
| `GET /api/connections/<id>/auth/callback` | code exchange, token store (oauth2) |
| `POST /api/execute` | run `{connection_id, action, params}` — logs an execution |
| `GET /api/executions` | execution log |
| `GET /api/executions/<id>` | execution detail |
| `DELETE /api/executions` | clear the log |

## Storage

A single CouchDB database `gial` through the shared `support.storage.Store`,
seed-on-empty per house convention. Connection documents carry credentials and
are masked at the API edge; execution documents are append-only evidence. Test
suites use the isolated `gial_test_` prefix and never touch dev data.

## The Playground

One plate, three zones, in the design language of the rest of the system
(`design.md` tokens):

- **Left** — integration cards (name, auth badge, action count) above the
  connection manager: create per integration, masked credential fields, test
  and connect buttons, status chips.
- **Right** — the runner: connection select → action select grouped by kind →
  the schema-generated parameter form (required first, `confirm` as checkbox) →
  Run → status chip + JSON response pane.
- **Bottom** — the execution log: one row per run with an `ok | error` badge,
  click through to full detail.

## Implementation Status

**Designed — not implemented.** This document is the design; a design plate
reserves the URL at `/ate/tool/gial/` and carries the model summary. The
implementation order when begun: `base.py` (model + auth schemes) → `http`,
`rss`, `github` adapters → API + CouchDB storage → runner on the plate →
oauth2 flow with `gmail` and `drive` → tests (mock HTTP echo server, fixture
feed XML, mock token endpoint).

## References

- Zapier's per-app operation model — triggers / write / search /
  find-or-create — the taxonomy adopted above:
  <https://zapier.com/apps/google-drive/integrations>
- n8n — the workflow orchestrator GIAL deliberately is not:
  <https://docs.n8n.io>
- The sibling execution tool this layer complements: [AWES](../awes/)
