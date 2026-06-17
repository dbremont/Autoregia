"""Load seed records from ``data/seed.json`` into the SQLite database.

Usage::

    python -m backend.seed          # from project root
    python backend/seed.py          # from backend/ dir
"""

from __future__ import annotations

import json
import os
import sys

# Ensure ``backend`` is importable when run as a plain script.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import db  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_PATH = os.path.join(BASE_DIR, "data", "seed.json")


def load_seed(seed_path: str = SEED_PATH, force: bool = False) -> int:
    """Insert seed records into the database.

    Returns the number of records inserted.  If ``force`` is ``False`` and
    records already exist, the database is left untouched.
    """
    db.init_db()

    with db.get_connection() as conn:
        existing = conn.execute("SELECT COUNT(*) AS n FROM records").fetchone()["n"]
        if existing > 0 and not force:
            print(f"Database already has {existing} records. Use --force to reload.")
            return 0

        if force and existing > 0:
            conn.execute("DELETE FROM records")
            conn.execute("DELETE FROM relations")

        with open(seed_path, encoding="utf-8") as fh:
            records = json.load(fh)

        for rec in records:
            db.insert_record(conn, rec)

        print(f"Loaded {len(records)} seed records from {seed_path}")
        return len(records)


if __name__ == "__main__":
    force = "--force" in sys.argv
    load_seed(force=force)