"""
Simple SQLite database for storing interview sessions and transcripts.
"""
import json
import logging
import aiosqlite
from datetime import datetime

logger = logging.getLogger(__name__)
DB_PATH = "interviews.db"


async def init_db():
    """Create tables if they don't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                room_name TEXT NOT NULL,
                resume_text TEXT DEFAULT '',
                transcript TEXT DEFAULT '[]',
                feedback TEXT DEFAULT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT DEFAULT NULL,
                status TEXT DEFAULT 'active'
            )
        """)
        await db.commit()
    logger.info("Database initialized")


async def create_session(session_id: str, room_name: str, resume_text: str = ""):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO sessions (id, room_name, resume_text, started_at) VALUES (?, ?, ?, ?)",
            (session_id, room_name, resume_text, datetime.utcnow().isoformat())
        )
        await db.commit()


async def append_transcript_turn(session_id: str, role: str, text: str):
    """Append a single conversation turn to the transcript."""
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT transcript FROM sessions WHERE id = ?", (session_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            return
        transcript = json.loads(row[0] or "[]")
        transcript.append({
            "role": role,
            "text": text,
            "timestamp": datetime.utcnow().isoformat()
        })
        await db.execute(
            "UPDATE sessions SET transcript = ? WHERE id = ?",
            (json.dumps(transcript), session_id)
        )
        await db.commit()


async def get_session(session_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)) as cur:
            row = await cur.fetchone()
    if not row:
        return None
    data = dict(row)
    data["transcript"] = json.loads(data.get("transcript") or "[]")
    data["feedback"] = json.loads(data["feedback"]) if data.get("feedback") else None
    return data


async def save_feedback(session_id: str, feedback: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sessions SET feedback = ?, ended_at = ?, status = 'completed' WHERE id = ?",
            (json.dumps(feedback), datetime.utcnow().isoformat(), session_id)
        )
        await db.commit()


async def end_session(session_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE sessions SET ended_at = ?, status = 'completed' WHERE id = ?",
            (datetime.utcnow().isoformat(), session_id)
        )
        await db.commit()


async def get_all_sessions() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, room_name, started_at, ended_at, status FROM sessions ORDER BY started_at DESC LIMIT 20"
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]
