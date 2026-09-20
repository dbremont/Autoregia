"""SARL rule packs — the deterministic review engine.

A pack is one module per language × dimension (plus the dormant
LanguageTool adapter) declaring PACK metadata and a RULES list. The
live path is pure Python: regex and token matchers plus word lists —
no network, no models. Adding a pack is adding one module and one line
in ``_PACK_MODULES``.

``run_review`` is the single entry the server calls: it engages the
packs matching the text's language and the requested dimensions, runs
every live rule, wakes the external engine only when configured, then
orders by span and caps the findings (bounded responses).
"""
from . import base
from . import en_orthotypography
from . import es_linguistica
from . import es_ortotipografia
from . import estilo
from . import languagetool
from . import terminologia

DIMENSIONS = ["ortotipografica", "linguistica", "estilistica",
              "terminologica"]
SEVERITIES = ["error", "warning", "suggestion"]

_PACK_MODULES = [
    es_ortotipografia,
    es_linguistica,
    en_orthotypography,
    estilo,
    terminologia,
    languagetool,
]


def _pack_meta(module):
    pack = dict(module.PACK)
    pack["rules"] = [
        {k: r[k] for k in ("id", "dimension", "severity", "message")
         if k in r}
        for r in getattr(module, "RULES", [])
    ]
    return pack


def registry():
    """The pack registry as served by GET /api/rules."""
    return [_pack_meta(m) for m in _PACK_MODULES]


class _Ctx:
    """What a rule sees: the text plus the terminological authorities."""

    def __init__(self, text, language, register, glossaries, phrases,
                 settings):
        self.text = text
        self.language = language
        self.register = register
        self.glossaries = glossaries or []
        self.phrases = phrases or []
        self.excerpt_cap = int((settings or {}).get("evidence_excerpt", 120))


def run_review(content, *, language="es", register=None, dimensions=None,
               glossaries=None, phrases=None, settings=None,
               languagetool_url=None):
    """Run every engaged rule over ``content``.

    Returns ``(findings, packs_engaged)``. Findings are ordered by span
    start (severity as tiebreak), stripped of anything inside markdown
    protected regions (code blocks, inline code, link URLs), and capped
    at ``max_findings``. The external engine wakes only when
    ``languagetool_url`` is set; its findings carry
    ``engine: languagetool``.
    """
    ctx = _Ctx(content, language, register, glossaries, phrases, settings)
    wanted = set(dimensions or DIMENSIONS)
    packs_engaged = []
    raw = []

    for module in _PACK_MODULES:
        meta = module.PACK
        if meta.get("status") != "live":
            continue
        if language not in meta.get("languages", []):
            continue
        if meta.get("dimension") not in wanted:
            continue
        packs_engaged.append(meta["id"])
        for rule in module.RULES:
            raw.extend(rule["find"](ctx))

    if languagetool_url:
        packs_engaged.append("languagetool")
        try:
            raw.extend(languagetool.check(languagetool_url, content,
                                          language))
        except Exception as exc:
            raw.append({
                "rule_id": "lt-engine-error", "pack": "languagetool",
                "dimension": "linguistica", "severity": "warning",
                "start": 0, "end": 0,
                "evidence": content[:20],
                "message": f"el motor externo no respondió: {exc}",
                "suggestion": None, "engine": "languagetool",
            })

    cap = int((settings or {}).get("max_findings", 200))
    raw.sort(key=lambda f: (f["start"], base.SEVERITY_RANK[f["severity"]],
                            f["rule_id"]))
    # markdown protection: code, links, and markup are never corrected
    protected = base.protected_spans(content)
    raw = [f for f in raw
           if not base.overlaps_any(f["start"], f["end"], protected)]
    return raw[:cap], packs_engaged
