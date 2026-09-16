"""Shared types for WOS external-observation sources.

A *source* is a free public feed of what *other agents* say about the world.
Each source implements :class:`Source` and returns :class:`Observation` values,
which the server persists in CouchDB as ``observational`` events. Sources are
plain poll specs (``source`` + ``query``) loaded from ``config/seed.json`` —
no topic tagging happens at collection time; that is the job of the
downstream processing pipeline.
"""
from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass, field
from typing import Protocol, runtime_checkable


def now_ms() -> int:
    import time
    return int(time.time() * 1000)


def obs_id(source: str, native_id: str) -> str:
    """Stable document id for an observation: hash of (source, native_id).

    The same item fetched twice collapses to one doc, so the CouchDB store
    acts as a natural dedup table.
    """
    h = hashlib.sha1(f"{source}:{native_id}".encode("utf-8")).hexdigest()
    return f"OBS-{h[:24]}"


@dataclass
class Observation:
    source: str
    source_type: str            # comment | story | post | article
    native_id: str
    native_url: str
    observed_at_ms: int         # when it was published (source-native)
    author: str
    title: str = ""
    body: str = ""
    score: int | None = None
    language: str | None = None
    region: str | None = None     # coarse origin region, when the feed ships one (see geo.py)
    captured_at_ms: int = 0       # when WE fetched it (set on construction)
    raw: dict = field(default_factory=dict)

    def __post_init__(self):
        if not self.captured_at_ms:
            self.captured_at_ms = now_ms()

    @property
    def id(self) -> str:
        return obs_id(self.source, self.native_id)

    def to_doc(self) -> dict:
        d = asdict(self)
        d["id"] = self.id
        d["doc_type"] = "observation"
        d["event_type"] = "observational"
        return d


@runtime_checkable
class Source(Protocol):
    """A pluggable feed. ``poll`` must be defensive: raise on transport errors
    (the collector records ``last_error`` and backs off), never return partial
    junk. ``query`` semantics are source-specific:

    * hackernews / lobsters / gdelt / crossref / openalex — free-text search string
    * reddit                       — subreddit name (with or without ``r/``)
    * mastodon                     — hashtag (with or without ``#``)
    * nitter                       — X handle (with or without ``@``)
    * rss                          — full feed URL
    * arxiv                        — arXiv API query syntax
    """
    name: str
    default_interval_s: int

    def poll(self, query: str, since_ms: int | None) -> list[Observation]: ...
