#!/usr/bin/env python3
"""PRS entry point.

Usage::

    python run.py              # start server on http://localhost:5000
    python run.py --no-seed    # skip seeding the database
"""

from __future__ import annotations

import sys

PRS_VERSION = "0.1.0"


def main() -> int:
    bar = "=" * 60
    print(
        f"\n{bar}\n"
        f"  PRS — Personal Recording System v{PRS_VERSION}\n"
        f"  (dev server wiring lands in Phase 1)\n"
        f"{bar}\n"
    )
    if "--no-seed" in sys.argv:
        print("  --no-seed acknowledged (no seeding implemented yet).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
