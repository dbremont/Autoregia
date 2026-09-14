"""CouchDB-backed document store shared by PRS, PTOCS, and AOOS.

Each sub-system owns one CouchDB database (``prs``, ``ptocs``, ``aoos``) and
maps its existing record ``id`` field onto the CouchDB ``_id``. CouchDB's own
``_id``/``_rev`` bookkeeping is kept internal so the public API surface (and
therefore the web clients) is unchanged.

Connection is configured purely via environment variables so every prototype
server can run with the same defaults::

    COUCHDB_URL       default http://localhost:5984
    COUCHDB_USER      default admin
    COUCHDB_PASSWORD  default admin
    COUCHDB_DB_PREFIX default ""  (prepended to every db name, e.g. "dev_")

On first use against an *empty* database, the store seeds it from the local
JSON mock files (the existing prototype fixtures), preserving the "works
offline with sample data" behaviour while moving persistence into CouchDB.
"""
import json
import os

import couchdb


class StoreError(RuntimeError):
    """Raised when CouchDB cannot be reached or configured."""


def _env(name, default):
    return os.environ.get(name, default)


URL = _env("COUCHDB_URL", "http://localhost:5984")
USER = _env("COUCHDB_USER", "admin")
PASSWORD = _env("COUCHDB_PASSWORD", "admin")
DB_PREFIX = _env("COUCHDB_DB_PREFIX", "")


def get_server():
    """Return an authenticated CouchDB :class:`Server`, or raise."""
    srv = couchdb.Server(URL)
    srv.resource.credentials = (USER, PASSWORD)
    return srv


def _open_or_create(server, db_name):
    full = DB_PREFIX + db_name
    if full not in server:
        server.create(full)
    return server[full]


def _extract_items(raw):
    """Normalize the various fixture shapes into a flat list of dicts."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for key in ("items", "records", "entries", "actions", "blocks"):
            if isinstance(raw.get(key), list):
                return raw[key]
        # A single dict record.
        return [raw]
    return []


class Store:
    """A thin document store over one CouchDB database.

    Each document is expected to carry an ``id`` field (the application-level
    identifier); it is used as the CouchDB ``_id``. Internal ``_id``/``_rev``
    fields are stripped from every value returned to callers.
    """

    def __init__(self, db_name, seed_paths=None):
        self.db_name = DB_PREFIX + db_name
        try:
            server = get_server()
            self.db = _open_or_create(server, db_name)
        except Exception as exc:  # pragma: no cover - network/config errors
            raise StoreError(
                f"Cannot connect to CouchDB at {URL} as '{USER}': {exc}. "
                "Set COUCHDB_URL/COUCHDB_USER/COUCHDB_PASSWORD or start a "
                "local instance (e.g. docker run -p 5984:5984 couchdb)."
            ) from exc
        self._maybe_seed(seed_paths)

    # ── seeding ──────────────────────────────────────────────────────────────
    def _maybe_seed(self, seed_paths):
        """Seed an empty DB from local JSON fixtures (idempotent)."""
        if not seed_paths:
            return
        if self.count() > 0:
            return
        seeded = 0
        for path in seed_paths:
            if not path or not os.path.exists(path):
                continue
            with open(path, "r", encoding="utf-8") as fh:
                items = _extract_items(json.load(fh))
            for item in items:
                if isinstance(item, dict) and item.get("id"):
                    if item["id"] not in self.db:
                        self.db[item["id"]] = item
                        seeded += 1
        if seeded:
            print(f"[couchdb] seeded {self.db_name}: {seeded} docs from fixtures")

    # ── internals ────────────────────────────────────────────────────────────
    @staticmethod
    def _clean(doc):
        if not doc:
            return doc
        doc = dict(doc)
        doc.pop("_id", None)
        doc.pop("_rev", None)
        return doc

    # ── public API ───────────────────────────────────────────────────────────
    def all(self):
        """Return every application document (design docs excluded)."""
        return [self._clean(self.db[doc_id]) for doc_id in self.db
                if not doc_id.startswith("_")]

    def get(self, doc_id):
        doc = self.db.get(doc_id)
        return self._clean(doc) if doc else None

    def exists(self, doc_id):
        return doc_id in self.db

    def put(self, doc):
        """Insert or update a document keyed by its ``id`` field.

        The caller's dict is never mutated: the couchdb client attaches
        ``_id``/``_rev`` to the object it receives, so we hand it a copy and
        return a cleaned view of the stored document.
        """
        if not doc.get("id"):
            raise ValueError("document is missing required 'id' field")
        doc_id = doc["id"]
        existing = self.db.get(doc_id)
        stored = dict(doc)
        if existing:
            stored["_rev"] = existing["_rev"]
        self.db[doc_id] = stored
        return self._clean(self.db[doc_id])

    def delete(self, doc_id):
        doc = self.db.get(doc_id)
        if doc:
            del self.db[doc_id]
        return doc is not None

    def count(self):
        return int(self.db.info().get("doc_count", 0))

    def bulk_put(self, docs):
        """Insert/replace many docs; returns the number written."""
        n = 0
        for doc in docs:
            if isinstance(doc, dict) and doc.get("id"):
                self.put(doc)
                n += 1
        return n

    # ── query layer (views + Mango — queries execute inside CouchDB) ────────
    def ensure_view(self, ddoc, name, map_fun, reduce_fun=None):
        """Idempotently define ``ddoc/name``; True if the ddoc was written.

        ``ddoc`` is the design-document name (stored as ``_design/<ddoc>``).
        The view is (re)written only when its definition changed, so startup
        calls are cheap and do not rebuild indexes needlessly.
        """
        doc_id = f"_design/{ddoc}"
        current = self.db.get(doc_id) or {}
        views = dict(current.get("views") or {})
        target = {"map": map_fun}
        if reduce_fun:
            target["reduce"] = reduce_fun
        if views.get(name) == target:
            return False
        views[name] = target
        doc = dict(current)
        doc["language"] = "javascript"
        doc["views"] = views
        if current.get("_rev"):
            doc["_rev"] = current["_rev"]
        self.db[doc_id] = doc
        return True

    @staticmethod
    def _resource_data(res):
        """couchdb-python resource calls return (status, headers, body)."""
        body = res[2] if isinstance(res, tuple) else res
        if hasattr(body, "read"):                        # http.ResponseBody
            import json as _json
            body = _json.loads(body.read())
        return body

    def ensure_indexes(self, indexes):
        """Idempotently create Mango indexes (``[{"name":…, "fields":[…]}]``)."""
        try:
            existing = {i.get("name"): i.get("def", {}).get("fields")
                        for i in (self._resource_data(
                            self.db.resource.get("_index")) or [])}
        except Exception:
            existing = {}
        for idx in indexes:
            name, fields = idx["name"], idx["fields"]
            if existing.get(name) == fields:
                continue
            body = {"index": {"fields": fields}, "name": name,
                    "type": "json", "ddoc": f"idx-{name}"}
            self.db.resource.post("_index", body=body)

    def query_view(self, ddoc, name, *, startkey=None, endkey=None, keys=None,
                   descending=False, limit=None, include_docs=False):
        """Query ``ddoc/name``; returns rows as dicts (id/key/value/doc).

        ``doc`` is populated only with ``include_docs=True``. All options map
        1:1 onto CouchDB view query parameters.
        """
        opts = {}
        if startkey is not None:
            opts["startkey"] = startkey
        if endkey is not None:
            opts["endkey"] = endkey
        if keys is not None:
            opts["keys"] = keys
        if descending:
            opts["descending"] = True
        if limit is not None:
            opts["limit"] = limit
        if include_docs:
            opts["include_docs"] = True
        rows = self.db.view(f"{ddoc}/{name}", **opts)
        return [{"id": r.id, "key": r.key, "value": r.value,
                 "doc": self._clean(r.doc) if include_docs and r.doc else None}
                for r in rows]

    def find(self, selector, *, fields=None, sort=None, limit=None, skip=0):
        """Mango ``_find``: query documents by selector, inside the DB."""
        query = {"selector": selector}
        if fields:
            query["fields"] = fields
        if sort:
            query["sort"] = sort
        if limit is not None:
            query["limit"] = limit
        if skip:
            query["skip"] = skip
        return [self._clean(d) for d in self.db.find(query)]
