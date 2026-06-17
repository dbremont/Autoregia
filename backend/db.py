"""SQLite database layer for the Personal Recording System (PRS).

Records are stored as JSON documents in the ``records`` table, with a few
denormalized columns copied out of the JSON for fast dashboard filtering.
Relations are stored in a separate ``relations`` table to support the
knowledge-graph view.
"""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

# Resolve paths relative to the project root (parent of ``backend/``).
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "prs.db")
SCHEMA_PATH = os.path.join(DATA_DIR, "schema.sql")

# --------------------------------------------------------------------------- #
# Schema
# --------------------------------------------------------------------------- #

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS records (
    id               TEXT PRIMARY KEY,
    content          TEXT,
    detail           TEXT,
    data             TEXT NOT NULL,
    execution_state  TEXT,
    priority         TEXT,
    lifecycle_state  TEXT,
    validation_state TEXT,
    domain           TEXT,
    created_at       TEXT,
    updated_at       TEXT,
    deadline         TEXT
);

CREATE INDEX IF NOT EXISTS idx_records_execution_state
    ON records (execution_state);
CREATE INDEX IF NOT EXISTS idx_records_priority
    ON records (priority);
CREATE INDEX IF NOT EXISTS idx_records_lifecycle_state
    ON records (lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_records_domain
    ON records (domain);
CREATE INDEX IF NOT EXISTS idx_records_deadline
    ON records (deadline);

CREATE TABLE IF NOT EXISTS relations (
    source_id      TEXT NOT NULL,
    target_id      TEXT NOT NULL,
    relation_type  TEXT NOT NULL,
    PRIMARY KEY (source_id, target_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_relations_source
    ON relations (source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target
    ON relations (target_id);
"""


def init_db(db_path: str = DB_PATH) -> None:
    """Create the database file (and ``data/`` directory) if missing."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with get_connection(db_path) as conn:
        conn.executescript(SCHEMA_SQL)
        conn.commit()


@contextmanager
def get_connection(db_path: str = DB_PATH) -> Iterator[sqlite3.Connection]:
    """Yield a SQLite connection, committing on success, rolling back on error."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# --------------------------------------------------------------------------- #
# JSON helpers
# --------------------------------------------------------------------------- #

def _deep_get(d: dict, *keys: str, default: Any = None) -> Any:
    for k in keys:
        if not isinstance(d, dict):
            return default
        d = d.get(k)
    return d if d is not None else default


def _flatten(record: dict) -> dict:
    """Extract denormalized index columns from a full record dict."""
    return {
        "id": record["id"],
        "content": record.get("content", ""),
        "detail": record.get("detail", ""),
        "data": json.dumps(record, ensure_ascii=False),
        "execution_state": _deep_get(record, "operationalMetadata", "executionState"),
        "priority": _deep_get(record, "operationalMetadata", "priority"),
        "lifecycle_state": _deep_get(record, "lifecycleMetadata", "state"),
        "validation_state": _deep_get(record, "epistemicMetadata", "validationState"),
        "domain": _deep_get(record, "generalMetadata", "domain"),
        "created_at": _deep_get(record, "temporalMetadata", "createdAt"),
        "updated_at": _deep_get(record, "temporalMetadata", "updatedAt"),
        "deadline": _deep_get(record, "temporalMetadata", "deadline"),
    }


def _row_to_record(row: sqlite3.Row) -> dict:
    """Deserialize a DB row back into a full record dict."""
    return json.loads(row["data"])


# --------------------------------------------------------------------------- #
# CRUD operations
# --------------------------------------------------------------------------- #

def insert_record(conn: sqlite3.Connection, record: dict) -> dict:
    """Insert a new record and sync its relations. Returns the record."""
    flat = _flatten(record)
    conn.execute(
        """
        INSERT INTO records (
            id, content, detail, data,
            execution_state, priority, lifecycle_state, validation_state,
            domain, created_at, updated_at, deadline
        ) VALUES (
            :id, :content, :detail, :data,
            :execution_state, :priority, :lifecycle_state, :validation_state,
            :domain, :created_at, :updated_at, :deadline
        )
        """,
        flat,
    )
    _sync_relations(conn, record)
    return record


def update_record(conn: sqlite3.Connection, record_id: str, record: dict) -> dict | None:
    """Update an existing record by id. Returns the record, or ``None`` if absent."""
    flat = _flatten(record)
    flat["id"] = record_id
    cur = conn.execute(
        """
        UPDATE records SET
            content = :content,
            detail = :detail,
            data = :data,
            execution_state = :execution_state,
            priority = :priority,
            lifecycle_state = :lifecycle_state,
            validation_state = :validation_state,
            domain = :domain,
            created_at = :created_at,
            updated_at = :updated_at,
            deadline = :deadline
        WHERE id = :id
        """,
        flat,
    )
    if cur.rowcount == 0:
        return None
    _sync_relations(conn, record)
    return record


def delete_record(conn: sqlite3.Connection, record_id: str) -> bool:
    """Delete a record and its outgoing relations. Returns ``True`` if deleted."""
    conn.execute("DELETE FROM relations WHERE source_id = ?", (record_id,))
    cur = conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
    return cur.rowcount > 0


def get_record(conn: sqlite3.Connection, record_id: str) -> dict | None:
    """Return a single record dict by id, or ``None``."""
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    return _row_to_record(row) if row else None


def get_all_records(conn: sqlite3.Connection) -> list[dict]:
    """Return every record dict."""
    rows = conn.execute("SELECT * FROM records ORDER BY created_at DESC").fetchall()
    return [_row_to_record(r) for r in rows]


# --------------------------------------------------------------------------- #
# Relations
# --------------------------------------------------------------------------- #

def _sync_relations(conn: sqlite3.Connection, record: dict) -> None:
    """Replace a record's outgoing relations with the current set."""
    record_id = record["id"]
    conn.execute("DELETE FROM relations WHERE source_id = ?", (record_id,))
    for rel in record.get("relationalMetadata", []):
        target = rel.get("target") if isinstance(rel, dict) else None
        rtype = rel.get("type") if isinstance(rel, dict) else None
        if target and rtype:
            conn.execute(
                "INSERT OR IGNORE INTO relations (source_id, target_id, relation_type) "
                "VALUES (?, ?, ?)",
                (record_id, target, rtype),
            )


def get_all_relations(conn: sqlite3.Connection) -> list[dict]:
    """Return all relations as ``{source, target, type}`` dicts."""
    rows = conn.execute(
        "SELECT source_id, target_id, relation_type FROM relations"
    ).fetchall()
    return [
        {"source": r["source_id"], "target": r["target_id"], "type": r["relation_type"]}
        for r in rows
    ]


# --------------------------------------------------------------------------- #
# Stats / metadata
# --------------------------------------------------------------------------- #

def get_stats(conn: sqlite3.Connection) -> dict:
    """Aggregate counts used by the dashboard cards."""
    rows = conn.execute(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN execution_state = 'active' THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN execution_state = 'blocked' THEN 1 ELSE 0 END) AS blocked,
            SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) AS critical,
            SUM(CASE WHEN validation_state = 'speculative' THEN 1 ELSE 0 END) AS speculative
        FROM records
        """
    ).fetchone()
    return {
        "total": rows["total"] or 0,
        "active": rows["active"] or 0,
        "blocked": rows["blocked"] or 0,
        "critical": rows["critical"] or 0,
        "speculative": rows["speculative"] or 0,
    }


def get_next_id(conn: sqlite3.Connection) -> str:
    """Generate the next sequential record id ``REC-YYYY-#####``."""
    year = datetime.now(timezone.utc).year
    prefix = f"REC-{year}-"
    row = conn.execute(
        "SELECT id FROM records WHERE id LIKE ? ORDER BY id DESC LIMIT 1",
        (f"{prefix}%",),
    ).fetchone()
    if row:
        seq = int(row["id"].rsplit("-", 1)[1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:05d}"