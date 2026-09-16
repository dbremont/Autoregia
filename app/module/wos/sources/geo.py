"""Region inference for observations.

The only geo signal WOS carries is the *origin region of a source* — never a
location of the agent. GDELT ships a ``sourcecountry`` field per article; for
URL-only feeds a ccTLD fallback covers the common country domains. Everything
unmappable stays ``None`` — no guessing.
"""
from __future__ import annotations

_REGIONS: dict[str, set[str]] = {
    "North America": {
        "united states", "united states of america", "canada", "mexico",
    },
    "Europe": {
        "united kingdom", "ireland", "france", "germany", "netherlands",
        "belgium", "luxembourg", "spain", "portugal", "italy", "switzerland",
        "austria", "sweden", "norway", "denmark", "finland", "iceland",
        "poland", "czechia", "czech republic", "slovakia", "hungary",
        "romania", "bulgaria", "greece", "croatia", "slovenia", "serbia",
        "ukraine", "belarus", "russia", "estonia", "latvia", "lithuania",
        "turkey", "cyprus", "malta",
    },
    "Asia": {
        "china", "india", "japan", "south korea", "north korea", "taiwan",
        "hong kong", "singapore", "malaysia", "indonesia", "thailand",
        "vietnam", "philippines", "myanmar", "cambodia", "laos", "bangladesh",
        "pakistan", "sri lanka", "nepal", "bhutan", "afghanistan", "kazakhstan",
        "uzbekistan", "mongolia", "iran", "iraq", "israel", "palestine",
        "jordan", "lebanon", "syria", "saudi arabia", "united arab emirates",
        "qatar", "kuwait", "oman", "yemen", "georgia", "armenia", "azerbaijan",
    },
    "Latin America": {
        "brazil", "argentina", "chile", "colombia", "peru", "venezuela",
        "ecuador", "bolivia", "paraguay", "uruguay", "guyana", "suriname",
        "guatemala", "honduras", "el salvador", "nicaragua", "costa rica",
        "panama", "cuba", "dominican republic", "haiti", "jamaica",
        "puerto rico", "trinidad and tobago",
    },
    "Africa": {
        "south africa", "nigeria", "kenya", "ghana", "ethiopia", "egypt",
        "morocco", "algeria", "tunisia", "libya", "tanzania", "uganda",
        "rwanda", "senegal", "ivory coast", "cameroon", "zambia", "zimbabwe",
        "mozambique", "angola", "botswana", "namibia", "mali", "niger",
        "burkina faso", "somalia", "sudan", "malawi",
    },
    "Oceania": {
        "australia", "new zealand", "fiji", "papua new guinea",
        "solomon islands", "vanuatu", "samoa",
    },
}

_LOOKUP = {c: r for r, cs in _REGIONS.items() for c in cs}

# ccTLD fallback — the common country domains, mapped to the same six regions.
_TLD_REGION: dict[str, str] = {
    "us": "North America", "ca": "North America", "mx": "North America",
    "uk": "Europe", "ie": "Europe", "fr": "Europe", "de": "Europe",
    "nl": "Europe", "be": "Europe", "es": "Europe", "pt": "Europe",
    "it": "Europe", "ch": "Europe", "at": "Europe", "se": "Europe",
    "no": "Europe", "dk": "Europe", "fi": "Europe", "is": "Europe",
    "pl": "Europe", "cz": "Europe", "sk": "Europe", "hu": "Europe",
    "ro": "Europe", "bg": "Europe", "gr": "Europe", "hr": "Europe",
    "si": "Europe", "rs": "Europe", "ua": "Europe", "ru": "Europe",
    "tr": "Europe", "cy": "Europe", "mt": "Europe", "eu": "Europe",
    "in": "Asia", "cn": "Asia", "jp": "Asia", "kr": "Asia", "tw": "Asia",
    "hk": "Asia", "sg": "Asia", "my": "Asia", "id": "Asia", "th": "Asia",
    "vn": "Asia", "ph": "Asia", "pk": "Asia", "bd": "Asia", "lk": "Asia",
    "np": "Asia", "kz": "Asia", "il": "Asia", "ae": "Asia", "sa": "Asia",
    "qa": "Asia", "ir": "Asia", "br": "Latin America", "ar": "Latin America",
    "cl": "Latin America", "co": "Latin America", "pe": "Latin America",
    "ve": "Latin America", "uy": "Latin America", "py": "Latin America",
    "bo": "Latin America", "ec": "Latin America", "cr": "Latin America",
    "pa": "Latin America", "do": "Latin America", "gt": "Latin America",
    "za": "Africa", "ng": "Africa", "ke": "Africa", "gh": "Africa",
    "eg": "Africa", "ma": "Africa", "tn": "Africa", "tz": "Africa",
    "ug": "Africa", "et": "Africa", "ao": "Africa", "zw": "Africa",
    "au": "Oceania", "nz": "Oceania", "fj": "Oceania",
}


def region_for(country: str | None = None, url: str | None = None) -> str | None:
    """Region for a source country name, falling back to the URL's ccTLD."""
    if country:
        # GDELT sometimes writes "United States (US)" — drop the parenthetical.
        name = country.split("(")[0].strip().lower()
        if name in _LOOKUP:
            return _LOOKUP[name]
    if url:
        host = url.split("/")[2].lower() if url.startswith("http") and url.count("/") > 2 else ""
        labels = host.split(".") if host else []
        if len(labels) >= 2:
            r = _TLD_REGION.get(labels[-1])
            if r:
                return r
    return None
