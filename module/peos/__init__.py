"""Personal External Observation System (PEOS).

A perception sub-system that collects what *other agents* say about the world
from free public feeds (Hacker News, Lobsters, Reddit, Mastodon, GDELT) and
persists each item in CouchDB (db ``peos``) as an ``observational`` event — the
PWMS event-type defined as "a reading the agent actively takes".

See ``peos/server.py`` (Flask API + persistence) and ``peos/collector.py``
(scheduled poller daemon).
"""
