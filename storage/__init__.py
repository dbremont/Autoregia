"""Shared storage layer for Autoregia sub-systems.

Currently backed by CouchDB. Sub-systems import :class:`Store` to read/write
their records without leaking CouchDB internals (_id/_rev) into API responses.
"""

from .couchdb_store import Store, StoreError, get_server

__all__ = ["Store", "StoreError", "get_server"]
