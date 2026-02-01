"""
OpenAI service for Study-Helper — study-plan generation via chat.
All prompt engineering and GPT interaction lives here.
Routes stay thin; they just call into this module.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Any

from openai import OpenAI

# ---------------------------------------------------------------------------
# Client — initialised once at import time.  The key is read from the .env
# file via python-dotenv (loaded in app.py before any route is hit).
# ---------------------------------------------------------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MODEL = "gpt-4o-mini"          # cheap, fast, good enough for structured JSON
MAX_TOKENS = 2048              # plenty for a weekly study-plan JSON blob


# ---------------------------------------------------------------------------
# System prompt — injected into every chat call.  It is deliberately
# narrow: the bot only does study-plan work and declines everything else.
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are StudyBot, an AI study-plan assistant embedded inside a student study-management app.

Your ONLY job is to help students create, refine, and discuss personalised study plans.

Rules:
1. ONLY respond to questions about study plans, scheduling, study strategies, or academic preparation.
2. If the user asks about anything unrelated (casual chat, homework solutions, coding help, etc.), politely decline and redirect them to study-plan topics.
3. When generating a study plan, ALWAYS return a valid JSON object wrapped in ```json ... ``` code fences — nothing else outside those fences.
4. When the user is just chatting about their study needs (not yet ready for a plan), respond in plain conversational text — no JSON.
5. Be encouraging, concise, and structured.

JSON schema for a study plan (use EXACTLY this shape):
{
  "plan_name": "string — short descriptive title",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "daily_hours": number,
  "subjects": [
    {
      "name": "string",
      "topics": ["string", ...],
      "hours_per_week": number,
      "priority": "high" | "medium" | "low"
    }
  ],
  "weekly_schedule": {
    "Monday":    [{ "time": "HH:MM", "subject": "string", "duration_minutes": number, "activity": "string" }],
    "Tuesday":   [...],
    "Wednesday": [...],
    "Thursday":  [...],
    "Friday":    [...],
    "Saturday":  [...],
    "Sunday":    [...]
  },
  "tips": ["string", ...]
}
"""


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def build_context_message(assignments: list[dict[str, Any]], existing_plan: dict | None) -> str:
    """
    Turns the current assignment list (and optional existing plan) into a
    context string we prepend to the first user message so GPT knows what's
    already on the student's plate.
    """
    parts: list[str] = []

    if assignments:
        parts.append("=== Current Assignments ===")
        for a in assignments:
            due = a.get("due_date", "unknown")
            parts.append(f"- {a.get('name', 'Untitled')} | Subject: {a.get('tags', ['General'])} | Due: {due} | Status: {a.get('status', 'pending')}")

    if existing_plan:
        parts.append("\n=== Existing Study Plan ===")
        parts.append(json.dumps(existing_plan, indent=2))

    parts.append(f"\n=== Today's Date ===\n{datetime.utcnow().strftime('%Y-%m-%d')}")

    return "\n".join(parts)


def chat(messages: list[dict[str, str]]) -> str:
    """
    Send a conversation (list of {role, content} dicts) to GPT and return
    the assistant's reply as plain text.

    Raises on API errors — the route layer catches and returns 500.
    """
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        messages=messages,
        temperature=0.7,
    )
    return response.choices[0].message.content


def extract_json_plan(text: str) -> dict | None:
    """
    If the assistant's reply contains a ```json … ``` block, extract and
    parse it.  Returns None if no JSON block is present (i.e. the reply was
    conversational, not a finished plan).
    """
    start_marker = "```json"
    end_marker = "```"

    start = text.find(start_marker)
    if start == -1:
        return None

    start += len(start_marker)
    end = text.find(end_marker, start)
    if end == -1:
        return None

    json_str = text[start:end].strip()
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return None