"""
Microsoft Graph API Configuration
Handles authentication and API configuration for Teams integration
"""

import os
from typing import Dict, Any

class MicrosoftConfig:
    """Configuration for Microsoft Graph API"""

    CLIENT_ID = os.getenv('MICROSOFT_CLIENT_ID', 'YOUR_CLIENT_ID_HERE')
    CLIENT_SECRET = os.getenv('MICROSOFT_CLIENT_SECRET', 'YOUR_CLIENT_SECRET_HERE')
    TENANT_ID = os.getenv('MICROSOFT_TENANT_ID', 'YOUR_TENANT_ID_HERE')
    
    REDIRECT_URI = os.getenv('REDIRECT_URI', 'http://localhost:5173/auth/callback')
    
    AUTHORITY = f'https://login.microsoftonline.com/{TENANT_ID}'
    GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0'
    
    SCOPES = [
        'User.Read',              # Basic user profile
        'User.ReadBasic.All',     # Read other users' basic profiles
        'Chat.ReadWrite',         # Read and write chat messages (for Teams Get Help)
        'ChatMessage.Send',       # Send chat messages (for Teams Get Help)
        'Presence.Read',          # Read user presence (online/offline status)
        'Team.ReadBasic.All',     # Read basic team info
        'Channel.ReadBasic.All',  # Read basic channel info
        'Calendars.ReadWrite',    # Read and write calendar events
        'Tasks.ReadWrite',        # Read and write To Do tasks
        'Tasks.ReadWrite.Shared', # Read and write shared To Do tasks
        'Mail.Read',              # Read emails (optional)
    ]
    
    @staticmethod
    def get_msal_config() -> Dict[str, Any]:
        """Get MSAL configuration for authentication"""
        return {
            'client_id': MicrosoftConfig.CLIENT_ID,
            'client_secret': MicrosoftConfig.CLIENT_SECRET,
            'authority': MicrosoftConfig.AUTHORITY,
            'redirect_uri': MicrosoftConfig.REDIRECT_URI,
            'scopes': MicrosoftConfig.SCOPES
        }
    
    @staticmethod
    def validate_config() -> bool:
        """Validate that all required configuration is present"""
        required_vars = ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID']
        for var in required_vars:
            value = getattr(MicrosoftConfig, var)
            if not value or value.startswith('YOUR_'):
                print(f"❌ Missing or invalid configuration: {var}")
                return False
        return True