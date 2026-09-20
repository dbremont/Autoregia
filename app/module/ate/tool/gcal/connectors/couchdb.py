"""couchdb connector — the system's own substrate (document-store type).

Mango find, document get/put, and a guarded delete against any CouchDB —
localhost by default. Credentials are basic auth; the database to touch is a
connection setting.
"""
import json
import urllib.parse

import base

ID = "couchdb"
NAME = "CouchDB"
SUMMARY = "Find, get, put, delete — uniform ops over document stores."
TYPE = "document-store"
AUTH_SCHEME = "basic"
STATUS = "live"

SETUP_SCHEMA = [
    {"name": "base_url", "type": "text", "required": False,
     "default": "http://localhost:5984",
     "description": "CouchDB server URL"},
    {"name": "database", "type": "text", "required": True, "default": "",
     "description": "the database to operate on"},
    {"name": "timeout_s", "type": "number", "required": False, "default": 20,
     "description": "per-request timeout in seconds"},
]
CREDENTIALS_SCHEMA = [
    {"name": "username", "type": "text", "required": False, "default": "",
     "description": "admin or database user (empty = no auth)"},
    {"name": "password", "type": "password", "required": False, "default": "",
     "description": "the user's password"},
]

ACTIONS = [
    {"id": "search", "kind": "search", "summary": "Mango find",
     "params": [
         {"name": "selector", "type": "text", "required": True, "default": "",
          "description": "Mango selector as a JSON object"},
         {"name": "limit", "type": "number", "required": False, "default": 25,
          "description": "max docs (1-200)"},
         {"name": "fields", "type": "text", "required": False, "default": "",
          "description": "projected fields as a JSON array"},
     ]},
    {"id": "get", "kind": "search", "summary": "fetch one document",
     "params": [
         {"name": "doc_id", "type": "text", "required": True, "default": "",
          "description": "document id"},
     ]},
    {"id": "put", "kind": "action", "summary": "upsert one document",
     "params": [
         {"name": "doc", "type": "text", "required": True, "default": "",
          "description": 'document as JSON (`id` maps to `_id` when `_id` is absent)'},
     ]},
    {"id": "delete", "kind": "action", "summary": "delete one document",
     "confirm": True,
     "params": [
         {"name": "doc_id", "type": "text", "required": True, "default": "",
          "description": "document id"},
         {"name": "rev", "type": "text", "required": True, "default": "",
          "description": "current revision (CouchDB deletes by rev)"},
         {"name": "confirm", "type": "boolean", "required": True,
          "default": False, "description": "deletion is permanent — confirm"},
     ]},
]


class Handler(base.Connector):
    ID = ID
    NAME = NAME
    SUMMARY = SUMMARY
    TYPE = TYPE
    AUTH_SCHEME = AUTH_SCHEME
    STATUS = STATUS
    SETUP_SCHEMA = SETUP_SCHEMA
    CREDENTIALS_SCHEMA = CREDENTIALS_SCHEMA

    def actions(self):
        return ACTIONS

    def _call(self, connection, method, path, body=None, query=None,
              transport=None):
        settings = connection.get("settings") or {}
        database = (settings.get("database") or "").strip()
        if not database:
            raise base.AdapterError("database is required",
                                    kind=base.BAD_PARAMS)
        base_url = (settings.get("base_url") or "http://localhost:5984").rstrip("/")
        url = f"{base_url}/{urllib.parse.quote(database, safe='')}{path or ''}"
        if query:
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(query)
        headers = {"Accept": "application/json"}
        creds = connection.get("credentials") or {}
        if creds.get("username"):
            import base64
            raw = f"{creds['username']}:{creds.get('password') or ''}"
            headers["Authorization"] = "Basic " + base64.b64encode(raw.encode()).decode()
        if body is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(body)
        out = base.http_request(
            method, url, headers=headers, body=body,
            timeout_s=int(settings.get("timeout_s") or 20),
            transport=transport)
        if not out["ok"]:
            raise base.AdapterError(f"{method} {path or '/'} → {out['status']}",
                                    kind=self.classify(out), status=out["status"])
        try:
            return json.loads(out["body"]) if out["body"] else {}
        except ValueError:
            return {"raw": out["body"]}

    def _limit(self, params):
        try:
            return max(1, min(int((params or {}).get("limit") or 25), 200))
        except (TypeError, ValueError):
            raise base.AdapterError("limit must be an integer",
                                    kind=base.BAD_PARAMS)

    def test(self, connection, transport=None):
        data = self._call(connection, "GET", "", transport=transport)
        return {"db": data.get("db_name"), "docs": data.get("doc_count")}

    def execute(self, connection, action_id, params, transport=None):
        action = self.action(action_id)
        if not action:
            raise base.AdapterError(f"unknown action '{action_id}'",
                                    kind=base.BAD_PARAMS)
        clean, err = base.validate_fields(action["params"], params)
        if err:
            raise base.AdapterError(err, kind=base.BAD_PARAMS)
        if action_id == "search":
            try:
                selector = json.loads(clean["selector"])
            except ValueError:
                raise base.AdapterError("selector must be a JSON object",
                                        kind=base.BAD_PARAMS)
            if not isinstance(selector, dict):
                raise base.AdapterError("selector must be a JSON object",
                                        kind=base.BAD_PARAMS)
            body = {"selector": selector, "limit": self._limit(clean)}
            if clean.get("fields"):
                try:
                    fields = json.loads(clean["fields"])
                except ValueError:
                    raise base.AdapterError("fields must be a JSON array",
                                            kind=base.BAD_PARAMS)
                if isinstance(fields, list):
                    body["fields"] = fields
            data = self._call(connection, "POST", "/_find", body=body,
                              transport=transport)
            return {"docs": data.get("docs") or [],
                    "warning": data.get("warning")}
        if action_id == "get":
            return {"doc": self._call(
                connection, "GET",
                "/" + urllib.parse.quote(clean["doc_id"], safe=""),
                transport=transport)}
        if action_id == "put":
            try:
                doc = json.loads(clean["doc"])
            except ValueError:
                raise base.AdapterError("doc must be a JSON object",
                                        kind=base.BAD_PARAMS)
            if not isinstance(doc, dict):
                raise base.AdapterError("doc must be a JSON object",
                                        kind=base.BAD_PARAMS)
            if "_id" not in doc and "id" in doc:
                doc = dict(doc)
                doc["_id"] = doc.pop("id")
            if "_id" not in doc:
                raise base.AdapterError("doc needs an `id` (→ `_id`)",
                                        kind=base.BAD_PARAMS)
            data = self._call(
                connection, "PUT",
                "/" + urllib.parse.quote(str(doc["_id"]), safe=""),
                body=doc, transport=transport)
            return {"ok": data.get("ok"), "id": data.get("id"),
                    "rev": data.get("rev")}
        if action_id == "delete":
            if not clean.get("confirm"):
                raise base.AdapterError("confirm is required for deletion",
                                        kind=base.BAD_PARAMS)
            data = self._call(
                connection, "DELETE",
                "/" + urllib.parse.quote(clean["doc_id"], safe=""),
                query={"rev": clean["rev"]}, transport=transport)
            return {"ok": data.get("ok"), "id": data.get("id")}
        raise base.AdapterError(f"unknown action '{action_id}'",
                                kind=base.BAD_PARAMS)
