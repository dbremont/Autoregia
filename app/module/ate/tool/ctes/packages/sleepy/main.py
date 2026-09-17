"""sleepy — sleeps, then reports; exercises timeout enforcement.

Contract: run(payload: dict) -> JSON-serializable dict.
"""
import time


def run(payload):
    seconds = float((payload or {}).get("seconds", 1))
    time.sleep(seconds)
    return {"slept_s": seconds}
