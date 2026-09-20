"""Pack estilo — clarity, economy, and register (es · en). The
muletilla/filler check reads the phrase catalog (editable
phrase_collection docs) instead of hard-coded lists; repetition,
sentence-length outliers, and register breaks are deterministic.
"""
import re

from . import base

PACK = {
    "id": "estilo",
    "languages": ["es", "en"],
    "dimension": "estilistica",
    "status": "live",
    "description": ("muletillas del catálogo de frases, repetición, "
                    "oraciones largas, rupturas de registro"),
}

MAX_SENTENCE_WORDS = 45
REPETITION_MIN_WORD = 5
REPETITION_MIN_COUNT = 3
_SHOUT_RE = re.compile(r"(?<!\w)[A-ZÁÉÍÓÚÜÑ]{3,}(?!\w)")
_BANGS_RE = re.compile(r"[!?]{2,}")


def _phrases_for(ctx):
    """Enabled phrase lists matching the text language (or «any»)."""
    out = []
    for coll in ctx.phrases:
        if not coll.get("enabled", True):
            continue
        lang = (coll.get("language") or "any").lower()
        if lang not in ("any", ctx.language):
            continue
        out.extend(base.phrase_list(coll.get("phrases")))
    return out


def _find_muletillas(ctx):
    rule = RULE_BY_ID["est-muletillas"]
    out = []
    for phrase in _phrases_for(ctx):
        rx = base.phrase_regex(phrase)
        for m in rx.finditer(ctx.text):
            out.append(base.make_finding(
                ctx, m.start(), m.end(), rule, "",
                f" — «{m.group(0)}» es una muletilla; elimínala"))
    out.sort(key=lambda f: f["start"])
    return out


def _find_repetition(ctx):
    rule = RULE_BY_ID["est-repetition"]
    out = []
    for s_start, _s_end, sentence in base.sentences(ctx.text):
        seen = {}
        for w_start, w_end, word in base.words(sentence):
            if len(word) < REPETITION_MIN_WORD or word in base.STOPWORDS:
                continue
            seen.setdefault(word, []).append((s_start + w_start,
                                              s_start + w_end))
        for word, spans in seen.items():
            if len(spans) < REPETITION_MIN_COUNT:
                continue
            start, end = spans[REPETITION_MIN_COUNT - 1]
            out.append(base.make_finding(
                ctx, start, end, rule, None,
                f" — «{word}» se repite {len(spans)} veces en la misma "
                "oración"))
    out.sort(key=lambda f: f["start"])
    return out


def _find_sentence_length(ctx):
    rule = RULE_BY_ID["est-sentence-length"]
    out = []
    for s_start, s_end, sentence in base.sentences(ctx.text):
        n = len(list(base.words(sentence)))
        if n <= MAX_SENTENCE_WORDS:
            continue
        lead = sentence[:40].rstrip()
        out.append(base.make_finding(
            ctx, s_start, min(s_end, s_start + 60), rule, None,
            f" — oración de {n} palabras (umbral {MAX_SENTENCE_WORDS}): "
            f"«{lead}…»"))
    return out


def _find_register(ctx):
    rule = RULE_BY_ID["est-register-break"]
    if ctx.register not in ("technical", "formal"):
        return []
    out = []
    for m in _BANGS_RE.finditer(ctx.text):
        out.append(base.make_finding(ctx, m.start(), m.end(), rule, None,
                                     " — puntuación enfática en un texto "
                                     f"{ctx.register}"))
    for m in _SHOUT_RE.finditer(ctx.text):
        out.append(base.make_finding(ctx, m.start(), m.end(), rule, None,
                                     " — mayúsculas sostenidas en un texto "
                                     f"{ctx.register}"))
    out.sort(key=lambda f: f["start"])
    return out


RULES = []


def _rule(rid, severity, message):
    return {"id": rid, "pack": "estilo", "dimension": "estilistica",
            "severity": severity, "message": message}


_MULETILLAS = _rule("est-muletillas", "suggestion",
                    "muletilla (frase de relleno que debilita la prosa)")
_REPETITION = _rule("est-repetition", "suggestion",
                    "repetición innecesaria en la misma oración")
_LENGTH = _rule("est-sentence-length", "suggestion",
                "oración demasiado larga")
_REGISTER = _rule("est-register-break", "suggestion",
                  "ruptura de registro contra el género declarado")

_MULETILLAS["find"] = _find_muletillas
_REPETITION["find"] = _find_repetition
_LENGTH["find"] = _find_sentence_length
_REGISTER["find"] = _find_register

RULES = [_MULETILLAS, _REPETITION, _LENGTH, _REGISTER]
RULE_BY_ID = {r["id"]: r for r in RULES}
