"""hello — the canonical CTES smoke-test handle.

Contract: run(payload: dict) -> JSON-serializable dict.
"""


def run(payload):
    name = (payload or {}).get("name") or "world"
    return {"message": f"hello, {name}"}
