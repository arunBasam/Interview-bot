"""
LiveKit Agent — The AI PM Interviewer.
Uses livekit-agents >= 1.0 with standard STT + LLM + TTS pipeline.
Works on ANY OpenAI tier (no Realtime API needed).

Run with:
    python agent/interviewer_agent.py dev
"""
import asyncio
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import openai as lk_openai, silero

from prompts.interview_prompts import build_system_prompt
from services.database import append_transcript_turn

logger = logging.getLogger("pm-interviewer")
logging.basicConfig(level=logging.INFO)


class PMInterviewer(Agent):
    """The AI PM Interviewer agent."""

    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)

    async def on_enter(self) -> None:
        """Kick off with the opening greeting as soon as agent joins."""
        await self.session.generate_reply(
            instructions="Start the interview with your opening greeting."
        )


async def broadcast_transcript(room: rtc.Room, role: str, text: str):
    """Send a transcript turn to the frontend via LiveKit data channel."""
    try:
        payload = json.dumps({
            "type": "transcript_turn",
            "role": role,
            "text": text,
        }).encode("utf-8")
        await room.local_participant.publish_data(payload, reliable=True)
    except Exception as e:
        logger.warning(f"Failed to broadcast transcript: {e}")


async def entrypoint(ctx: JobContext):
    """Called for each new interview room/job."""
    logger.info(f"Agent joining room: {ctx.room.name}")

    # ── Pull resume context + session ID from room metadata ────────────────
    resume_text = ""
    session_id = ctx.room.name

    try:
        metadata = ctx.room.metadata
        if metadata:
            meta = json.loads(metadata)
            resume_text = meta.get("resume_text", "")
            session_id = meta.get("session_id", ctx.room.name)
    except Exception as e:
        logger.warning(f"Could not parse room metadata: {e}")

    # ── Build personalized system prompt ───────────────────────────────────
    system_prompt = build_system_prompt(resume_text)

    # ── Connect to the room ────────────────────────────────────────────────
    await ctx.connect()
    logger.info(f"Connected to room: {ctx.room.name}")

    # ── Create AgentSession: STT → LLM → TTS pipeline ─────────────────────
    # Uses standard OpenAI APIs — works on all tiers, no Realtime API needed
    session = AgentSession(
        vad=silero.VAD.load(),                          # Voice activity detection
        stt=lk_openai.STT(model="whisper-1"),           # Speech → Text (Whisper)
        llm=lk_openai.LLM(model="gpt-4o"),             # Text → Text (GPT-4o)
        tts=lk_openai.TTS(                             # Text → Speech
            model="tts-1",
            voice="alloy",   # alloy | echo | fable | onyx | nova | shimmer
        ),
    )

    # ── Capture transcript + broadcast to frontend ─────────────────────────
    @session.on("conversation_item_added")
    def on_item_added(ev):
        item = ev.item
        try:
            role = item.role  # "user" or "assistant"
            text = ""

            if hasattr(item, "content") and item.content:
                for part in item.content:
                    if hasattr(part, "text") and part.text:
                        text += part.text
                    elif hasattr(part, "transcript") and part.transcript:
                        text += part.transcript

            if text:
                logger.info(f"[{role}]: {text[:80]}...")
                if session_id:
                    asyncio.create_task(
                        append_transcript_turn(session_id, role, text)
                    )
                asyncio.create_task(
                    broadcast_transcript(ctx.room, role, text)
                )
        except Exception as e:
            logger.warning(f"Transcript capture error: {e}")

    # ── Start the agent ────────────────────────────────────────────────────
    await session.start(
        room=ctx.room,
        agent=PMInterviewer(instructions=system_prompt),
    )

    logger.info(f"AI Interviewer is live in room: {ctx.room.name}")

    # Keep alive for max 30 minutes
    await asyncio.sleep(1800)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))