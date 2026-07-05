#!/usr/bin/env python3
"""RQ worker entrypoint for the PKTS processing queue.

Run:  python3 pkts/worker.py

Requires a running Redis server (``REDIS_URL``, default
``redis://localhost:6379/0``) and a reachable CouchDB. The worker imports
:mod:`pkts.jobs` in-process, so enqueued ``process_pending`` calls execute
here without any extra configuration. It drains the ``pkts`` queue created by
``pkts/server.py``'s ``/api/ingest`` endpoint.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rq import Worker

from pkts.tasks import get_queue, get_redis

if __name__ == "__main__":
    queue = get_queue()
    Worker([queue], connection=get_redis()).work(with_scheduler=True)
