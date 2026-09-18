# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

Autoregia — a **Personal Viable System Model (PVSM)**: one Flask server that
mounts ~11 self-management sub-systems under URL prefixes on a single port.
See `README.md` for the system map and `log.md` for the decision log.

## Layout

```
app/                 the application
├── app.py           unified server (SUBSYSTEMS registry, WSGI prefix
│                    dispatcher, plate-only routes)
├── index.html       landing plate     (about.html and docs.html beside it)
├── module/          the sub-systems — 11 mounted in SUBSYSTEMS:
│                    pbs, pkts, pwts, wos, gis, aias, aoos, ate, pras,
│                    acsms, loop
│   └── <sys>/       server.py (Flask app) + static/ + data/ + tests
│       ags/ gwob/ pks/        plate-only (index.html; ags adds policies/):
│                             served by root routes in app.py, NOT SUBSYSTEMS
│       asrs/ pais/ peos/ …    husks — __pycache__ only, deleted modules
│       ate/         Agent Toolbox Ecosystem: hosts tools under tool/<id>/
│         └── ces/  a tool (own Flask app, mounted at /ate/tool/ces/)
│         └── ctes/  a tool — WOS-style app shell: handle register + task specs + runs + audit (spec/ctes/)
│         └── gial/  a tool — design plate only, unimplemented (spec/gial/)
│         └── sarl/  a tool — design plate only, unimplemented (spec/sarl/)
└── support/         shared code: storage/ (CouchDB Store), shared/
                     (focus_watcher), tools/ (prefix_assets.py), bin/,
                     ui/ (the shared design-system layer served at /ui/)
spec/                conceptual specs (spec/ui.spec = normative design spec;
                     spec/dependability.md = dependability guarantees — fault
                     tolerance & continuity; spec/todo/ = personal notes, not
                     system docs)
app/module/wos/config/seed.json   WOS poll specs (the watched sources;
                     spec/wos/policy.md); read directly from file by the
                     server, not stored in CouchDB
design.md            style standard (tokens, typography, conformance)
log.md               decision & design log (entries under `## Index`)
todo.md              project TODO
env/                 git-ignored Python 3.12 venv — the only place the deps
                     live (see Commands)
img/  requirements.txt  Dockerfile  Makefile  .env (git-ignored)
```

Root plates (`index/about/docs.html`) are served from `app/`; `/img/…` is
served from the repository root.

## Commands

```sh
# dependencies live ONLY in the git-ignored venv at env/ (Python 3.12);
# system python3 has none of them:
source env/bin/activate       # or prefix with env/bin/ (env/bin/python -m pytest)

# run locally, no docker (8080 is often taken; the deployed container uses 8081)
make run               # also: make run DEV_PORT=8091

# deploy — two paths, one container (`autoregia`; requires CouchDB up):
make deploy-local      # build the local image (autoregia:local) and run it — dev/testing
make deploy-server     # pull the GHCR image CI publishes and run it — production
# also: make build | logs | stop

# tests (WOS + GIS + ACSMS tests need CouchDB running on 127.0.0.1:5984)
make test              # = python3 -m pytest app/module/ate/tool/ces/test_ces.py \
                       #    app/module/wos/test_wos.py app/module/gis/test_gis.py \
                       #    app/module/acsms/test_acsms.py

# after changing any URL prefix in app/app.py SUBSYSTEMS — MANDATORY:
make prefix-assets
```

**Agents may only deploy with `make deploy-local`.** `make deploy-server`
pulls the production image and is reserved for the human operator.

No linter is configured.

## Runtime & processes

`app/app.py` is the only process that the Makefile or Dockerfile start;
everything else runs out-of-band:

- **WOS collector** — a separate daemon, `python3 app/module/wos/collector.py`
  (second terminal; never started by `app.py`, the Makefile, or the
  container). Every `WOS_SWEEP_S` (default 60s) it asks the server which
  poll specs are due and POSTs `/api/poll`. Intervals come from
  `config/seed.json`: `interval_s: 0` falls through to the per-source-type
  default hard-coded in `wos/sources/*.py`.
- **PKTS/PWTS collectors** — desktop-host only (evdev/pynput/Xlib; the
  Dockerfile deliberately excludes those deps from the image). They POST
  batches to `/pkts/api/ingest` and `/pwts/api/ingest`. Gotcha:
  `pkts/collector.py` still defaults `PKTS_INGEST_URL` to the standalone-port
  era `http://localhost:5001/...` — set the env var explicitly.
- **PKTS/PWTS RQ workers** — `python3 app/module/<sys>/worker.py` drain Redis
  queues (`REDIS_URL`, default `redis://localhost:6379/0`; queues `pkts`,
  `pwts`). **Redis is optional**: ingest persists the raw batch to CouchDB
  first, enqueue failures are caught, and a worker drains all unprocessed
  batches on its next run.
- **CES result feed** — fire-and-forget POSTs to `CES_AOOS_URL` /
  `CES_PBS_URL` (defaults are stale standalone ports, :5005/:5000).
- **AOOS Google Calendar sync** — optional; needs an OAuth client secret at
  `app/module/aoos/config/client_secret.json` (or `AOOS_GC_CLIENT_SECRET`),
  writes `config/token.json` on connect; status machine
  mock → authorized_pending → connected.
- **Plate-only routes** — `/ags/` (+ `/ags/policies/…`), `/gwob/`, `/pks/`
  are static plates served by root routes in `app/app.py`, not `SUBSYSTEMS`
  mounts. A real mount with the same prefix shadows the plate route.

## Data & storage

- `support/storage` `Store` is the CouchDB wrapper. Its config
  (`COUCHDB_URL`, `COUCHDB_USER`, `COUCHDB_PASSWORD`, `COUCHDB_DB_PREFIX`)
  is read at **import time** — that is why `app.py` loads `.env` before
  importing any sub-system, and why tests must set env vars *before*
  importing a server module. `COUCHDB_DB_PREFIX` is prepended to every DB
  name (test suites use `wos_test_`, `gis_test_`).
- Seeds (`data/*.json`) apply **only when the DB is empty**; `put` upserts by
  the doc's application-level `id` field.
- DB map (names all subject to `COUCHDB_DB_PREFIX`):

  | module | DBs |
  |---|---|
  | pbs | `pbs` |
  | gis | `ptocs` + `ptocs_activity` |
  | aias | `aias` |
  | aoos | `aoos` (falls back to `data/*.json` files when CouchDB is down) |
  | wos | `wos` |
  | pkts | `pkts_raw` + `pkts` |
  | pwts | `pwts_raw` + `pwts` |
  | acsms | `acsms` |

- Local-file only (no CouchDB): `loop` (read-only `data/mock_loop.json`),
  `ces` (in-memory sessions + read-only mock environments), `pras`
  (`deliberations/*.html` files *are* the data).

## Invariants (do not break silently)

- **URL prefixes are baked into static assets.** Renaming a prefix in
  `app/app.py` (`SUBSYSTEMS`) requires re-running `app/support/tools/prefix_assets.py`,
  or the sub-system's assets will request the old paths.
- **prefix_assets mechanics:** idempotent; it rewrites `"/<seg>/…"` (seg ∈
  `css, js, fonts, api, data, static, policies`) and `href="/"` → the tool's
  prefix in `.html/.js/.css` under its `TOOLS` dirs. The `href="/"` rewrite
  is why `/index.html` exists as a root alias — link the landing page as
  `/index.html`, never bare `/`, inside tool assets. Tools that use relative
  URLs (`wos`, `ces`) don't need a `TOOLS` entry; the `ags` entry points at
  a nonexistent directory and silently no-ops.
- **URL prefixes are independent of repo layout.** Moving files must not
  change any `/<prefix>/` URL.
- **Sub-system servers** expose a Flask `app` and are loaded by `app/app.py`
  via `importlib` (registered in `sys.modules` so Flask resolves each tool's
  `static_folder`). New sub-systems: add `app/module/<sys>/` + one line in
  `SUBSYSTEMS`. ATE-hosted tools (under `app/module/ate/tool/<id>/`) instead
  get one entry in `TOOLS` in `app/module/ate/server.py`, which mounts them
  at `/ate/tool/<id>/`.
- **`sys.path` inserts are `__file__`-relative.** Module code inserts the app
  root (for `from support.storage import Store`) and sometimes `module/` (for
  intra-module imports) by walking up a fixed number of `dirname`s. If you
  move files, those depths move in lockstep — count them, don't guess.
- **`support/shared/focus_watcher.py`** is the single source of truth for the
  focused window, shared by PWTS and PKTS collectors. Never fork it.
- **Tests are listed explicitly in `make test`** — there is no pytest config
  and no auto-discovery, so a new suite does not run until added to the
  Makefile. WOS/GIS suites module-level-skip when CouchDB is unreachable;
  CES needs nothing (in-memory).
- **Design standard:** `design.md` governs every plate and sub-system UI.
  Canonical tokens: paper `#FAFAF6`, oxford `#7A1A2A`, gold
  `#A8854A`, Spectral/Inter/IBM Plex Mono. Fonts are **self-hosted**
  (`/ui/fonts/`) — never add CDN links. Normative spec: `spec/ui.spec`;
  reference implementation: `app/module/pbs/static/`.
- **Shared design-system layer:** tokens, fonts, base (and the standalone
  alias layer) live ONLY in `app/support/ui/`, served by the `/ui/` route
  in `app/app.py`. Never re-declare tokens/fonts per surface — link
  `/ui/css/{tokens,fonts,base,standalone}.css` (with `?v=YYYYMMDD`
  cache-busters; bump `v` when editing the layer). Shared JS behaviors too:
  `confirmDialog`/`toast` in `/ui/js/ui.js`, the icon registry in
  `/ui/js/icons.js` (tools keep thin aliases). `ui` must never be
  added to `prefix_assets.py` SEGMENTS — `/ui/` is global, not per-tool.
  Per-tool css keeps only `layout/components/views/command-palette`
  (+ additive files). Font families come from the layer too (`--font-*`,
  aliased as `--serif/--sans/--mono` on plates) — as do font sizes:
  always a `--text-*` step (incl. `--text-2sm` 12px); raw px only inside
  fluid `clamp()` (`spec/ui.spec` §4.2). Shell css spacing uses `--space-*`
  only (`spec/ui.spec` §5.1).
- **CES DOM contract:** `app/module/ate/tool/ces/static/js/exec.js` addresses the
  page by fixed IDs (`env-grid`, `env-select`, `work-type`, `payload`,
  `run-btn`, `run-status`, `session-list`), classes (`env-card`, `session`,
  `badge badge-<status>`) and the CSS vars `--text-dim`, `--red`. Restyling
  CES must keep all of these defined.

## Infrastructure

- Container `autoregia` (`ghcr.io/dbremont/autoregia:latest`, `--network
  host`, port from `AUTOREGIA_PORT` in `.env` — 8081 on this host).
- Container `couchdb` (couchdb:3) on `127.0.0.1:5984`, volume `couchdb_data`.
  Credentials in `.env` (git-ignored; see `.env.example`).
- **CouchDB seeding:** each sub-system's `Store` seeds its DB from local
  `data/*.json` fixtures **only when the DB is empty** — regenerating a
  seed file does not refresh a running DB. To pick up a regenerated seed,
  drop the DB and restart the server:
  `curl -X DELETE http://admin:<password>@127.0.0.1:5984/<db>` (check the
  DB for non-seed entries first).
- **Secrets on disk:** `.gitignore` does **not** cover
  `app/module/aoos/config/` — Google OAuth `client_secret.json` /
  `token.json` live there and must never be staged or committed.
- Push to `main` → GitHub Actions builds and pushes the image to GHCR
  (`<sha>` + `latest`). **CI runs no tests** — testing is local only
  (`make test`).
- Deploy with `make deploy-server` (pull the GHCR image — production) or
  `make deploy-local` (build `autoregia:local` from the repo — dev/testing).
  Both recreate container `autoregia` (`--network host`, `.env` mounted
  read-only at `/srv/.env`, port from `AUTOREGIA_PORT` in `.env`).
  Coding agents may only run `make deploy-local` — never `make deploy-server`.
- The Dockerfile concatenates every `requirements.txt` in the repo, minus
  `evdev`/`pynput`/`python-xlib` (desktop-collector-only) — a new module's
  `requirements.txt` is picked up automatically.

## Decision log

Significant architectural decisions are recorded in `log.md`: append a
`### <year> — <title>` entry under `## Index` with bold-labeled fields —
**Question.** / **Decision.** (numbered) / **Rationale.** /
**Trade-offs accepted.** / **Implements.** (relative links). Keep the
existing entry untouched; don't restructure the file.

## Git conventions

Git hooks are global (`core.hooksPath = ~/configs/global/git/hooks`), not
in-repo. Commits are SSH-signed via 1Password (`op-ssh-sign`).

### Hook anatomy

- `pre-commit` runs the scripts in `pre-commit.d/` in lexical order:
  `00-authorization-policy.sh` → `01-annotation-policy.sh` →
  `02-encoding-policy.sh`. Any failure rejects the commit.
- Configuration lives beside the hooks: `annotations.conf` classifies the
  annotation tokens and lists the inspected file patterns (`FILES`).
- `prepare-commit-msg` rewrites the message to
  `type(<branch-or-Jira>): message` — `git commit -m` is NOT exempt, and
  neither is `--amend -m` (with `-m` the hook sees `COMMIT_SOURCE=message`
  and overwrites). To set a real message: commit, then bypass the hook for
  the amend:
  `git -c core.hooksPath=/dev/null commit --amend -m "<type>(<scope>): <desc>"`.
  (History shows `type(main): message` commits from `-m`-only flows.)
- `post-commit` clears `user.checkin` marks from committed files.

### Pre-commit policies

1. *Authorization* — every staged **added/copied/modified** file needs xattr
   `user.checkin=1`; mark first: `mark-for-commit <file> …`, then
   `git commit`. Deletions and rename source paths need **no** marks —
   `mark-for-commit` prints `✗ Not found` for them and that is harmless.
   The one-liner for a staged set:
   `git diff --cached --name-only | xargs mark-for-commit`.
2. *Annotations* — staged sources containing `@WORKING @FIXME @QUESTION
   @VERIFY` reject the commit (`@TODO @HACK @WORKAROUND` warn;
   `@TECH-DEBT @REFACTOR @OPTIMIZE @RATIONALE @NOTE` are informational).
   Applies only to the source patterns in `annotations.conf` (`.py`, `.js`,
   `.html`, `.css`, `.yaml`, …) — **`.md` files are not inspected**, so docs
   may mention the tokens verbatim. Fix or reword blockers before staging.
3. *Encoding* — default policy: staged text files must be UTF-8, no BOM, LF
   line endings (`dos2unix <file>` fixes CRLF). A machine-local override,
   `~/configs/global/git/hooks/.local` (`ENCODING=<value>`, git-ignored,
   never commit it), replaces the default **for every repo on that machine**.
   Gotcha: if valid UTF-8 files are rejected with *"Invalid encoding
   (expected ISO-8859-1 …)"*, the `.local` override on this machine is not
   UTF-8 — set `ENCODING=UTF-8` in that file (manually) before committing.

### Commit workflow (step by step)

1. *Inspect* — `git status`, `git diff`, `git log --oneline -5`; stage only
   intended files (`git add <paths>`), never blanket `git add .`.
2. *Authorize* — `git diff --cached --name-only | xargs mark-for-commit`
   (unmarked added/modified files reject the commit; deletions are exempt).
3. *Pre-flight* — annotation blockers and encoding: fix or reword before
   staging; UTF-8, no BOM, LF.
4. *Commit* — `git commit -m "wip"` is acceptable at this step because the
   hook rewrites the message anyway.
5. *Set the real message* — `git -c core.hooksPath=/dev/null commit
   --amend -m "<type>(<scope>): <desc>"` (bypass the hook: a plain
   `--amend -m` is rewritten too). Verify with `git log --oneline -1`
   that the message survived; never leave a hook-rewritten
   `type(main): wip` behind.
6. *Cleanup* — post-commit clears the xattr marks automatically; re-verify
   the diff after any structural moves.

- **Commit message:** `<type>(<optional scope>): <description>`; type is one of
  `feat | fix | docs | style | refactor | test | chore` (see `guideline.md`).
- Keep commits scoped; re-verify after structural moves (see checklist).

## Post-change checklist

1. `make run` → all mounts return 200,
   `/api/` lists the expected sub-systems, `0` tracebacks in the log.
2. `make test` → currently **102 passed, 1 failed**
   (`test_wos.py::test_clusters_lexical_backend_groups_related` —
   pre-existing lexical-backend clustering failure).
3. `make deploy-local` → curl the mount matrix on the container port; check
   `docker logs autoregia` for tracebacks.
4. Update `README.md` tree/links if the layout changed.
