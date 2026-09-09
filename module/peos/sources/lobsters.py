"""Lobsters (lobste.rs) source via the public JSON API (free, no auth).

Lobsters exposes listings as JSON by appending ``.json``. We use the
chronological ``/newest.json`` feed and filter by keyword client-side, which is
the reliable free path (the legacy ``/search.json`` query param is no longer
permitted). For tag-based watching, set ``topic.query`` to ``t:<tag>``, e.g.
``t:programming`` — this fetches ``/t/<tag>.json`` directly.

A small, high-signal computing community.
"""
from __future__ import annotations

from .base import Observation, Source, Topic
from .http_util import parse_iso_ms, get_json


class LobstersSource:
    name = "lobsters"
    default_interval_s = 1200         # 20 minutes
    BASE = "https://lobste.rs"

    def poll(self, topic: Topic, since_ms: int | None) -> list[Observation]:
        query = (topic.query or "").strip()
        if query.startswith("t:"):
            tag = query[2:].strip().lstrip("#")
            data = get_json(f"{self.BASE}/t/{tag}.json", params={"rpp": 50})
        else:
            data = get_json(f"{self.BASE}/newest.json", params={"rpp": 50})
        if not isinstance(data, list):
            data = (data or {}).get("items") or []

        needle = None if query.startswith("t:") else query.lower()
        out: list[Observation] = []
        for item in data or []:
            native_id = item.get("short_id") or ""
            if not native_id:
                continue
            ts = parse_iso_ms(item.get("created_at", ""))
            if since_ms and ts and ts < since_ms:
                continue
            title = item.get("title", "") or ""
            body = (item.get("description", "") or item.get("description_plain", "")
                    or item.get("text", "") or "")
            if needle:
                tags = " ".join(item.get("tags") or [])
                if needle not in (title + " " + body + " " + tags).lower():
                    continue
            submitter = item.get("submitter_user")
            if isinstance(submitter, dict):
                author = submitter.get("username", "")
            else:
                author = submitter or ""
            native_url = item.get("short_id_url") or f"{self.BASE}/s/{native_id}"
            out.append(Observation(
                source=self.name,
                source_type="story",
                native_id=str(native_id),
                native_url=native_url,
                observed_at_ms=ts,
                author=author,
                title=title,
                body=body,
                topics=[topic.topic_id],
                score=item.get("score"),
                raw=item,
            ))
        return out
