"""PEOS source registry.

Each source is a singleton implementing :class:`peos.sources.base.Source`.
Registration is explicit (mirrors the focus-watcher backend chains): add a module
here and it is available everywhere.
"""
from __future__ import annotations

from .base import Observation, Source, Topic, now_ms, obs_id, slugify
from .gdelt import GDELTSource
from .hackernews import HackerNewsSource
from .lobsters import LobstersSource
from .mastodon import MastodonSource
from .nitter import NitterSource
from .reddit_rss import RedditSource

_INSTANCES = {
    HackerNewsSource.name: HackerNewsSource(),
    LobstersSource.name: LobstersSource(),
    RedditSource.name: RedditSource(),
    MastodonSource.name: MastodonSource(),
    GDELTSource.name: GDELTSource(),
    NitterSource.name: NitterSource(),
}

SOURCE_REGISTRY: dict[str, Source] = _INSTANCES

SOURCE_META = [
    {"name": s.name, "default_interval_s": s.default_interval_s}
    for s in _INSTANCES.values()
]

__all__ = [
    "SOURCE_REGISTRY",
    "SOURCE_META",
    "Source",
    "Topic",
    "Observation",
    "obs_id",
    "slugify",
    "now_ms",
]
