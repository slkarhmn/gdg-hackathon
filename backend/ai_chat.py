"""
AI Chat Logic - OpenAI Integration with Context Management
Handles conversation history, context generation, and OpenAI API calls
"""

import os
import json
from datetime import datetime
from openai import OpenAI
from pathlib import Path

# Initialize OpenAI client
client = None

def initialize_openai():
    """Initialize OpenAI client with API key from environment"""
    global client
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables")
    client = OpenAI(api_key=api_key)


def get_context_file_path(user_id):
    """Get the path to the context.json file for a specific user"""
    context_dir = Path("contexts")
    context_dir.mkdir(exist_ok=True)
    return context_dir / f"context_{user_id}.json"


def load_context(user_id):
    """Load conversation context for a user"""
    context_file = get_context_file_path(user_id)
    
    if context_file.exists():
        try:
            with open(context_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            # If file is corrupted, return empty context
            return {"user_id": user_id, "context_history": [], "created_at": datetime.utcnow().isoformat()}
    else:
        # Create new context file
        context = {
            "user_id": user_id,
            "context_history": [],
            "created_at": datetime.utcnow().isoformat()
        }
        save_context(user_id, context)
        return context


def save_context(user_id, context):
    """Save conversation context for a user"""
    context_file = get_context_file_path(user_id)
    context["updated_at"] = datetime.utcnow().isoformat()
    
    with open(context_file, 'w', encoding='utf-8') as f:
        json.dump(context, f, indent=2, ensure_ascii=False)


def generate_context_summary(conversation_messages):
    """
    Generate a bullet point summary of the conversation using OpenAI
    
    Args:
        conversation_messages: List of message dicts with 'role' and 'content'
    
    Returns:
        String containing the bullet point summary
    """
    if not client:
        initialize_openai()
    
    # Create a prompt to summarize the conversation
    conversation_text = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}" 
        for msg in conversation_messages
    ])
    
    summary_prompt = f"""Please create a concise bullet point summary of the following conversation. 
Focus on key topics discussed, important information shared, and any decisions or action items.
Keep it brief - aim for 1-3 bullet points maximum.

Conversation:
{conversation_text}

Provide only the bullet point summary, nothing else."""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates concise conversation summaries."},
                {"role": "user", "content": summary_prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        summary = response.choices[0].message.content.strip()
        return summary
    
    except Exception as e:
        # Fallback summary if OpenAI call fails
        return f"• Conversation on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"


def add_context_entry(user_id, conversation_messages):
    """
    Add a new context entry (summary) to the user's context history
    
    Args:
        user_id: User ID
        conversation_messages: List of messages from the conversation to summarize
    """
    context = load_context(user_id)
    
    # Generate summary
    summary = generate_context_summary(conversation_messages)
    
    # Add to context history
    context_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "summary": summary
    }
    
    context["context_history"].append(context_entry)
    
    # Keep only the last 20 context entries to avoid file getting too large
    if len(context["context_history"]) > 20:
        context["context_history"] = context["context_history"][-20:]
    
    save_context(user_id, context)
    return context_entry


def format_context_for_prompt(user_id):
    """
    Format the context history into a string to prepend to the conversation
    
    Args:
        user_id: User ID
    
    Returns:
        String containing formatted context history
    """
    context = load_context(user_id)
    
    if not context["context_history"]:
        return ""
    
    context_text = "Previous conversation context:\n"
    for entry in context["context_history"][-10:]:  # Only use last 10 entries
        context_text += f"{entry['summary']}\n"
    
    context_text += "\n---\n\n"
    return context_text


def chat_with_ai(user_id, user_message, conversation_history=None, source=None, note_context=None):
    """
    Send a message to OpenAI and get a response, maintaining conversation context
    
    Args:
        user_id: User ID
        user_message: The user's message
        conversation_history: Optional list of previous messages in this session
        source: Optional context hint (e.g. "notes", "grades:assignment:X") for better responses
        note_context: Optional current note content when chatting from Notes view
    
    Returns:
        Dict containing the AI response and updated conversation history
    """
    if not client:
        initialize_openai()
    
    # Initialize conversation history if not provided
    if conversation_history is None:
        conversation_history = []
    
    # Get context from previous conversations
    context_prompt = format_context_for_prompt(user_id)
    
    source_hint = ""
    if source:
        source_hint = f"\n\nThe user is currently in: {source}. Use this context to tailor your response.\n"
    
    note_hint = ""
    if note_context and note_context.strip():
        note_hint = f"\n\n--- Current note content (the user is viewing this note; answer questions about it) ---\n{note_context[:4000]}\n--- End of note ---\n"
    
    # Build messages for OpenAI
    messages = [
        {
            "role": "system", 
            "content": f"""You are a helpful study assistant. You help students manage their notes, 
assignments, and study plans. Be concise, friendly, and educational.
{source_hint}{note_hint}
{context_prompt}"""
        }
    ]
    
    # Add conversation history
    messages.extend(conversation_history)
    
    # Add new user message
    messages.append({"role": "user", "content": user_message})
    
    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
        
        assistant_message = response.choices[0].message.content
        
        # Update conversation history
        conversation_history.append({"role": "user", "content": user_message})
        conversation_history.append({"role": "assistant", "content": assistant_message})
        
        return {
            "response": assistant_message,
            "conversation_history": conversation_history,
            "tokens_used": response.usage.total_tokens
        }
    
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")


def end_conversation_session(user_id, conversation_history):
    """
    End a conversation session and save a summary to context
    
    Args:
        user_id: User ID
        conversation_history: List of messages from the completed conversation
    
    Returns:
        The context entry that was created
    """
    if conversation_history and len(conversation_history) > 0:
        return add_context_entry(user_id, conversation_history)
    return None


def clear_context(user_id):
    """
    Clear all context history for a user
    
    Args:
        user_id: User ID
    """
    context = {
        "user_id": user_id,
        "context_history": [],
        "created_at": datetime.utcnow().isoformat()
    }
    save_context(user_id, context)
    return context


def get_context_stats(user_id):
    """
    Get statistics about the user's context history
    
    Args:
        user_id: User ID
    
    Returns:
        Dict with stats about the context
    """
    context = load_context(user_id)
    
    return {
        "user_id": user_id,
        "total_entries": len(context["context_history"]),
        "created_at": context.get("created_at"),
        "updated_at": context.get("updated_at"),
        "oldest_entry": context["context_history"][0]["timestamp"] if context["context_history"] else None,
        "newest_entry": context["context_history"][-1]["timestamp"] if context["context_history"] else None
    }