"""
Post-interview feedback generation using OpenAI GPT-4o.
"""
import json
import logging
import openai
from prompts.interview_prompts import FEEDBACK_PROMPT

logger = logging.getLogger(__name__)


def format_transcript_for_feedback(transcript: list[dict]) -> str:
    """Convert transcript list into readable text for the feedback prompt."""
    lines = []
    for turn in transcript:
        role = "Interviewer (AI)" if turn["role"] == "assistant" else "Candidate"
        lines.append(f"{role}: {turn['text']}")
    return "\n\n".join(lines)


async def generate_feedback(transcript: list[dict], api_key: str) -> dict:
    """Call GPT-4o to analyze the interview and return structured feedback."""
    if not transcript:
        return _empty_feedback("No transcript available to analyze.")

    transcript_text = format_transcript_for_feedback(transcript)

    # Only analyze candidate turns — skip if they barely spoke
    candidate_turns = [t for t in transcript if t["role"] == "user"]
    if len(candidate_turns) < 2:
        return _empty_feedback("Interview was too short to evaluate.")

    try:
        client = openai.AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": FEEDBACK_PROMPT + transcript_text
                }
            ],
            temperature=0.4,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )

        raw = response.choices[0].message.content
        feedback = json.loads(raw)
        logger.info("Feedback generated successfully")
        return feedback

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse feedback JSON: {e}")
        return _empty_feedback("Failed to parse AI feedback.")
    except Exception as e:
        logger.error(f"Feedback generation error: {e}")
        return _empty_feedback(f"Error generating feedback: {str(e)}")


def _empty_feedback(reason: str) -> dict:
    return {
        "overall_score": 0,
        "summary": reason,
        "categories": {},
        "strengths": [],
        "improvements": [],
        "hiring_recommendation": "N/A"
    }
