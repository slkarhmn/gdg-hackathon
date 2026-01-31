import { graphConfig } from './authConfig';

// Microsoft Graph API Service
// Provides functions to interact with Microsoft To Do and Outlook

export class GraphService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Helper method for making Graph API calls
  private async callGraphAPI(endpoint: string, method: string = 'GET', body?: Record<string, unknown>) {
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // USER PROFILE
  async getUserProfile() {
    return this.callGraphAPI(graphConfig.graphMeEndpoint);
  }

  // MICROSOFT TO DO
  
  // Get all task lists
  async getTaskLists() {
    const response = await this.callGraphAPI(graphConfig.graphTasksEndpoint);
    return response.value;
  }

  // Get tasks from a specific list
  async getTasks(listId: string) {
    const endpoint = `${graphConfig.graphTasksEndpoint}/${listId}/tasks`;
    const response = await this.callGraphAPI(endpoint);
    return response.value;
  }

  // Create a new task
  async createTask(listId: string, task: {
    title: string;
    body?: { content: string; contentType: string };
    dueDateTime?: { dateTime: string; timeZone: string };
    reminderDateTime?: { dateTime: string; timeZone: string };
    importance?: 'low' | 'normal' | 'high';
  }) {
    const endpoint = `${graphConfig.graphTasksEndpoint}/${listId}/tasks`;
    return this.callGraphAPI(endpoint, 'POST', task);
  }

  // Update a task
  async updateTask(listId: string, taskId: string, updates: Record<string, unknown>) {
    const endpoint = `${graphConfig.graphTasksEndpoint}/${listId}/tasks/${taskId}`;
    return this.callGraphAPI(endpoint, 'PATCH', updates);
  }

  // Delete a task
  async deleteTask(listId: string, taskId: string) {
    const endpoint = `${graphConfig.graphTasksEndpoint}/${listId}/tasks/${taskId}`;
    return this.callGraphAPI(endpoint, 'DELETE');
  }

  // Mark task as complete
  async completeTask(listId: string, taskId: string) {
    return this.updateTask(listId, taskId, { status: 'completed' });
  }

  // OUTLOOK CALENDAR

  // Get calendar events
  async getCalendarEvents(startDate?: string, endDate?: string) {
    let endpoint = graphConfig.graphCalendarEndpoint;
    
    if (startDate && endDate) {
      endpoint += `?$filter=start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`;
    }
    
    const response = await this.callGraphAPI(endpoint);
    return response.value;
  }

  // Create a calendar event
  async createCalendarEvent(event: {
    subject: string;
    body?: { contentType: string; content: string };
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: { displayName: string };
    attendees?: Array<{ emailAddress: { address: string; name?: string } }>;
    reminderMinutesBeforeStart?: number;
  }) {
    return this.callGraphAPI(graphConfig.graphCalendarEndpoint, 'POST', event);
  }

  // Update a calendar event
  async updateCalendarEvent(eventId: string, updates: Record<string, unknown>) {
    const endpoint = `${graphConfig.graphCalendarEndpoint}/${eventId}`;
    return this.callGraphAPI(endpoint, 'PATCH', updates);
  }

  // Delete a calendar event
  async deleteCalendarEvent(eventId: string) {
    const endpoint = `${graphConfig.graphCalendarEndpoint}/${eventId}`;
    return this.callGraphAPI(endpoint, 'DELETE');
  }

  // OUTLOOK MAIL (optional)

  // Get recent emails
  async getRecentEmails(count: number = 10) {
    const endpoint = `${graphConfig.graphMailEndpoint}?$top=${count}&$select=subject,from,receivedDateTime,isRead,bodyPreview`;
    const response = await this.callGraphAPI(endpoint);
    return response.value;
  }

  // Search emails
  async searchEmails(query: string) {
    const endpoint = `${graphConfig.graphMailEndpoint}?$search="${query}"&$select=subject,from,receivedDateTime,bodyPreview`;
    const response = await this.callGraphAPI(endpoint);
    return response.value;
  }
}

// Hook for using Graph Service
export const useGraphService = (accessToken: string | null) => {
  if (!accessToken) return null;
  return new GraphService(accessToken);
};
