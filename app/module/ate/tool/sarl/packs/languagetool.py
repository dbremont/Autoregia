"""LanguageTool adapter — the external engine, designed dormant.

The code path (submit, parse matches, map to findings with evidence
spans) is complete and testable against a mock endpoint; it wakes only
when a LanguageTool server URL is configured in settings. Findings are
tagged ``engine: languagetool`` so their provenance stays distinct from
the deterministic live packs — never blended silently.
"""
import json
import re
import urllib.parse
import urllib.request

PACK = {
    "id": "languagetool",
    "languages": ["es", "en"],
    "dimension": None,          # covers all dimensions
    "status": "dormant",
    "description": ("motor externo suplementario — despierta solo cuando "
                    "se configura un servidor LanguageTool "
                    "(settings → languagetool_url)"),
}

LANGUAGE_MAP = {"es": "es-ES", "en": "en-US"}
TIMEOUT_S = 20

_CATEGORY_DIMENSION = {
    "PUNCTUATION": "ortotipografica",
    "TYPOGRAPHY": "ortotipografica",
    "CASING": "ortotipografica",
    "GRAMMAR": "linguistica",
    "TYPOS": "linguistica",
    "CONFUSED_WORDS": "linguistica",
    "STYLE": "estilistica",
    "REDUNDANCY": "estilistica",
    "COLLOQUIALISMS": "estilistica",
}
_SEVERITY_CATEGORIES = {"TYPOS", "PUNCTUATION", "CASING", "GRAMMAR"}


def _post_form(url, fields, timeout_s):
    """POST x-www-form-urlencoded, parse the JSON response."""
    data = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded",
                 "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        return json.loads(resp.read().decode("utf-8"))


def check(url, text, language, post=None, timeout_s=TIMEOUT_S):
    """Query a LanguageTool server; returns raw finding dicts.

    ``post`` is injectable so tests can run this against a mock without
    a network. Raises on transport errors — the caller decides whether
    an external-engine failure is fatal (it is recorded, not silent).
    """
    do_post = post or _post_form
    endpoint = url.rstrip("/") + "/v2/check"
    payload = do_post(endpoint, {
        "text": text,
        "language": LANGUAGE_MAP.get(language, language),
        "level": "picky",
    }, timeout_s)

    findings = []
    for m in payload.get("matches", []):
        offset = int(m.get("offset", 0))
        length = int(m.get("length", 0))
        rule = m.get("rule") or {}
        category = (rule.get("category") or {}).get("id", "")
        rule_id = rule.get("id") or "LT-unknown"
        replacements = m.get("replacements") or []
        suggestion = (replacements[0].get("value")
                      if replacements and replacements[0].get("value")
                      else None)
        findings.append({
            "rule_id": "lt-" + re.sub(r"[^A-Za-z0-9_-]+", "-", rule_id).lower(),
            "pack": "languagetool",
            "dimension": _CATEGORY_DIMENSION.get(category, "linguistica"),
            "severity": ("error" if category in _SEVERITY_CATEGORIES
                         else "warning"),
            "start": offset,
            "end": offset + length,
            "evidence": text[offset:offset + length],
            "message": m.get("message") or "LanguageTool finding",
            "suggestion": suggestion,
            "engine": "languagetool",
        })
    return findings
