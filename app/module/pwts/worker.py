#!/usr/bin/env python3
"""RQ worker entrypoint for the PWTS processing queue.

Run:  python3 pwts/worker.py

Requires a running Redis server (``REDIS_URL``, default
``redis://localhost:6379/0``) and a reachable CouchDB. Drains the ``pwts``
queue fed by ``pwts/server.py``'s ``/api/ingest`` endpoint.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from rq import Worker

from pwts.tasks import get_queue, get_redis

if __name__ == "__main__":
    queue = get_queue()
    Worker([queue], connection=get_redis()).work(with_scheduler=True)
