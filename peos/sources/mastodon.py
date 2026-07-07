"""Mastodon / Fediverse source via per-instance public hashtag timelines.

The fediverse is federated, so each instance exposes its own API. We query the
public ``/api/v1/timelines/tag/{tag}`` endpoint on a configurable list of
instances (env ``PEOS_MASTODON_INSTANCES``). Most instances allow unauthenticated
reads of the public timeline; set ``PEOS_MASTODON_ACCESS_TOKEN`` for instances
that require it.

``topic.query`` is the hashtag (``AI`` or ``#AI``).
"""
from __future__ import annotations

import os

from .base import Observation, Source, Topic
from .http_util import get_json, parse_iso_ms, strip_html

_DEFAULT_INSTANCES = "mastodon.social,fosstodon.org,hachyderm.io"


class MastodonSource:
    name = "mastodon"
    default_interval_s = 1200         # 20 minutes

    @property
    def instances(self) -> list[str]:
        raw = os.environ.get("PEOS_MASTODON_INSTANCES", _DEFAULT_INSTANCES)
        return [i.strip() for i in raw.split(",") if i.strip()]

    @property
    def _token(self) -> str:
        return os.environ.get("PEOS_MASTODON_ACCESS_TOKEN", "")

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        tag = topic.query.strip().lstrip("#")
        if not tag:
            return []
        headers = {"Authorization": f"Bearer {self._token}"} if self._token else None
        out: list[Observation] = []
        for inst in self.instances:
            url = f"https://{inst}/api/v1/timelines/tag/{tag}"
            try:
                statuses = get_json(url, params={"limit": 40}, headers=headers)
            except Exception:
                # An instance may be down or require auth; skip it, keep others.
                continue
            for st in statuses or []:
                sid = st.get("id")
                if not sid:
                    continue
                ts = parse_iso_ms(st.get("created_at", ""))
                if since_ms and ts and ts < since_ms:
                    continue
                acct = (st.get("account") or {}).get("acct", "")
                out.append(Observation(
                    source=self.name,
                    source_type="post",
                    native_id=f"{inst}:{sid}",
                    native_url=(st.get("url")
                                or f"https://{inst}/@{acct}/{sid}"),
                    observed_at_ms=ts,
                    author=acct,
                    title="",
                    body=strip_html(st.get("content", "")),
                    topics=[topic.topic_id],
                    score=(st.get("favourites_count") or 0)
                          + (st.get("reblogs_count") or 0),
                    language=st.get("language"),
                    raw={
                        "instance": inst,
                        "id": sid,
                        "created_at": st.get("created_at"),
                        "url": st.get("url"),
                        "language": st.get("language"),
                        "favourites_count": st.get("favourites_count"),
                        "reblogs_count": st.get("reblogs_count"),
                    },
                ))
        return out
