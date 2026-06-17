#!/usr/bin/env python3
"""PRS entry point — initialize the database, load seed data, and start Flask.

Usage::

    python run.py              # start server on http://localhost:5000
    python run.py --no-seed    # skip seeding the database
"""

from __future__ import annotations

import os
import sys

# Make ``backend`` importable regardless of CWD.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

import db          # noqa: E402
from seed import load_seed  # noqa: E402
from app import app         # noqa: E402


def main() -> None:
    db.init_db()

    if "--no-seed" not in sys.argv:
        load_seed()

    print("\n" + "=" * 60)
    print("  PRS — Personal Recording System")
    print("  Open http://localhost:5000 in your browser")
    print("=" * 60 + "\n")

    app.run(debug=True, port=5000)


if __name__ == "__main__":
    main()