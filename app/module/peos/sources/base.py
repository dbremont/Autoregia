"""Shared types for PEOS external-observation sources.

A *source* is a free public feed of what *other agents* say about the world.
Each source implements :class:`Source` and returns :class:`Observation` values,
which the server persists in CouchDB as ``observational`` events.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import asdict, dataclass, field
from typing import Protocol, runtime_checkable


def now_ms() -> int:
    import time
    return int(time.time() * 1000)


def slugify(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return s or "topic"


def obs_id(source: str, native_id: str) -> str:
    """Stable document id for an observation: hash of (source, native_id).

    The same item fetched twice (or matching two topics) collapses to one doc,
    so the CouchDB store acts as a natural dedup table.
    """
    h = hashlib.sha1(f"{source}:{native_id}".encode("utf-8")).hexdigest()
    return f"OBS-{h[:24]}"


@dataclass
class Topic:
    """A watched query. ``query`` semantics are source-specific:

    * hackernews / lobsters / gdelt — free-text search string
    * reddit                       — subreddit name (with or without ``r/``)
    * mastodon                     — hashtag (with or without ``#``)
    """
    topic_id: str
    source: str
    query: str
    interval_s: int = 0       # 0 = use the source's default_interval_s
    enabled: bool = True

    @classmethod
    def from_doc(cls, doc: dict) -> "Topic":
        topic_id = doc.get("topic_id") or doc.get("id", "").replace("TOPIC-", "")
        return cls(
            topic_id=topic_id,
            source=doc["source"],
            query=doc["query"],
            interval_s=int(doc.get("interval_s") or 0),
            enabled=bool(doc.get("enabled", True)),
        )


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
    topics: list = field(default_factory=list)
    score: int | None = None
    language: str | None = None
    captured_at_ms: int = 0     # when WE fetched it (set on construction)
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
        d["topics"] = list(self.topics or [])
        return d


@runtime_checkable
class Source(Protocol):
    """A pluggable feed. ``poll`` must be defensive: raise on transport errors
    (the collector records ``last_error`` and backs off), never return partial
    junk."""
    name: str
    default_interval_s: int

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]: ...
