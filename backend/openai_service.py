import os
import json
import re
from typing import Any, Optional
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are StudyBot, an AI study planner for university students.

Your job:
1. Help students create personalized study plans based on their modules, deadlines, and preferences
2. Parse uploaded files (syllabus, assignment lists) to extract key info
3. Ask clarifying questions about study preferences (study days, hours per day, break preferences)
4. Generate a structured JSON study plan in the specified format

Guidelines:
- Be friendly, concise, and encouraging
- Ask ONE preference question at a time
- When you have enough info (modules, deadlines, preferences), generate the plan
- Always output the final plan as a JSON code block starting with ```json

Example flow:
User: "Help me create a study plan"
You: "I'd be happy to help! Please upload your syllabus or assignment list, and I'll extract your modules and deadlines."

[After files uploaded]
You: "Great! I found 3 modules: AI Fundamentals, Data Structures, Web Dev. 
First question: Which days of the week do you prefer to study? (e.g., Mon-Fri, or Mon/Wed/Fri/Sun)"

[After preferences collected]
You: "Perfect! Here's your personalized study plan:
```json
{
  "metadata": { ... },
  "inputs": { ... },
  "plan": [ ... ]
}
```

Would you like me to adjust anything?"
"""


def chat(messages: list[dict[str, str]]) -> str:
    """
    Send messages to GPT-4 and return the assistant's reply.
    """
    response = client.chat.completions.create(
        model="gpt-4o",  # Use GPT-4 Turbo with vision
        messages=messages,
        temperature=0.7,
        max_tokens=2000,
    )
    return response.choices[0].message.content or ""



def parse_uploaded_files(file_data_list: list[dict[str, Any]]) -> str:
    """
    Parse uploaded files (images/PDFs as base64) using GPT-4 Vision.
    
    Args:
        file_data_list: List of dicts with {type: "image" or "pdf", base64: "...", filename: "..."}
    
    Returns:
        Extracted text describing modules, deadlines, topics
    """
    if not file_data_list:
        return ""
    
    content = [
        {
            "type": "text",
            "text": """Extract the following from these course materials:
1. Module/Subject names
2. Assignment deadlines (with dates)
3. Key topics/chapters to study
4. Any exam dates

Format as a clear bullet list."""
        }
    ]
    
    for file_data in file_data_list:
        if file_data["type"] == "image":
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{file_data['base64']}"
                }
            })
    
    messages = [
        {"role": "system", "content": "You are a document parser. Extract course info from uploaded images."},
        {"role": "user", "content": content}
    ]
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=1500,
    )
    
    return response.choices[0].message.content or ""


def generate_study_plan_json(
    modules: list[dict],
    deadlines: list[dict],
    preferences: dict,
    timezone: str = "Asia/Dubai"
) -> dict:
    """
    Generate a structured study plan JSON using GPT-4.
    
    Args:
        modules: [{"moduleId": "CS101", "name": "AI Fundamentals"}, ...]
        deadlines: [{"title": "Assignment 1", "dueAt": "2026-02-06T23:59:00+04:00", "moduleId": "CS101"}, ...]
        preferences: {
            "studyDays": ["Mon", "Tue", ...],
            "dailyStart": "18:00",
            "dailyEnd": "22:00",
            "breakRule": {"everyMinutes": 50, "breakMinutes": 10},
            "maxSessionMinutes": 90
        }
        timezone: IANA timezone string
    
    Returns:
        Full study plan JSON matching your schema
    """
    prompt = f"""Generate a study plan JSON with this EXACT structure:

{{
  "metadata": {{
    "timezone": "{timezone}",
    "generatedAt": "<ISO8601 timestamp>",
    "weekStart": "<ISO8601 date of next Monday>"
  }},
  "inputs": {{
    "modules": {json.dumps(modules)},
    "deadlines": {json.dumps(deadlines)},
    "preferences": {json.dumps(preferences)}
  }},
  "plan": [
    {{
      "title": "CS101 - Read Module 2 Notes",
      "type": "study",
      "moduleId": "CS101",
      "start": "2026-02-02T18:00:00+04:00",
      "end": "2026-02-02T18:50:00+04:00",
      "resources": [
        {{"label": "Module 2 Slides", "url": "https://..."}}
      ]
    }},
    {{
      "title": "Break",
      "type": "break",
      "start": "2026-02-02T18:50:00+04:00",
      "end": "2026-02-02T19:00:00+04:00"
    }}
  ],
  "summary": {{"totalStudyMinutes": 240, "totalBreakMinutes": 40}}
}}

Rules:
1. Schedule study sessions ONLY on the days in studyDays
2. All sessions between dailyStart and dailyEnd
3. Insert breaks according to breakRule (e.g., 10min break every 50min)
4. Prioritize modules with nearest deadlines
5. Include "resources" array for each study session (even if empty)
6. Plan for the next 2 weeks
7. Use the timezone offset (+04:00 for Dubai)

Output ONLY the JSON, no explanation."""

    messages = [
        {"role": "system", "content": "You are a study plan generator. Output valid JSON only."},
        {"role": "user", "content": prompt}
    ]
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.3,
        max_tokens=3000,
    )
    
    reply = response.choices[0].message.content or "{}"
    
    json_match = re.search(r'```json\s*(.*?)\s*```', reply, re.DOTALL)
    if json_match:
        reply = json_match.group(1)
    
    try:
        return json.loads(reply)
    except json.JSONDecodeError:
        return {
            "metadata": {"timezone": timezone, "generatedAt": "", "weekStart": ""},
            "inputs": {"modules": modules, "deadlines": deadlines, "preferences": preferences},
            "plan": [],
            "summary": {"totalStudyMinutes": 0, "totalBreakMinutes": 0}
        }


def build_context_message(assignments: list[dict], existing_plan: Optional[dict] = None) -> str:
    """Build a context message from assignments to inject into conversation."""
    if not assignments:
        return "The student hasn't uploaded any assignments yet."
    
    context = "Student's current assignments:\n"
    for a in assignments[:10]:  # Limit to 10 for brevity
        context += f"- {a.get('name', 'Untitled')} (due: {a.get('due_date', 'unknown')})\n"
    
    if existing_plan:
        context += f"\nExisting plan: {json.dumps(existing_plan, indent=2)[:500]}..."
    
    return context


def extract_json_plan(assistant_reply: str) -> Optional[dict]:
    """
    Extract JSON study plan from assistant's message if present.
    Returns None if no valid JSON found.
    """
    json_match = re.search(r'```json\s*(.*?)\s*```', assistant_reply, re.DOTALL)
    
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    try:
        return json.loads(assistant_reply)
    except json.JSONDecodeError:
        return None