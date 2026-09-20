"""Pack terminologia — glossary compliance and consistency (es · en).
Enforces the glossaries attached to a review: forbidden terms raise
errors, unpreferred aliases warnings, and terminology drift across one
text is flagged for consistency.
"""
from . import base

PACK = {
    "id": "terminologia",
    "languages": ["es", "en"],
    "dimension": "terminologica",
    "status": "live",
    "description": ("términos prohibidos, alias no preferentes y deriva "
                    "terminológica — aplica cualquier glosario adjunto"),
}


def _find_glossary(ctx):
    rule = RULE_BY_ID["term-glossary"]
    out = []
    for entry in base.glossary_entries(ctx.glossaries):
        preferred = entry["preferred"]
        variants = {}          # variant term -> first occurrence span
        rx_pref = base.term_regex(preferred)
        pref_hits = list(rx_pref.finditer(ctx.text))
        if pref_hits:
            variants[preferred] = (pref_hits[0].start(), pref_hits[0].end())

        def term_hits(term):
            return [(m.start(), m.end())
                    for m in base.term_regex(term).finditer(ctx.text)]

        for term in entry["forbidden"]:
            hits = term_hits(term)
            if not hits:
                continue
            variants.setdefault(term, hits[0])
            start, end = hits[0]
            out.append(base.make_finding(
                ctx, start, end, rule, preferred,
                f" — «{term}» es término prohibido por el glosario; "
                f"usa «{preferred}»"))
        for term in entry["aliases"]:
            hits = term_hits(term)
            if not hits:
                continue
            variants.setdefault(term, hits[0])
            start, end = hits[0]
            out.append(base.make_finding(
                ctx, start, end, rule, preferred,
                f" — «{term}» es alias no preferente; el glosario pide "
                f"«{preferred}»"))
        if len(variants) > 1:
            non_pref = [t for t in variants if t != preferred]
            start, end = variants[non_pref[0]]
            listing = ", ".join(f"«{t}»" for t in sorted(variants))
            out.append(base.make_finding(
                ctx, start, end, rule, preferred,
                f" — deriva terminológica: {listing} conviven en el texto; "
                f"unifica en «{preferred}»"))
    out.sort(key=lambda f: f["start"])
    return out


_GLOSSARY_RULE = {
    "id": "term-glossary", "pack": "terminologia",
    "dimension": "terminologica", "severity": "error",
    "message": "incumplimiento del glosario adjunto",
}
_GLOSSARY_RULE["find"] = _find_glossary

RULES = [_GLOSSARY_RULE]
RULE_BY_ID = {r["id"]: r for r in RULES}
