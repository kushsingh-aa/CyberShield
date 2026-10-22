"""Persistent storage for completed checks (SQLite), so result links survive restarts."""
import json
import sqlite3
from typing import Optional

from reports import LOCAL_DB_PATH

# Oldest checks beyond this count are pruned to keep the local database small
MAX_STORED_CHECKS = 1000


def init_checks_table():
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS checks (
                id TEXT PRIMARY KEY,
                score INTEGER,
                level TEXT,
                company TEXT,
                is_demo INTEGER DEFAULT 0,
                created_at TEXT,
                payload TEXT
            )
        """)
        # One-time migration of rows from the older score-only audit table
        has_audit = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_checks'"
        ).fetchone()
        if has_audit:
            conn.execute("""
                INSERT OR IGNORE INTO checks (id, score, level, company, is_demo, created_at, payload)
                SELECT id, score, level, NULL, 0, created_at, NULL FROM audit_checks
            """)
            conn.execute("DROP TABLE audit_checks")


init_checks_table()


def save_check(payload: dict, is_demo: bool = False) -> None:
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO checks (id, score, level, company, is_demo, created_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                payload["id"],
                payload["score"],
                payload["level"],
                payload.get("company"),
                1 if is_demo else 0,
                payload["timestamp"],
                json.dumps(payload),
            ),
        )
        conn.execute(
            "DELETE FROM checks WHERE id NOT IN (SELECT id FROM checks ORDER BY created_at DESC LIMIT ?)",
            (MAX_STORED_CHECKS,),
        )


def get_check(check_id: str) -> Optional[dict]:
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        row = conn.execute("SELECT payload FROM checks WHERE id = ?", (check_id,)).fetchone()
    if not row or not row[0]:
        return None
    return json.loads(row[0])


def list_checks(limit: int = 50) -> list[dict]:
    """Most recent real (non-demo) checks, newest first."""
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """SELECT id, score, level, company, created_at, payload FROM checks
               WHERE is_demo = 0 AND payload IS NOT NULL
               ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
    out = []
    for r in rows:
        p = json.loads(r["payload"])
        out.append({
            "id": r["id"],
            "score": r["score"],
            "level": r["level"],
            "company": r["company"],
            "sender": p.get("sender") or "",
            "url": p.get("url") or "",
            "document_name": p.get("document_name"),
            "evidence_count": p.get("evidence_count", len(p.get("evidence", []))),
            "created_at": r["created_at"],
        })
    return out


def check_stats() -> dict:
    """Counts real checks only; demo runs are excluded."""
    with sqlite3.connect(LOCAL_DB_PATH) as conn:
        total, avg = conn.execute(
            "SELECT COUNT(*), COALESCE(AVG(score), 0) FROM checks WHERE is_demo = 0"
        ).fetchone()
        high = conn.execute(
            "SELECT COUNT(*) FROM checks WHERE is_demo = 0 AND level = 'high'"
        ).fetchone()[0]
    return {"total_checks": total, "avg_risk_score": round(avg, 1), "high_risk_flagged": high}
