// Microsoft Authentication Library (MSAL) Configuration
// This configures authentication with Microsoft Identity Platform

export const msalConfig = {
  auth: {
    clientId: "ff9576c4-9809-4240-88ce-b8d40898cf8a", // Register your app at https://portal.azure.com
    authority: "https://login.microsoftonline.com/common", // Multi-tenant
    redirectUri: window.location.origin, // Your app's URL
  },
  cache: {
    cacheLocation: "sessionStorage", // Store tokens in session storage
    storeAuthStateInCookie: false,
  },
};

// Scopes define what permissions your app requests from the user
export const loginRequest = {
  scopes: [
    "User.Read", // Read user profile
    "Calendars.ReadWrite", // Access Outlook calendar
    "Tasks.ReadWrite", // Access Microsoft To Do
    "Mail.Read", // Read emails (optional)
    "offline_access", // Get refresh tokens
  ],
};

// Graph API endpoints
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphTasksEndpoint: "https://graph.microsoft.com/v1.0/me/todo/lists",
  graphCalendarEndpoint: "https://graph.microsoft.com/v1.0/me/events",
  graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages",
};
