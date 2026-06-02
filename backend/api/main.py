"""
FastAPI backend — handles:
- Resume upload
- LiveKit token generation
- Session management
- Feedback generation
"""
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# livekit-api is a separate pip package: pip install livekit-api
from livekit import api as lk_api

from services.database import (
    append_transcript_turn,
    create_session,
    end_session,
    get_all_sessions,
    get_session,
    init_db,
    save_feedback,
)
from services.feedback import generate_feedback
from services.resume_parser import clean_resume_text, extract_text_from_pdf

# ── Config ────────────────────────────────────────────────────────────────────
LIVEKIT_URL        = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY    = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY", "")
FRONTEND_URL       = os.getenv("FRONTEND_URL", "http://localhost:5173")

logger = logging.getLogger("pm-api")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="PM Interview Bot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    candidate_name: str = "Candidate"
    session_id: str | None = None


class EndInterviewRequest(BaseModel):
    session_id: str


class TranscriptTurnRequest(BaseModel):
    session_id: str
    role: str
    text: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "pm-interview-bot"}


@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload a PDF resume and return extracted text."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    raw_text = extract_text_from_pdf(file_bytes)
    clean_text = clean_resume_text(raw_text)

    if not clean_text:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    return {
        "success": True,
        "resume_text": clean_text,
        "char_count": len(clean_text),
        "preview": clean_text[:300] + "..." if len(clean_text) > 300 else clean_text,
    }


@app.post("/api/prepare-session")
async def prepare_session(body: dict):
    """Pre-create a session with resume text before starting the interview."""
    session_id = str(uuid.uuid4())
    resume_text = body.get("resume_text", "")
    room_name = f"interview-{session_id}"
    await create_session(session_id, room_name, resume_text)
    return {"session_id": session_id}


@app.post("/api/start-interview")
async def start_interview(body: StartInterviewRequest):
    """Create a LiveKit room + token for the candidate."""
    session_id = body.session_id or str(uuid.uuid4())
    room_name = f"interview-{session_id}"

    session = await get_session(session_id)
    resume_text = session["resume_text"] if session else ""

    # ── Generate LiveKit JWT token (chained API) ───────────────────────────
    jwt_token = (
        lk_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(f"candidate-{body.candidate_name}")
        .with_name(body.candidate_name)
        .with_grants(lk_api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        ))
        .to_jwt()
    )

    # ── Upsert DB session ─────────────────────────────────────────────────
    if not session:
        await create_session(session_id, room_name, resume_text)

    # ── Room metadata (agent reads this to personalize interview) ─────────
    room_metadata = json.dumps({
        "session_id": session_id,
        "resume_text": resume_text,
        "candidate_name": body.candidate_name,
    })

    # ── Create LiveKit room with metadata ─────────────────────────────────
    try:
        lk_client = lk_api.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        await lk_client.room.create_room(
            lk_api.CreateRoomRequest(
                name=room_name,
                metadata=room_metadata,
                max_participants=5,
                empty_timeout=300,
            )
        )
        await lk_client.aclose()
    except Exception as e:
        logger.warning(f"Room creation warning (may already exist): {e}")

    logger.info(f"Interview started: session={session_id}, room={room_name}")

    return {
        "session_id": session_id,
        "room_name": room_name,
        "livekit_url": LIVEKIT_URL,
        "token": jwt_token,
    }


@app.post("/api/transcript/turn")
async def add_transcript_turn(body: TranscriptTurnRequest):
    await append_transcript_turn(body.session_id, body.role, body.text)
    return {"success": True}


@app.post("/api/end-interview")
async def end_interview(body: EndInterviewRequest):
    """End the interview and trigger feedback generation."""
    session = await get_session(body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await end_session(body.session_id)
    feedback = await generate_feedback(session["transcript"], OPENAI_API_KEY)
    await save_feedback(body.session_id, feedback)

    logger.info(f"Interview ended: session={body.session_id}")
    return {"success": True, "feedback": feedback}


@app.get("/api/session/{session_id}")
async def get_session_data(session_id: str):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.get("/api/sessions")
async def list_sessions():
    sessions = await get_all_sessions()
    return {"sessions": sessions}
