"""files connector — local substrate, read-only (local-files type).

List and read under one configured root. Paths are realpath-contained:
anything escaping the root is refused before touching the filesystem, and
the connector never writes. No credentials — the root is the trust
boundary, set once at connection time.
"""
import os

import base

ID = "files"
NAME = "Local Files"
SUMMARY = "List and read under one root, read-only, path-contained."
TYPE = "local-files"
AUTH_SCHEME = "none"
STATUS = "live"

SETUP_SCHEMA = [
    {"name": "root", "type": "text", "required": True, "default": "",
     "description": "the allowed root directory (absolute path)"},
    {"name": "max_bytes", "type": "number", "required": False,
     "default": 20000, "description": "max bytes returned per read"},
]
CREDENTIALS_SCHEMA = []

ACTIONS = [
    {"id": "list", "kind": "search", "summary": "list a directory",
     "params": [
         {"name": "path", "type": "text", "required": False, "default": "",
          "description": "relative to the root (default: the root itself)"},
     ]},
    {"id": "read", "kind": "search", "summary": "read a text file",
     "params": [
         {"name": "path", "type": "text", "required": True, "default": "",
          "description": "relative to the root"},
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

    def _root(self, connection):
        root = os.path.realpath((connection.get("settings") or {}).get("root") or "")
        if not root or not os.path.isdir(root):
            raise base.AdapterError("root is not a readable directory",
                                    kind=base.BAD_PARAMS)
        return root

    def _resolve(self, connection, rel):
        root = self._root(connection)
        target = os.path.realpath(os.path.join(root, (rel or "").lstrip("/")))
        if target != root and not target.startswith(root + os.sep):
            raise base.AdapterError("path escapes the root",
                                    kind=base.BAD_PARAMS)
        return target

    def _cap(self, connection):
        try:
            return max(256, int((connection.get("settings") or {}).get("max_bytes") or 20000))
        except (TypeError, ValueError):
            return 20000

    def test(self, connection, transport=None):
        root = self._root(connection)
        try:
            names = os.listdir(root)
        except OSError as exc:
            raise base.AdapterError(f"cannot list root: {exc}",
                                    kind=base.RETRYABLE)
        return {"root": root, "entries": len(names)}

    def execute(self, connection, action_id, params, transport=None):
        if action_id == "list":
            target = self._resolve(connection, (params or {}).get("path") or "")
            if not os.path.isdir(target):
                raise base.AdapterError("not a directory",
                                        kind=base.BAD_PARAMS)
            try:
                names = sorted(os.listdir(target))
            except OSError as exc:
                raise base.AdapterError(f"cannot list: {exc}",
                                        kind=base.RETRYABLE)
            out = []
            for name in names[:500]:
                full = os.path.join(target, name)
                try:
                    st = os.stat(full)
                    out.append({"name": name,
                                "type": "dir" if os.path.isdir(full) else "file",
                                "size": st.st_size})
                except OSError:
                    out.append({"name": name, "type": "?", "size": None})
            return {"path": os.path.relpath(target, self._root(connection)),
                    "entries": out}
        if action_id == "read":
            rel = ((params or {}).get("path") or "").strip()
            if not rel:
                raise base.AdapterError("path is required",
                                        kind=base.BAD_PARAMS)
            target = self._resolve(connection, rel)
            if not os.path.isfile(target):
                raise base.AdapterError("not a file", kind=base.BAD_PARAMS)
            cap = self._cap(connection)
            try:
                with open(target, "rb") as fh:
                    raw = fh.read(cap + 1)
            except OSError as exc:
                raise base.AdapterError(f"cannot read: {exc}",
                                        kind=base.RETRYABLE)
            try:
                text = raw[:cap].decode("utf-8")
            except UnicodeDecodeError:
                raise base.AdapterError("not a UTF-8 text file",
                                        kind=base.BAD_PARAMS)
            return {"path": rel, "size": os.path.getsize(target),
                    "truncated": len(raw) > cap, "content": text}
        raise base.AdapterError(f"unknown action '{action_id}'",
                                kind=base.BAD_PARAMS)
