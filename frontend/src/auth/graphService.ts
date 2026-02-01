/**
 * Microsoft Graph Service
 * Handles all Microsoft Graph API calls including Calendar and To Do
 */

export class GraphService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // ==================== Calendar Methods ====================

  async getCalendarEvents(startDateTime: string, endDateTime: string): Promise<unknown[]> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  // ==================== Microsoft To Do Methods ====================

  /**
   * Get all To Do task lists for the user
   */
  async getTaskLists(): Promise<MicrosoftTaskList[]> {
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/todo/lists',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch task lists: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error fetching task lists:', error);
      return [];
    }
  }

  /**
   * Get tasks from a specific list
   */
  async getTasks(listId: string): Promise<MicrosoftTask[]> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  /**
   * Get all tasks from all lists
   */
  async getAllTasks(): Promise<{ listId: string; listName: string; tasks: MicrosoftTask[] }[]> {
    try {
      const lists = await this.getTaskLists();
      const allTasks = await Promise.all(
        lists.map(async (list) => ({
          listId: list.id,
          listName: list.displayName,
          tasks: await this.getTasks(list.id),
        }))
      );
      return allTasks;
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      return [];
    }
  }

  /**
   * Create a new task in a list
   */
  async createTask(
    listId: string,
    task: {
      title: string;
      body?: { content: string; contentType: string };
      dueDateTime?: { dateTime: string; timeZone: string };
      reminderDateTime?: { dateTime: string; timeZone: string };
      importance?: 'low' | 'normal' | 'high';
      isReminderOn?: boolean;
    }
  ): Promise<MicrosoftTask> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create task: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  async updateTask(
    listId: string,
    taskId: string,
    updates: {
      title?: string;
      status?: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
      body?: { content: string; contentType: string };
      dueDateTime?: { dateTime: string; timeZone: string } | null;
      reminderDateTime?: { dateTime: string; timeZone: string } | null;
      importance?: 'low' | 'normal' | 'high';
      isReminderOn?: boolean;
    }
  ): Promise<MicrosoftTask> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update task: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(listId: string, taskId: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/todo/lists/${listId}/tasks/${taskId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Create a new task list
   */
  async createTaskList(displayName: string): Promise<MicrosoftTaskList> {
    try {
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/todo/lists',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ displayName }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create task list: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating task list:', error);
      throw error;
    }
  }
}

// ==================== Type Definitions ====================

export interface MicrosoftTaskList {
  id: string;
  displayName: string;
  isOwner: boolean;
  isShared: boolean;
  wellknownListName: string;
}

export interface MicrosoftTask {
  id: string;
  title: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  importance: 'low' | 'normal' | 'high';
  isReminderOn: boolean;
  createdDateTime: string;
  lastModifiedDateTime: string;
  body?: {
    content: string;
    contentType: string;
  };
  dueDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  reminderDateTime?: {
    dateTime: string;
    timeZone: string;
  };
  recurrence?: {
    pattern: {
      type: string;
      interval: number;
    };
    range: {
      type: string;
      startDate: string;
    };
  };
}

/**
 * React hook to use GraphService with auto-refresh
 */
import { useMemo } from 'react';

export function useGraphService(accessToken: string | null): GraphService | null {
  return useMemo(() => {
    if (!accessToken) return null;
    return new GraphService(accessToken);
  }, [accessToken]);
}