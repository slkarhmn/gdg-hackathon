// Resources API - handles lecture materials (PDFs, videos, documents, etc.)
import { API_BASE_URL } from './config';

// Resource type definition
export interface ResourceData {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string;
  file_type: 'pdf' | 'video' | 'audio' | 'document' | 'image' | 'archive' | 'other';
  course_id: string | null;
  course_name: string | null;
  week_number: number | null;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseResourceInfo {
  course_id: string;
  course_name: string;
  resource_count: number;
  weeks: number[];
}

// API endpoints
const ENDPOINTS = {
  resources: (userId: number) => `${API_BASE_URL}/resources/user/${userId}`,
  upload: (userId: number) => `${API_BASE_URL}/resources/user/${userId}/upload`,
  resourceById: (resourceId: number) => `${API_BASE_URL}/resources/${resourceId}`,
  resourceFile: (resourceId: number) => `${API_BASE_URL}/resources/${resourceId}/file`,
  resourceCourses: (userId: number) => `${API_BASE_URL}/resources/user/${userId}/courses`,
  batchDelete: (userId: number) => `${API_BASE_URL}/resources/user/${userId}/batch-delete`,
};

/**
 * Upload a resource file with metadata
 */
export async function uploadResource(
  userId: number,
  file: File,
  metadata: {
    title?: string;
    description?: string;
    course_id?: string;
    course_name?: string;
    week_number?: number;
  }
): Promise<ResourceData> {
  const formData = new FormData();
  formData.append('file', file);
  
  if (metadata.title) formData.append('title', metadata.title);
  if (metadata.description) formData.append('description', metadata.description);
  if (metadata.course_id) formData.append('course_id', metadata.course_id);
  if (metadata.course_name) formData.append('course_name', metadata.course_name);
  if (metadata.week_number !== undefined) formData.append('week_number', metadata.week_number.toString());

  const response = await fetch(ENDPOINTS.upload(userId), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload resource');
  }

  return response.json();
}

/**
 * Get all resources for a user with optional filters
 */
export async function getResources(
  userId: number,
  filters?: {
    course_id?: string;
    week_number?: number;
    file_type?: string;
  }
): Promise<ResourceData[]> {
  const params = new URLSearchParams();
  if (filters?.course_id) params.append('course_id', filters.course_id);
  if (filters?.week_number !== undefined) params.append('week_number', filters.week_number.toString());
  if (filters?.file_type) params.append('file_type', filters.file_type);

  const url = `${ENDPOINTS.resources(userId)}${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch resources');
  }

  return response.json();
}

/**
 * Get a single resource by ID
 */
export async function getResource(resourceId: number): Promise<ResourceData> {
  const response = await fetch(ENDPOINTS.resourceById(resourceId));
  if (!response.ok) {
    throw new Error('Failed to fetch resource');
  }
  return response.json();
}

/**
 * Update resource metadata
 */
export async function updateResource(
  resourceId: number,
  data: {
    title?: string;
    description?: string;
    course_id?: string;
    course_name?: string;
    week_number?: number;
  }
): Promise<ResourceData> {
  const response = await fetch(ENDPOINTS.resourceById(resourceId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update resource');
  }

  return response.json();
}

/**
 * Delete a resource
 */
export async function deleteResource(resourceId: number): Promise<void> {
  const response = await fetch(ENDPOINTS.resourceById(resourceId), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete resource');
  }
}

/**
 * Delete multiple resources
 */
export async function batchDeleteResources(
  userId: number,
  resourceIds: number[]
): Promise<{ message: string; deleted_count: number; errors: string[] | null }> {
  const response = await fetch(ENDPOINTS.batchDelete(userId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource_ids: resourceIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to delete resources');
  }

  return response.json();
}

/**
 * Get the URL to view/download a resource file
 */
export function getResourceFileUrl(resourceId: number, download: boolean = false): string {
  return `${ENDPOINTS.resourceFile(resourceId)}${download ? '?download=true' : ''}`;
}

/**
 * Get all courses that have resources
 */
export async function getResourceCourses(userId: number): Promise<{ courses: CourseResourceInfo[] }> {
  const response = await fetch(ENDPOINTS.resourceCourses(userId));
  if (!response.ok) {
    throw new Error('Failed to fetch resource courses');
  }
  return response.json();
}

/**
 * Get file type icon name based on file type
 */
export function getFileTypeIcon(fileType: string): string {
  switch (fileType) {
    case 'pdf':
      return 'FileText';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Music';
    case 'document':
      return 'FileText';
    case 'image':
      return 'Image';
    case 'archive':
      return 'Archive';
    default:
      return 'File';
  }
}

/**
 * Format date for display
 */
export function formatResourceDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
