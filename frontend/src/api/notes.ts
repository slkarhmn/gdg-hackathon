// import { ENDPOINTS, DEFAULT_USER_ID } from './config';
//
// // Backend note response type
// export interface BackendNote {
//   id: number;
//   user_id: number;
//   content: {
//     title?: string;
//     body?: string;
//     [key: string]: unknown;
//   };
//   subject: string;
//   tags: string[];
//   created_at: string;
//   updated_at: string;
// }
//
// // Dashboard note type for the NotesCard component
// export interface DashboardNote {
//   id: number;
//   title: string;
//   subject: string;
//   completed: boolean;
// }
//
// // Note type for revision materials in Grades page
// export interface RevisionNote {
//   id: number;
//   title: string;
//   subject: string;
//   tags: string[];
//   lastReviewed: string;
// }
//
// /**
//  * Extract title from note content
//  */
// function extractTitle(note: BackendNote): string {
//   // Try to get title from content object
//   if (note.content?.title) {
//     return note.content.title;
//   }
//
//   // Try to extract from body if it starts with a heading
//   if (note.content?.body) {
//     const bodyStr = typeof note.content.body === 'string' ? note.content.body : '';
//     const headingMatch = bodyStr.match(/^#\s*(.+)/m);
//     if (headingMatch) {
//       return headingMatch[1].trim();
//     }
//   }
//
//   // Fallback to subject + note id
//   return note.subject ? `${note.subject} Notes` : `Note ${note.id}`;
// }
//
// /**
//  * Format date for "last reviewed" display
//  */
// function formatLastReviewed(dateStr: string): string {
//   const date = new Date(dateStr);
//   const now = new Date();
//   const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
//
//   if (diffDays === 0) return 'Today';
//   if (diffDays === 1) return 'Yesterday';
//   if (diffDays < 7) return `${diffDays} days ago`;
//   if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
//   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
// }
//
// /**
//  * Fetch all notes for a user
//  */
// export async function fetchNotes(userId: number = DEFAULT_USER_ID): Promise<BackendNote[]> {
//   const response = await fetch(ENDPOINTS.notes(userId));
//
//   if (!response.ok) {
//     throw new Error(`Failed to fetch notes: ${response.statusText}`);
//   }
//
//   return response.json();
// }
//
// /**
//  * Create a new note for a user
//  */
// export async function createNote(
//   payload: { content: { title?: string; body?: string }; subject?: string; tags?: string[] },
//   userId: number = DEFAULT_USER_ID
// ): Promise<BackendNote> {
//   const response = await fetch(ENDPOINTS.notes(userId), {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       content: payload.content ?? { title: 'Untitled Note', body: '' },
//       subject: payload.subject ?? 'Uncategorized',
//       tags: payload.tags ?? [],
//     }),
//   });
//
//   if (!response.ok) {
//     const err = await response.json().catch(() => ({}));
//     throw new Error(err.message || `Failed to create note: ${response.statusText}`);
//   }
//
//   return response.json();
// }
//
// /**
//  * Update an existing note
//  */
// export async function updateNote(
//   noteId: number,
//   payload: { content: { title?: string; body?: string }; subject?: string; tags?: string[] }
// ): Promise<BackendNote> {
//   const response = await fetch(ENDPOINTS.noteById(noteId), {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   });
//
//   if (!response.ok) {
//     const err = await response.json().catch(() => ({}));
//     throw new Error(err.message || `Failed to update note: ${response.statusText}`);
//   }
//
//   return response.json();
// }
//
// /**
//  * Fetch notes filtered by tag
//  */
// export async function fetchNotesByTag(tag: string, userId: number = DEFAULT_USER_ID): Promise<BackendNote[]> {
//   const response = await fetch(`${ENDPOINTS.notes(userId)}?tag=${encodeURIComponent(tag)}`);
//
//   if (!response.ok) {
//     throw new Error(`Failed to fetch notes by tag: ${response.statusText}`);
//   }
//
//   return response.json();
// }
//
// /**
//  * Fetch notes filtered by subject
//  */
// export async function fetchNotesBySubject(subject: string, userId: number = DEFAULT_USER_ID): Promise<BackendNote[]> {
//   const response = await fetch(`${ENDPOINTS.notes(userId)}?subject=${encodeURIComponent(subject)}`);
//
//   if (!response.ok) {
//     throw new Error(`Failed to fetch notes by subject: ${response.statusText}`);
//   }
//
//   return response.json();
// }
//
// /**
//  * Transform backend notes to Dashboard format
//  */
// export function toDashboardNotes(notes: BackendNote[]): DashboardNote[] {
//   return notes.map(note => ({
//     id: note.id,
//     title: extractTitle(note),
//     subject: note.subject || 'General',
//     completed: false // Notes don't have a completed state in backend, default to false
//   }));
// }
//
// /**
//  * Transform backend notes to revision note format for Grades page
//  */
// export function toRevisionNotes(notes: BackendNote[]): RevisionNote[] {
//   return notes.map(note => ({
//     id: note.id,
//     title: extractTitle(note),
//     subject: note.subject || 'General',
//     tags: note.tags || [],
//     lastReviewed: formatLastReviewed(note.updated_at || note.created_at)
//   }));
// }
//
// /**
//  * Filter notes that match any of the given tags
//  */
// export function filterNotesByTags(notes: BackendNote[], tags: string[]): BackendNote[] {
//   if (!tags || tags.length === 0) return [];
//
//   const tagSet = new Set(tags.map(t => t.toLowerCase()));
//
//   return notes.filter(note =>
//     note.tags?.some(noteTag => tagSet.has(noteTag.toLowerCase()))
//   );
// }



/**
 * NOTE: For API requests below to work in local development,
 * configure your dev server to proxy '/api' to your Flask backend
 * (e.g., http://localhost:5000).
 *
 * - For Vite: add to vite.config.js:
 *     server: { proxy: { '/api': 'http://localhost:5000' } }
 * - For Create React App: add to package.json:
 *     "proxy": "http://localhost:5000"
 */

import { ENDPOINTS, DEFAULT_USER_ID } from './config';

// Backend note response type
export interface BackendNote {
  id: number;
  user_id: number;
  content: {
    title?: string;
    body?: string;
    [key: string]: unknown;
  };
  subject: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Dashboard note type for the NotesCard component
export interface DashboardNote {
  id: number;
  title: string;
  subject: string;
  completed: boolean;
}

// Note type for revision materials in Grades page
export interface RevisionNote {
  id: number;
  title: string;
  subject: string;
  tags: string[];
  lastReviewed: string;
}

/**
 * Extract title from note content
 */
function extractTitle(note: BackendNote): string {
  // Try to get title from content object
  if (note.content?.title) {
    return note.content.title;
  }

  // Try to extract from body if it starts with a heading
  if (note.content?.body) {
    const bodyStr = typeof note.content.body === 'string' ? note.content.body : '';
    const headingMatch = bodyStr.match(/^#\s*(.+)/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
  }

  // Fallback to subject + note id
  return note.subject ? `${note.subject} Notes` : `Note ${note.id}`;
}

/**
 * Format date for "last reviewed" display
 */
function formatLastReviewed(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Fetch all notes for a user
 */
export async function fetchNotes(userId: number = DEFAULT_USER_ID): Promise<BackendNote[]> {
  // Relative path: will be proxied to backend in development
  const response = await fetch(ENDPOINTS.notes(userId));

  if (!response.ok) {
    throw new Error(`Failed to fetch notes: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single note by ID
 */
export async function fetchNoteById(noteId: number): Promise<BackendNote> {
  const response = await fetch(ENDPOINTS.noteById(noteId));
  
  if (!response.ok) {
    throw new Error(`Failed to fetch note: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Create a new note for a user
 */
export async function createNote(
  payload: { content: { title?: string; body?: string }; subject?: string; tags?: string[] },
  userId: number = DEFAULT_USER_ID
): Promise<BackendNote> {
  const response = await fetch(ENDPOINTS.notes(userId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: payload.content ?? { title: 'Untitled Note', body: '' },
      subject: payload.subject ?? 'Uncategorized',
      tags: payload.tags ?? [],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create note: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update an existing note
 */
export async function updateNote(
  noteId: number,
  payload: { content: { title?: string; body?: string }; subject?: string; tags?: string[] }
): Promise<BackendNote> {
  const response = await fetch(ENDPOINTS.noteById(noteId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to update note: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch notes filtered by tag
 */
export async function fetchNotesByTag(tag: string, userId: number = DEFAULT_USER_ID): Promise<BackendNote[]> {
  const response = await fetch(`${ENDPOINTS.notes(userId)}?tag=${encodeURIComponent(tag)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch notes by tag: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch notes filtered by subject
 */
export async function fetchNotesBySubject(subject: string, userId: number = DEFAULT_USER_ID): Promise<BackendNote[]> {
  const response = await fetch(`${ENDPOINTS.notes(userId)}?subject=${encodeURIComponent(subject)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch notes by subject: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Transform backend notes to Dashboard format
 */
export function toDashboardNotes(notes: BackendNote[]): DashboardNote[] {
  return notes.map(note => ({
    id: note.id,
    title: extractTitle(note),
    subject: note.subject || 'General',
    completed: false // Notes don't have a completed state in backend, default to false
  }));
}

/**
 * Transform backend notes to revision note format for Grades page
 */
export function toRevisionNotes(notes: BackendNote[]): RevisionNote[] {
  return notes.map(note => ({
    id: note.id,
    title: extractTitle(note),
    subject: note.subject || 'General',
    tags: note.tags || [],
    lastReviewed: formatLastReviewed(note.updated_at || note.created_at)
  }));
}

/**
 * Filter notes that match any of the given tags
 */
export function filterNotesByTags(notes: BackendNote[], tags: string[]): BackendNote[] {
  if (!tags || tags.length === 0) return [];

  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  return notes.filter(note =>
    note.tags?.some(noteTag => tagSet.has(noteTag.toLowerCase()))
  );
}
