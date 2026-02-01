"""
Example Usage - AI Chat API Integration
This script demonstrates how to use the AI chat endpoints
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:5000/api"
USER_ID = 1  # Replace with your test user ID

def create_test_user():
    """Create a test user if needed"""
    url = f"{BASE_URL}/users"
    payload = {
        "microsoft_id": "test_user_123",
        "email": "test@example.com",
        "display_name": "Test User"
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 201:
            print(f"✓ Created test user: {response.json()}")
            return response.json()['id']
        elif response.status_code == 409:
            print("ℹ User already exists")
            return USER_ID
    except Exception as e:
        print(f"✗ Error creating user: {e}")
        return USER_ID


def send_chat_message(user_id, message, conversation_history=None):
    """Send a message to the AI assistant"""
    url = f"{BASE_URL}/chat/user/{user_id}/message"
    payload = {
        "message": message,
        "conversation_history": conversation_history or []
    }
    
    print(f"\n📤 Sending: {message}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print(f"🤖 AI Response: {data['response']}")
        print(f"   Tokens used: {data['tokens_used']}")
        
        return data
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Error: {e}")
        if hasattr(e.response, 'text'):
            print(f"   Response: {e.response.text}")
        return None


def end_chat_session(user_id, conversation_history):
    """End a chat session and save the context"""
    url = f"{BASE_URL}/chat/user/{user_id}/session/end"
    payload = {
        "conversation_history": conversation_history
    }
    
    print(f"\n💾 Ending session and saving context...")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print(f"✓ {data['message']}")
        if 'context_entry' in data:
            print(f"   Summary: {data['context_entry']['summary']}")
        
        return data
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Error: {e}")
        return None


def get_context(user_id):
    """Get the full context history"""
    url = f"{BASE_URL}/chat/user/{user_id}/context"
    
    print(f"\n📋 Fetching context history...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        data = response.json()
        print(f"✓ Found {len(data['context_history'])} context entries:")
        
        for i, entry in enumerate(data['context_history'], 1):
            print(f"   {i}. [{entry['timestamp']}]")
            print(f"      {entry['summary']}")
        
        return data
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Error: {e}")
        return None


def get_context_stats(user_id):
    """Get context statistics"""
    url = f"{BASE_URL}/chat/user/{user_id}/context/stats"
    
    print(f"\n📊 Fetching context stats...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        data = response.json()
        print(f"✓ Context Statistics:")
        print(f"   Total entries: {data['total_entries']}")
        print(f"   Created: {data['created_at']}")
        print(f"   Updated: {data['updated_at']}")
        
        return data
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Error: {e}")
        return None


def clear_context(user_id):
    """Clear all context history"""
    url = f"{BASE_URL}/chat/user/{user_id}/context"
    
    print(f"\n🗑️  Clearing context history...")
    
    try:
        response = requests.delete(url)
        response.raise_for_status()
        
        data = response.json()
        print(f"✓ {data['message']}")
        
        return data
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Error: {e}")
        return None


def example_conversation_1(user_id):
    """Example: Simple conversation about study tips"""
    print("\n" + "="*60)
    print("EXAMPLE 1: Study Tips Conversation")
    print("="*60)
    
    conversation_history = []
    
    # Message 1
    result = send_chat_message(user_id, "I'm struggling to stay focused while studying. Any tips?")
    if result:
        conversation_history = result['conversation_history']
    
    time.sleep(1)
    
    # Message 2
    result = send_chat_message(
        user_id, 
        "What about the Pomodoro technique? How does that work?",
        conversation_history
    )
    if result:
        conversation_history = result['conversation_history']
    
    time.sleep(1)
    
    # Message 3
    result = send_chat_message(
        user_id,
        "Great! I'll try 25-minute sessions. Thanks!",
        conversation_history
    )
    if result:
        conversation_history = result['conversation_history']
    
    # End session
    end_chat_session(user_id, conversation_history)


def example_conversation_2(user_id):
    """Example: Conversation about note organization"""
    print("\n" + "="*60)
    print("EXAMPLE 2: Note Organization Conversation")
    print("="*60)
    
    conversation_history = []
    
    # Message 1
    result = send_chat_message(user_id, "How should I organize my notes for biology class?")
    if result:
        conversation_history = result['conversation_history']
    
    time.sleep(1)
    
    # Message 2
    result = send_chat_message(
        user_id,
        "Should I use tags or folders?",
        conversation_history
    )
    if result:
        conversation_history = result['conversation_history']
    
    # End session
    end_chat_session(user_id, conversation_history)


def example_with_context(user_id):
    """Example: New conversation with context from previous ones"""
    print("\n" + "="*60)
    print("EXAMPLE 3: Conversation with Previous Context")
    print("="*60)
    
    # This conversation should reference the previous conversations
    result = send_chat_message(
        user_id,
        "I tried the Pomodoro technique you mentioned. It worked great! Now I need help with flashcards."
    )
    
    # The AI should remember the context from previous sessions


def main():
    """Run example usage scenarios"""
    print("\n" + "="*60)
    print("AI CHAT API - EXAMPLE USAGE")
    print("="*60)
    
    # Create or get test user
    user_id = create_test_user()
    
    # Clear any existing context for a fresh start
    clear_context(user_id)
    
    # Run example conversations
    example_conversation_1(user_id)
    
    # Small delay between conversations
    time.sleep(2)
    
    example_conversation_2(user_id)
    
    # Check context
    get_context(user_id)
    get_context_stats(user_id)
    
    # Small delay
    time.sleep(2)
    
    # Have a conversation that uses previous context
    example_with_context(user_id)
    
    # Final context check
    print("\n" + "="*60)
    print("FINAL CONTEXT STATE")
    print("="*60)
    get_context(user_id)
    get_context_stats(user_id)
    
    print("\n" + "="*60)
    print("EXAMPLES COMPLETE!")
    print("="*60)


if __name__ == "__main__":
    main()