"""GCAL connector registry — package discovery.

Adding a connector is adding one module to this package that exposes
``Handler`` (a :class:`base.Connector` subclass) plus the module-level
``ID``. No central list to edit.
"""
from . import couchdb
from . import files
from . import github
from . import http
from . import rss
from . import smtp

_MODULES = [http, rss, github, couchdb, files, smtp]


def _handlers():
    out = {}
    for module in _MODULES:
        handler_cls = getattr(module, "Handler", None)
        if handler_cls is None:
            continue
        handler = handler_cls()
        if not getattr(module, "ID", None) or handler.ID != module.ID:
            continue
        out[handler.ID] = handler
    return out


HANDLERS = _handlers()


def get(connector_id):
    return HANDLERS.get(connector_id)


def registry():
    """The connector registry as served by GET /api/connectors."""
    return [{
        "id": h.ID,
        "name": h.NAME,
        "summary": h.SUMMARY,
        "type": h.TYPE,
        "auth_scheme": h.AUTH_SCHEME,
        "status": h.STATUS,
        "setup_schema": h.SETUP_SCHEMA,
        "credentials_schema": [
            dict(f, value=None) for f in h.CREDENTIALS_SCHEMA
        ],
        "actions": h.actions(),
    } for h in HANDLERS.values()]
