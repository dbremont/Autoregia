# General Connector Abstraction Layer

> This document establishes the conceptual foundations, data model, functionality,
> and design of a **General Connector Abstraction Layer (GCAL)**. A GCAL is a
> technical object engineered to `integrate external systems` — it gives the agent
> one uniform abstraction for connecting to the services the world runs on
> (Gmail, Google Drive, GitHub, or any HTTP API), in the tradition of Zapier and
> n8n: a registry of **connectors**, configured **connections** with managed
> credentials, schema-described **actions**, and logged **executions**, with a
> playground in which every connection can be opened, exercised, and observed.

> Within the Autoregia Personal Viable System Model (PVSM), GCAL is not an organ
> of the control loop: it is a tool of the **Agent Toolbox Ecosystem (ATE)**,
> mounted at `/ate/tool/gcal/`. It extends the reach of two stages at once —
> **Execution** (where CES acts on the world through computational environments,
> GCAL acts through the APIs of external systems) and **Perception** (external
> observations arrive through the same doors). It is deliberately *not* a
> workflow engine: orchestration — chaining actions into sequences — is CES
> territory. GCAL is the connection layer the rest of the toolbox orchestrates
> over.

Fundamentally, a GCAL exists to make *reaching an external system* a uniform,
inspectable, repeatable operation. These include:

- **Connectors** — the connector definitions: one per external system, each a
  Python adapter declaring its authentication scheme and its action set. The
  unit of capability.
- **Actions** — the operations a connector exposes, each with a declared
  parameter schema (the unit of work the playground can render a form for).
- **Connections** — configured instances of a connector: name, settings, and
  credentials held server-side. The unit of access.
- **Executions** — logged runs of an action over a connection: request,
  response, status, latency. The unit of evidence.

## The Model

### Connector

A connector is a Python adapter module in the tool's `connectors/`
package, subclassing a common base:

| Field | Meaning |
| --- | --- |
| `id` | stable slug (`http`, `rss`, `github`, `gmail`, `drive`) |
| `name`, `summary` | human-facing identity |
| `auth_scheme` | one of `none · bearer · basic · api_key_header · oauth2` |
| `actions()` | the action set, each with its parameter schema |
| `test_connection(conn)` | health check behind the connection's Test button |

The registry is discovered from the package — adding a connector is adding
one module; no central list to edit.

### Action

An action is one operation on a connector: `execute(connection, params) →
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

A connection is a configured instance of a connector: name, settings, and
credentials held server-side — **every API response masks them to presence
flags** (`{"bearer": "●●●"}`), so no secret ever crosses the API edge.

The manager is a **dispatching shell, not a fully abstract layer**: different
systems have different connection models and different setup forms, so each
connector ships a **handler** owning its specifics — its setup schema, its
credential shape, its auth-flow details, its error mapping — behind the
uniform handler contract (below). The manager resolves `connector_id →
handler` and dispatches; it never knows what a Notion database picker or an
SMTP TLS toggle is.

Connection lifecycle (use-driven, Zapier-shaped):

```
disconnected → awaiting_consent → connected ⇄ error
                 (oauth2 only)        ↕ use
```

- **Connect**: create (key schemes) or the consent flow (oauth2). **Reconnect**
  re-uses the kept settings — paste again or consent again.
- **Disconnect** (`POST /api/connections/<id>/disconnect`) revokes access —
  oauth2 attempts provider-side revocation best-effort, then drops tokens;
  key schemes drop the secret — while **settings and execution history are
  kept**, stamped with `last_connected_at`. (`DELETE` remains the hard
  remove.)
- **Health is driven by use**: every execution stamps `last_used_at`; the
  handler classifies each outcome (below); consecutive failures trip `error`
  after `max_consecutive_failures` (default 3); any success clears it. The
  Test button can trip `error` too.
- **Broken access is recoverable**: executing on a non-`connected`
  connection returns **409 + a reconnect hint** (the exact next step for the
  scheme), never a bare failure.
- Statuses: key schemes `untested → ok | error` (set by Test);
  `oauth2`: `disconnected → awaiting_consent → connected`, driven by the
  consent flow; `connected` carries granted scopes and token expiry.

The detail payload carries usage alongside health: `last_used_at`,
`executions_24h`, `executions_total`, and the 5 most recent executions.

### Execution

Every run is logged: connection, action, params, status (`ok | error`), HTTP
status code, `duration_ms`, a request summary (method + URL), the response body
**truncated to 4 KiB** with a selected header subset, and any error text.
Executions are GCAL's evidence trail — the analogue of CES sessions and MAD
records.

## The handler contract

The manager programs to one interface; every connector implements it:

| Method | Contract |
|---|---|
| `setup_schema()` | JSON-schema-ish field list for the connection form (settings): `{name, type, required, default, description}` |
| `credentials_schema()` | same shape, for secrets — rendered as masked inputs, stored vaulted |
| `connect(settings, credentials)` | validate + establish; returns the stored connection body (credentials vaulted, never echoed) |
| `test(connection)` | health check behind the Test button → `ok \| error` + detail |
| `execute(connection, action_id, params)` | run one action → result dict |
| `disconnect(connection)` | revoke (provider-side best-effort where applicable) + void credentials |
| `refresh(connection)` | renew expiring credentials (oauth2; no-op otherwise) |
| `classify(outcome)` | map a run outcome to `ok \| auth_failure \| retryable \| bad_params` (below) |
| `reconnect_hint(connection)` | the exact next step for a 409: consent URL or "paste again" |

## Error taxonomy

The manager counts failures; the **handler classifies** them:

| Class | Meaning | Manager behavior | Example |
|---|---|---|---|
| `ok` | ran clean | stamp `last_used_at`, clear failure counter | 200 with a body |
| `auth_failure` | credentials dead | trip `error` at once, execution carries the reconnect hint | 401 on Gmail, revoked PAT |
| `retryable` | transient provider trouble | count, no special handling | 429, 5xx, timeouts |
| `bad_params` | caller error | no health impact | 422 on Notion, unknown action |

## Connector types (the catalog)

| Type | Family | Auth | Standard actions | First connectors |
|---|---|---|---|---|
| `universal-api` | Universal | api_key · bearer · basic | `request` (any method/URL/body) | http |
| `feed-reader` | Feed | none | `read` (entries, bounded) | rss |
| `git-host` | Hosted-git | bearer (optional) | `search` repos/issues, `action` dispatch/release | github |
| `mailbox` | Mail | oauth2 | `search`, `action` send | gmail |
| `mail-sender` | Mail | basic | `action` send | smtp |
| `cloud-files` | Files | oauth2 | `search`, `action` upload/move, `find_or_create` folder | drive |
| `local-files` | Files | none | `search` list/read under configured roots, read-only | files |
| `schedule` | Schedule | oauth2 | `search`, `action` create/update/delete | calendar |
| `document-store` | Substrate | basic | `search` (Mango), `action` put | couchdb |
| `knowledge-base` | Knowledge | bearer | `search` pages/databases, `action` append | notion |

Each type fixes its auth options, its standard action shapes (every `search`
echoes the query and returns a list; every write takes `idempotency_key` and
optional `confirm`), and its `test_connection` contract.

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
   screen (scopes declared by the connector; `state` carries a CSRF token;
   PKCE where the provider supports it).
2. **Consent** — the user clicks; the provider redirects back to
   `/auth/callback`.
3. **Exchange & store** — GCAL exchanges the code for access + refresh tokens
   and stores them server-side, masked at the API edge.
4. **Refresh** — actions go through the scheme: on expiry or 401 it refreshes
   once and retries transparently.

The user never sees, copies, or pastes a token.

## Adapters (v1 — the 10)

| Connector | Type | Auth | Status | Actions |
| --- | --- | --- | --- | --- |
| `http` | universal-api | bearer · basic · api_key | **live** | `request` — the universal operation (method, url, query, headers, body); the n8n HTTP Request workhorse |
| `rss` | feed-reader | none | **live** | `read` — feed entries via stdlib XML; the zero-config demo |
| `github` | git-host | bearer (optional) | **live** | `search` repos/issues, `action` release/dispatch — public API; a PAT lifts rate limits |
| `couchdb` | document-store | basic | **live** | `search` (Mango find), `action` put — the system's own substrate, localhost |
| `files` | local-files | none | **live** | `search` list/read under configured roots, read-only |
| `smtp` | mail-sender | basic | **live** | `action` send — outbound mail without the OAuth ceremony |
| `gmail` | mailbox | oauth2 | **flow-complete, dormant** | `send`, `list`, `find` |
| `drive` | cloud-files | oauth2 | **flow-complete, dormant** | `upload_file`, `create_folder`, `move_file`, `find_file`, `find_or_create_folder` — modeled on Zapier's Drive operation set |
| `calendar` | schedule | oauth2 | **flow-complete, dormant** | `list`, `create`, `update`, `delete` events — generalizes AOOS's proven sync; AOOS delegates later |
| `notion` | knowledge-base | bearer | **live-capable** | `search` pages/databases, `action` append — needs the operator's integration token |

*Dormant* means the code path is complete — exchange, refresh, actions — and
tested against a mock token endpoint, but unexercisable against Google until a
real OAuth client is pasted once. Dormancy is visible in the registry as the
connection's `disconnected` state with setup copy, never as missing code.

Explicitly out: chat-ops bots (no evidence; `http` covers the mechanics),
IMAP (gmail covers), inbound webhooks/triggers (no scheduler — the kind stays
reserved), WOS sources as actions (polling stays in the collectors), shell
execution (CES territory), LLM APIs (harness-owned).

## API Surface

| Endpoint | Description |
| --- | --- |
| `GET /api/connectors` | registry: connectors, action schemas, kinds, availability |
| `POST /api/connections` | create a connection (credentials accepted once here) |
| `GET /api/connections` | list connections, credentials masked, health + usage |
| `GET /api/connections/<id>` | connection detail + 5 most recent executions |
| `DELETE /api/connections/<id>` | remove connection + stored credentials |
| `POST /api/connections/<id>/test` | health check (can trip `error`) |
| `POST /api/connections/<id>/disconnect` | revoke + void credentials, keep settings + history |
| `GET /api/connections/<id>/auth/start` | 302 to the provider consent screen (oauth2) |
| `GET /api/connections/<id>/auth/callback` | code exchange, token store (oauth2) |
| `POST /api/execute` | run `{connection_id, action, params}` — logs an execution; non-`connected` → 409 + reconnect hint |
| `GET /api/executions` | execution log |
| `GET /api/executions/<id>` | execution detail |
| `DELETE /api/executions` | clear the log |

## Storage

A single CouchDB database `gcal` through the shared `support.storage.Store`,
seed-on-empty per house convention. Connection documents carry credentials in
heterogeneous vault shapes (tokens+expiry+scopes, key strings, user/pass,
host/port/TLS flags — whatever `credentials_schema()` declares) and are
masked by shape at the API edge; exports never contain secrets. Execution
documents are append-only evidence. Test suites use the isolated
`gcal_test_` prefix and never touch dev data.

## The Playground

One plate, three zones, in the design language of the rest of the system
(`design.md` tokens):

- **Left** — connector cards (name, auth badge, action count) above the
  connection manager: create per connector, masked credential fields, test
  and connect buttons, status chips.
- **Right** — the runner: connection select → action select grouped by kind →
  the schema-generated parameter form (required first, `confirm` as checkbox) →
  Run → status chip + JSON response pane.
- **Bottom** — the execution log: one row per run with an `ok | error` badge,
  click through to full detail.

## Implementation Status

**Wave 1 live** at `/ate/tool/gcal/`: `base.py` (handler contract, auth
handlers, gateway, masking, health), the six live connectors (http, rss,
github, couchdb, files, smtp), connections with the full lifecycle
(connect/test/disconnect/reconnect), the execution gateway with 409
reconnect hints, the WOS-style shell (connectors, connection manager,
runner, execution log), audit, settings, and golden tests per connector
(hermetic transports: local echo server, fixture feed XML, mock
GitHub/CouchDB/SMTP endpoints, tmp fixtures).

**Wave 2** (dormant): the oauth2 broker + gmail, drive, calendar —
flow-complete against a mock token endpoint, waking when a Google client is
pasted; AOOS keeps its bespoke calendar sync until it delegates.

**Wave 3**: the notion connector (operator token), the full shell polish,
and golden texts per remaining connector.

## References

- Zapier's per-app operation model — triggers / write / search /
  find-or-create — the taxonomy adopted above:
  <https://zapier.com/apps/google-drive/integrations>
- n8n — the workflow orchestrator GCAL deliberately is not:
  <https://docs.n8n.io>
- The sibling execution tool this layer complements: [CES](../ces/)
