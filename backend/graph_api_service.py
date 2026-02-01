"""
Microsoft Graph API Service
Handles all Microsoft Teams and To Do API calls
"""

import requests
from typing import Dict, List, Optional, Any
from datetime import datetime
from microsoft_config import MicrosoftConfig


class GraphAPIService:
    """Service class for Microsoft Graph API operations"""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        self.base_url = MicrosoftConfig.GRAPH_API_ENDPOINT
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make HTTP request to Graph API"""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method == 'PATCH':
                response = requests.patch(url, headers=self.headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            
            # Handle empty responses (like DELETE)
            if response.status_code == 204:
                return {'success': True}
            
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print(f"Graph API Error: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            raise
    
    # =============================================================================
    # USER METHODS
    # =============================================================================
    
    def get_user_profile(self) -> Dict:
        """Get current user's profile"""
        return self._make_request('GET', 'me')
    
    def get_user_presence(self, user_id: str) -> Dict:
        """Get user's presence status (online/offline/busy)"""
        return self._make_request('GET', f'users/{user_id}/presence')
    
    # =============================================================================
    # TEAMS CHAT METHODS (for Get Help feature)
    # =============================================================================
    
    def get_chats(self) -> List[Dict]:
        """Get all chats for the current user"""
        result = self._make_request('GET', 'me/chats')
        return result.get('value', [])
    
    def get_chat_messages(self, chat_id: str, limit: int = 50) -> List[Dict]:
        """Get messages from a specific chat"""
        endpoint = f'me/chats/{chat_id}/messages?$top={limit}&$orderby=createdDateTime desc'
        result = self._make_request('GET', endpoint)
        return result.get('value', [])
    
    def send_chat_message(self, chat_id: str, message: str) -> Dict:
        """Send a message to a chat"""
        data = {
            'body': {
                'content': message,
                'contentType': 'text'
            }
        }
        return self._make_request('POST', f'me/chats/{chat_id}/messages', data)
    
    def create_chat(self, user_ids: List[str], message: str = None) -> Dict:
        """Create a new one-on-one chat with a user"""
        data = {
            'chatType': 'oneOnOne',
            'members': [
                {
                    '@odata.type': '#microsoft.graph.aadUserConversationMember',
                    'roles': ['owner'],
                    'user@odata.bind': f"https://graph.microsoft.com/v1.0/users('{user_id}')"
                }
                for user_id in user_ids
            ]
        }
        
        chat = self._make_request('POST', 'chats', data)
        
        # Send initial message if provided
        if message and 'id' in chat:
            self.send_chat_message(chat['id'], message)
        
        return chat
    
    def get_teams(self) -> List[Dict]:
        """Get all teams the user is a member of"""
        result = self._make_request('GET', 'me/joinedTeams')
        return result.get('value', [])
    
    def get_team_members(self, team_id: str) -> List[Dict]:
        """Get members of a specific team"""
        result = self._make_request('GET', f'teams/{team_id}/members')
        return result.get('value', [])
    
    def search_users(self, search_query: str) -> List[Dict]:
        """Search for users (e.g., professors)"""
        endpoint = f"users?$filter=startswith(displayName,'{search_query}') or startswith(mail,'{search_query}')&$top=10"
        result = self._make_request('GET', endpoint)
        return result.get('value', [])
    
    # =============================================================================
    # TO DO METHODS
    # =============================================================================
    
    def get_todo_lists(self) -> List[Dict]:
        """Get all To Do task lists"""
        result = self._make_request('GET', 'me/todo/lists')
        return result.get('value', [])
    
    def create_todo_list(self, name: str) -> Dict:
        """Create a new To Do list"""
        data = {'displayName': name}
        return self._make_request('POST', 'me/todo/lists', data)
    
    def get_tasks(self, list_id: str) -> List[Dict]:
        """Get all tasks from a specific list"""
        result = self._make_request('GET', f'me/todo/lists/{list_id}/tasks')
        return result.get('value', [])
    
    def create_task(self, list_id: str, task_data: Dict) -> Dict:
        """Create a new task in a list
        
        Args:
            list_id: The list ID to add task to
            task_data: Dictionary with task info:
                - title: str (required)
                - body: str (optional)
                - dueDateTime: str (optional, ISO format)
                - reminderDateTime: str (optional, ISO format)
                - importance: str (optional, 'low', 'normal', 'high')
                - isReminderOn: bool (optional)
        """
        data = {'title': task_data['title']}
        
        if 'body' in task_data:
            data['body'] = {'content': task_data['body'], 'contentType': 'text'}
        
        if 'dueDateTime' in task_data:
            data['dueDateTime'] = {
                'dateTime': task_data['dueDateTime'],
                'timeZone': 'UTC'
            }
        
        if 'reminderDateTime' in task_data:
            data['reminderDateTime'] = {
                'dateTime': task_data['reminderDateTime'],
                'timeZone': 'UTC'
            }
        
        if 'importance' in task_data:
            data['importance'] = task_data['importance']
        
        if 'isReminderOn' in task_data:
            data['isReminderOn'] = task_data['isReminderOn']
        
        return self._make_request('POST', f'me/todo/lists/{list_id}/tasks', data)
    
    def update_task(self, list_id: str, task_id: str, updates: Dict) -> Dict:
        """Update a task"""
        return self._make_request('PATCH', f'me/todo/lists/{list_id}/tasks/{task_id}', updates)
    
    def complete_task(self, list_id: str, task_id: str) -> Dict:
        """Mark a task as complete"""
        updates = {'status': 'completed'}
        return self.update_task(list_id, task_id, updates)
    
    def delete_task(self, list_id: str, task_id: str) -> Dict:
        """Delete a task"""
        return self._make_request('DELETE', f'me/todo/lists/{list_id}/tasks/{task_id}')


class TokenManager:
    """Manages access token refresh and storage"""
    
    @staticmethod
    def get_token_from_code(auth_code: str) -> Dict:
        """Exchange authorization code for access token"""
        import msal
        
        msal_app = msal.ConfidentialClientApplication(
            MicrosoftConfig.CLIENT_ID,
            authority=MicrosoftConfig.AUTHORITY,
            client_credential=MicrosoftConfig.CLIENT_SECRET
        )
        
        result = msal_app.acquire_token_by_authorization_code(
            auth_code,
            scopes=MicrosoftConfig.SCOPES,
            redirect_uri=MicrosoftConfig.REDIRECT_URI
        )
        
        if 'access_token' in result:
            return {
                'access_token': result['access_token'],
                'refresh_token': result.get('refresh_token'),
                'expires_in': result.get('expires_in'),
                'token_type': result.get('token_type')
            }
        else:
            raise Exception(f"Failed to acquire token: {result.get('error_description')}")
    
    @staticmethod
    def refresh_token(refresh_token: str) -> Dict:
        """Refresh an expired access token"""
        import msal
        
        msal_app = msal.ConfidentialClientApplication(
            MicrosoftConfig.CLIENT_ID,
            authority=MicrosoftConfig.AUTHORITY,
            client_credential=MicrosoftConfig.CLIENT_SECRET
        )
        
        result = msal_app.acquire_token_by_refresh_token(
            refresh_token,
            scopes=MicrosoftConfig.SCOPES
        )
        
        if 'access_token' in result:
            return {
                'access_token': result['access_token'],
                'refresh_token': result.get('refresh_token'),
                'expires_in': result.get('expires_in')
            }
        else:
            raise Exception(f"Failed to refresh token: {result.get('error_description')}")
