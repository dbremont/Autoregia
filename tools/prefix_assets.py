"""
Prefix-rewrite the static assets of each Autoregia sub-system so they resolve
under the unified server's path prefixes (e.g. ``/css/x`` -> ``/prs/css/x``).

The sub-systems were originally standalone root apps, so their HTML/JS/CSS use
absolute root paths (``/api/...``, ``/css/...``, ``url('/fonts/...')``) and a
few ``href="/"`` links. Under the unified router each tool lives at
``/<prefix>/``, so those references are rewritten to ``/<prefix>/...``.

Idempotent by construction: a path already prefixed (``"/prs/css/..."``) is not
matched again, because the char preceding ``/css/`` is no longer a quote.
Re-run after changing URL prefixes in ../app.py.

Usage:  python3 tools/prefix_assets.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (prefix, [asset dirs/files relative to repo root])
TOOLS = {
    "prs": ["prs/static"],
    "pkts": ["pkts/static"],
    "ptocs": ["ptocs/static"],
    "pps": ["pps/static", "pps/index.html", "pps/policies"],
    "pwos": ["pwos/static"],
}

# Path segments served under each tool's mount that must be prefixed.
SEGMENTS = ["css", "js", "fonts", "api", "data", "static", "policies"]

# quote/backtick + "/" + segment + "/"  ->  quote + "/" + prefix + "/" + segment + "/"
_PATH_RE = re.compile(r"(['\"`])/(" + "|".join(SEGMENTS) + r")/")
# href="/" / href='/'  ->  href="/<prefix>/"
_ROOT_HREF_RE = re.compile(r"""(href\s*=\s*)(['"])/(['"])""")

SKIP_DIRS = {"vendor", "__pycache__"}
TEXT_EXT = {".html", ".js", ".css"}


def _iter_files(target):
    if os.path.isfile(target):
        yield target
        return
    for dirpath, dirnames, filenames in os.walk(target):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if os.path.splitext(fn)[1] in TEXT_EXT:
                yield os.path.join(dirpath, fn)


def _rewrite(text, prefix):
    text = _PATH_RE.sub(
        lambda m: f"{m.group(1)}/{prefix}/{m.group(2)}/", text)
    text = _ROOT_HREF_RE.sub(
        lambda m: f'{m.group(1)}{m.group(2)}/{prefix}/{m.group(3)}', text)
    return text


def main():
    updated = 0
    for prefix, targets in TOOLS.items():
        for rel in targets:
            for path in _iter_files(os.path.join(ROOT, rel)):
                with open(path, "r", encoding="utf-8") as fh:
                    original = fh.read()
                rewritten = _rewrite(original, prefix)
                if rewritten != original:
                    with open(path, "w", encoding="utf-8") as fh:
                        fh.write(rewritten)
                    print(f"  {prefix}: {os.path.relpath(path, ROOT)}")
                    updated += 1
    print(f"done: {updated} file(s) updated")


if __name__ == "__main__":
    main()
