import { ENDPOINTS, DEFAULT_USER_ID } from './config';

// Backend tag response type
export interface BackendTag {
  id: number;
  user_id: number;
  name: string;
  source_assignment_id: number | null;
  created_at: string;
}

// Tag names response
export interface TagNamesResponse {
  user_id: number;
  tags: string[];
  count: number;
}

/**
 * Fetch all tags for a user
 */
export async function fetchTags(userId: number = DEFAULT_USER_ID): Promise<BackendTag[]> {
  const response = await fetch(ENDPOINTS.tags(userId));
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch just tag names for a user (useful for autocomplete)
 */
export async function fetchTagNames(userId: number = DEFAULT_USER_ID): Promise<string[]> {
  const response = await fetch(ENDPOINTS.tagNames(userId));
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tag names: ${response.statusText}`);
  }
  
  const data: TagNamesResponse = await response.json();
  return data.tags;
}

/**
 * Create a new tag
 */
export async function createTag(name: string, userId: number = DEFAULT_USER_ID, sourceAssignmentId?: number): Promise<BackendTag> {
  const response = await fetch(ENDPOINTS.tags(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      source_assignment_id: sourceAssignmentId,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create tag: ${response.statusText}`);
  }
  
  return response.json();
}
