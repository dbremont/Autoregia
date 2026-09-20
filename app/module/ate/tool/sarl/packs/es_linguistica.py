"""Pack es-linguistica — grammar and usage of Spanish: agreement and
conjugation slips, usage confusions (queísmo, dequeísmo, haber/a ver),
gender of loanwords. Word-list and pattern checks, fully deterministic.
"""
import re

from . import base

PACK = {
    "id": "es-linguistica",
    "languages": ["es"],
    "dimension": "linguistica",
    "status": "live",
    "description": ("queísmo y dequeísmo, haber / a ver, concordancia de "
                    "género — listas de palabras y patrones"),
}

# Dequeísmo — a spurious «de» before «que» after verbs of thought,
# opinion and declaration. The suggestion drops the «de».
_DEQUEISMO = [
    "pienso de que", "creo de que", "opino de que", "considero de que",
    "dijo de que", "dijeron de que", "dicen de que", "afirmó de que",
    "aseguró de que", "sostuvo de que", "resulta de que", "resultó de que",
    "es necesario de que", "es importante de que", "es preciso de que",
    "conviene de que", "está claro de que", "piensa de que",
    "piensan de que",
]

# Queísmo — a missing «de» before «que». The suggestion restores it.
_QUEISMO = [
    ("a pesar que", "a pesar de que"),
    ("con la condición que", "con la condición de que"),
    ("con la salvedad que", "con la salvedad de que"),
    ("en el supuesto que", "en el supuesto de que"),
    ("con la finalidad que", "con la finalidad de que"),
    ("con el propósito que", "con el propósito de que"),
    ("con el objetivo que", "con el objetivo de que"),
]

_HABER_A_VER = [
    (r"\bhaber si\b", "a ver si",
     "«haber si» cruza «haber» con «a ver si» — aquí corresponde «a ver si»"),
    (r"\bhaver\b", "haber",
     "«haver» no existe en la ortografía vigente — escribe «haber»"),
    (r"\ba ver de\b", "haber de",
     "«a ver de» confunde «a ver» con el verbo «haber (de)»"),
]

# Determinant + noun gender concordance.
_MASC_NOUNS = ["software", "sistema", "programa", "enlace", "origen",
               "idioma", "diagnóstico", "problema", "telegrama", "mapa"]
_FEM_NOUNS = ["clase", "gestión", "sección", "materia", "institución",
              "publicación", "aplicación", "configuración", "base", "cara"]

_WORD_BEFORE = r"(?<!\w)"


def _find_phrases(rule, pairs, drop_de):
    """Case-insensitive phrase list; optional «de»-drop rewriting."""
    compiled = [(base.phrase_regex(p), s) for p, s in pairs]

    def find(ctx):
        out = []
        for rx, sug in compiled:
            for m in rx.finditer(ctx.text):
                if drop_de:
                    replacement = re.sub(r"\s+de\s+(?=que\b)", " ",
                                         m.group(0), flags=re.IGNORECASE)
                else:
                    replacement = sug
                out.append(base.make_finding(ctx, m.start(), m.end(), rule,
                                             replacement))
        out.sort(key=lambda f: f["start"])
        return out
    return find


def _find_patterns(rule, triples):
    compiled = [(re.compile(pat, re.IGNORECASE), sug, msg)
                for pat, sug, msg in triples]

    def find(ctx):
        out = []
        for rx, sug, msg in compiled:
            for m in rx.finditer(ctx.text):
                out.append(base.make_finding(ctx, m.start(), m.end(), rule,
                                             sug, " — " + msg))
        out.sort(key=lambda f: f["start"])
        return out
    return find


def _find_gender(rule, wrong_article, nouns, right_article):
    rx = re.compile(
        _WORD_BEFORE + "(?:" + "|".join(wrong_article) + ") (" +
        "|".join(nouns) + r")\b", re.IGNORECASE)
    gender = "femenino" if right_article == "la" else "masculino"

    def find(ctx):
        out = []
        for m in rx.finditer(ctx.text):
            noun = m.group(0).split()[-1]
            out.append(base.make_finding(
                ctx, m.start(), m.end(), rule,
                right_article + " " + noun,
                f" — «{noun.lower()}» es {gender}"))
        return out
    return find


_DEQUEISMO_RULE = {
    "id": "es-lin-dequeismo", "pack": "es-linguistica",
    "dimension": "linguistica", "severity": "error",
    "message": "dequeísmo: sobra la preposición «de» ante «que»",
}
_DEQUEISMO_RULE["find"] = _find_phrases(_DEQUEISMO_RULE,
                                        [(p, None) for p in _DEQUEISMO],
                                        drop_de=True)

_QUEISMO_RULE = {
    "id": "es-lin-queismo", "pack": "es-linguistica",
    "dimension": "linguistica", "severity": "error",
    "message": "queísmo: falta la preposición «de» ante «que»",
}
_QUEISMO_RULE["find"] = _find_phrases(_QUEISMO_RULE, _QUEISMO, drop_de=False)

_HABER_RULE = {
    "id": "es-lin-haber-a-ver", "pack": "es-linguistica",
    "dimension": "linguistica", "severity": "error",
    "message": "confusión de uso entre «haber» y «a ver»",
}
_HABER_RULE["find"] = _find_patterns(_HABER_RULE, _HABER_A_VER)

_GENDER_RULE = {
    "id": "es-lin-gender", "pack": "es-linguistica",
    "dimension": "linguistica", "severity": "warning",
    "message": "concordancia de género del determinante",
}
_el_of_fem = _find_gender(_GENDER_RULE, ["el"], _FEM_NOUNS, "la")
_la_of_masc = _find_gender(_GENDER_RULE, ["la"], _MASC_NOUNS, "el")
_GENDER_RULE["find"] = lambda ctx: _el_of_fem(ctx) + _la_of_masc(ctx)

RULES = [_DEQUEISMO_RULE, _QUEISMO_RULE, _HABER_RULE, _GENDER_RULE]
RULE_BY_ID = {r["id"]: r for r in RULES}
