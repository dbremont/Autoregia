# Personal Policy System (PPS)

> PPS is the **Personal Policy System** — the Autoregia **Policy System**
> (VSM System 5 – Policy). It is a set of **policy documents** that define
> long-term direction, identity, principles, values, commitments, and
> constraints, with a **main entry** that points to them and **search** over the
> corpus.

> The policy documents *are* the data. There is no database, no schema, and no
> separate record store: each policy is an HTML page under [`policies/`](policies).
> The server indexes those pages at startup to provide search and a listing.

## Parts

- **Policy documents** (`policies/*.html`) — the actual policies. The
  [`charter.html`](policies/charter.html) is the **apex / main entry**: it states
  identity and purpose and links to every other policy.
- **Main entry** ([`index.html`](index.html)) — the landing page: a search box
  and a document index that points to each policy, with the Charter pinned at the
  top.
- **Search** — a Flask server indexes the HTML files and exposes a scored search
  endpoint (`title`, `tags`, `summary`, `body`).

## Adding a policy

Drop a new HTML file into [`policies/`](policies). Give it `pp-*` meta tags so the
search index is rich (all optional — the server falls back to `<title>` and the
first paragraph):

```html
<meta name="pp-title" content="Sleep Policy">
<meta name="pp-summary" content="One-line description used in listings & search.">
<meta name="pp-domain" content="Health">
<meta name="pp-tags" content="sleep, recovery, energy">
```

The document is then automatically listed on the index page and searchable. No
restart of the listing is needed, but the search index is built at startup —
restart the server (or rely on `debug` reload) to pick up brand-new files.

## Structure

```
pps/
├── README.md              # this document
├── server.py              # Flask: serves pages + /api/policies + /api/search
├── requirements.txt       # flask, flask-cors
├── index.html             # main entry: search + document index (points to policies)
├── policies/              # the policy documents (HTML)
│   ├── charter.html       # apex / main entry — points to the rest
│   ├── principles.html
│   ├── values.html
│   ├── commitments.html
│   ├── health.html
│   ├── learning.html
│   └── conduct.html
└── static/
    ├── css/policy.css     # warm-parchment styling (Autoregia aesthetic)
    └── js/search.js       # index rendering + live search client
```

## Run

```bash
pip install -r pps/requirements.txt
python3 pps/server.py
# open http://localhost:5004
```

The server listens on **port 5004** (PRS → 5000, PKTS → 5001/5002, PTOCS → 5003).
Override with the `PPS_PORT` environment variable.

### API

| Endpoint | Description |
| --- | --- |
| `GET /` | The main entry (index). |
| `GET /policies/<file>` | A policy document. |
| `GET /api/policies` | Light listing for the index: `[{path,title,summary,domain,tags,is_charter}]`. |
| `GET /api/search?q=` | Scored search; returns `{query,count,results:[{path,title,domain,tags,snippet,score}]}`. |

Search weights: title +10, tags +7, summary +6, domain +3, body +3.

## Relation to Autoregia

- **Parent:** [Autoregia](../README.md) — a Personal Viable System Model (PVSM).
- **Role:** **Policy System** (VSM System 5 – Policy) — defines long-term
  direction, identity, principles, and constraints.
- **Sibling sub-projects:** [PRS](../prs/), [PKTS](../pkts/), [PTOCS](../ptocs/).
- **Decision log:** [`../logos.log.md`](../logos.log.md).

## References

- [Personal Viable System Model (PVSM)](https://app.notion.com/p/Personal-Viable-System-Model-PVSM-2bcc0f5171ec80878d83d041ea5723f6?source=copy_link)
- [Self-Management](https://app.notion.com/p/Self-Management-2a6c0f5171ec80e5bd2dfa83993a3c84?source=copy_link)
