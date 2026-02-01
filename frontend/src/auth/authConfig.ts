// Microsoft Authentication Library (MSAL) Configuration

export const msalConfig = {
  auth: {
    clientId: 'ff9576c4-9809-4240-88ce-b8d40898cf8a',
    authority: 'https://login.microsoftonline.com/common',    
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

// Scopes you need for Microsoft Teams, To Do, Calendar integration
export const loginRequest = {
  scopes: [
    'User.Read',              // Basic user profile
    'User.ReadBasic.All',     // Read other users' basic profiles
    'Chat.ReadWrite',         // Read and write chat messages ✅ REQUIRED for Teams
    'ChatMessage.Send',       // Send chat messages ✅ REQUIRED for Teams
    'Presence.Read',          // Read user presence (online/offline status)
    'Team.ReadBasic.All',     // Read basic team info
    'Channel.ReadBasic.All',  // Read basic channel info
    'Calendars.ReadWrite',    // Read and write calendar events
    'Tasks.ReadWrite',        // Read and write To Do tasks
    'Mail.Read',              // Read emails (optional)
  ],
  prompt: 'consent' as const, // ⭐ Force consent screen to show all permissions
};

// Microsoft Graph API endpoints
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphTasksEndpoint: 'https://graph.microsoft.com/v1.0/me/todo/lists',
  graphCalendarEndpoint: 'https://graph.microsoft.com/v1.0/me/calendar/events',
  graphMailEndpoint: 'https://graph.microsoft.com/v1.0/me/messages',
};

// Additional scopes that can be requested later
export const graphScopes = {
  calendar: ['Calendars.ReadWrite'],
  tasks: ['Tasks.ReadWrite', 'Tasks.ReadWrite.Shared'],
  teams: ['Chat.ReadWrite', 'ChatMessage.Send', 'Team.ReadBasic.All'],
  presence: ['Presence.Read'],
  mail: ['Mail.Read', 'Mail.Send'],
};