"""Redis-backed RQ queue for PKTS asynchronous processing.

The ingestion endpoint writes raw keystroke batches to CouchDB (db
``pkts_raw``) and enqueues :func:`pkts.jobs.process_pending` on the ``pkts``
queue. A worker process (``python3 pkts/worker.py``) consumes the queue and
derives schema-conforming ``KeystrokeEvent`` documents into db ``pkts``.

Connection is configured purely via environment variables so the prototype
matches the rest of the stack::

    REDIS_URL   default redis://localhost:6379/0
"""
import os

import redis
from rq import Queue

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
_QUEUE_NAME = "pkts"

_redis = None
_queue = None


def get_redis():
    """Return a process-wide :class:`redis.Redis` connection."""
    global _redis
    if _redis is None:
        _redis = redis.Redis.from_url(REDIS_URL)
    return _redis


def get_queue():
    """Return the singleton ``pkts`` :class:`rq.Queue`."""
    global _queue
    if _queue is None:
        _queue = Queue(_QUEUE_NAME, connection=get_redis())
    return _queue


def enqueue(func, *args, **kwargs):
    """Best-effort enqueue.

    Returns the RQ job on success, or ``None`` if Redis is unreachable — the
    raw batch is already safely persisted in CouchDB, so a missed enqueue is
    recovered by the next ingest (the worker drains *all* unprocessed batches,
    not just the one it was notified about).
    """
    try:
        return get_queue().enqueue(func, *args, **kwargs)
    except Exception as exc:
        print(f"[rq] enqueue failed ({exc}); batch will be picked up on next ingest")
        return None
