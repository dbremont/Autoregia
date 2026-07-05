"""Redis-backed RQ queue for PAIS asynchronous processing.

The ingestion endpoint writes raw interaction batches to CouchDB (db
``pais_raw``) and enqueues :func:`pais.jobs.process_pending` on the ``pais``
queue. A worker process (``python3 pais/worker.py``) consumes the queue and
derives schema-conforming ``MouseEvent`` / ``FocusEvent`` documents into db
``pais``.

Connection is configured purely via environment variables::

    REDIS_URL   default redis://localhost:6379/0
"""
import os

import redis
from rq import Queue

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
_QUEUE_NAME = "pais"

_redis = None
_queue = None


def get_redis():
    global _redis
    if _redis is None:
        _redis = redis.Redis.from_url(REDIS_URL)
    return _redis


def get_queue():
    global _queue
    if _queue is None:
        _queue = Queue(_QUEUE_NAME, connection=get_redis())
    return _queue


def enqueue(func, *args, **kwargs):
    """Best-effort enqueue (see pkts.tasks.enqueue for the resilience rationale)."""
    try:
        return get_queue().enqueue(func, *args, **kwargs)
    except Exception as exc:
        print(f"[rq] enqueue failed ({exc}); batch will be picked up on next ingest")
        return None
