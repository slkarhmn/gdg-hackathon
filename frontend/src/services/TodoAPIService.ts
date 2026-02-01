/**
 * Microsoft To Do API Service
 * Handles all To Do-related API calls
 */

import MicrosoftAuthService from './MicrosoftAuthService';

export interface TodoList {
  id: string;
  displayName: string;
  isOwner: boolean;
  isShared: boolean;
  wellknownListName?: string;
}

export interface Task {
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
  completedDateTime?: {
    dateTime: string;
    timeZone: string;
  };
}

export interface CreateTaskInput {
  title: string;
  body?: string;
  dueDateTime?: string; // ISO format
  reminderDateTime?: string; // ISO format
  importance?: 'low' | 'normal' | 'high';
  isReminderOn?: boolean;
}

class TodoAPIService {
  /**
   * Get all To Do lists
   */
  static async getLists(): Promise<TodoList[]> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch('/todo/lists');
      return await response.json();
    } catch (error) {
      console.error('Error fetching lists:', error);
      throw error;
    }
  }

  /**
   * Create a new To Do list
   */
  static async createList(name: string): Promise<TodoList> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch('/todo/lists', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create list');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  }

  /**
   * Get all tasks from a specific list
   */
  static async getTasks(listId: string): Promise<Task[]> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/todo/lists/${listId}/tasks`
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  static async createTask(listId: string, taskData: CreateTaskInput): Promise<Task> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/todo/lists/${listId}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify(taskData),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to create task');
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
  static async updateTask(
    listId: string,
    taskId: string,
    updates: Partial<CreateTaskInput>
  ): Promise<Task> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/todo/lists/${listId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update task');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Mark a task as complete
   */
  static async completeTask(listId: string, taskId: string): Promise<Task> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/todo/lists/${listId}/tasks/${taskId}/complete`,
        {
          method: 'POST',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to complete task');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(listId: string, taskId: string): Promise<void> {
    try {
      const response = await MicrosoftAuthService.authenticatedFetch(
        `/todo/lists/${listId}/tasks/${taskId}`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Convert Microsoft Graph task to app format
   */
  static convertToAppTask(graphTask: Task): {
    id: string;
    title: string;
    completed: boolean;
    important: boolean;
    myDay: boolean;
    dueDate?: string;
    reminder?: string;
    repeat?: string;
    notes?: string;
    listId: string;
  } {
    return {
      id: graphTask.id,
      title: graphTask.title,
      completed: graphTask.status === 'completed',
      important: graphTask.importance === 'high',
      myDay: false, // You'd need custom logic for this
      dueDate: graphTask.dueDateTime?.dateTime
        ? new Date(graphTask.dueDateTime.dateTime).toISOString().split('T')[0]
        : undefined,
      reminder: graphTask.reminderDateTime?.dateTime,
      notes: graphTask.body?.content,
      listId: '', // Will be set when fetching
    };
  }

  /**
   * Convert app task to Microsoft Graph format
   */
  static convertToGraphTask(appTask: {
    title: string;
    dueDate?: string;
    notes?: string;
    important?: boolean;
  }): CreateTaskInput {
    return {
      title: appTask.title,
      body: appTask.notes,
      dueDateTime: appTask.dueDate
        ? new Date(appTask.dueDate).toISOString()
        : undefined,
      importance: appTask.important ? 'high' : 'normal',
    };
  }
}

export default TodoAPIService;
