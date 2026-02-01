// Courses API - handles professor course management
import { API_BASE_URL } from './config';

// Course type definition
export interface CourseData {
  id: number;
  user_id: number;
  name: string;
  code: string;
  semester: string | null;
  description: string | null;
  student_count: number;
  total_weeks: number;
  resource_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseInput {
  name: string;
  code: string;
  semester?: string;
  description?: string;
  student_count?: number;
  total_weeks?: number;
}

// API endpoints
const ENDPOINTS = {
  courses: (userId: number) => `${API_BASE_URL}/courses/user/${userId}`,
  courseById: (courseId: number) => `${API_BASE_URL}/courses/${courseId}`,
  courseResources: (courseId: number) => `${API_BASE_URL}/courses/${courseId}/resources`,
};

/**
 * Get all courses for a user
 */
export async function getCourses(userId: number): Promise<CourseData[]> {
  const response = await fetch(ENDPOINTS.courses(userId));
  if (!response.ok) {
    throw new Error('Failed to fetch courses');
  }
  return response.json();
}

/**
 * Create a new course
 */
export async function createCourse(
  userId: number,
  data: CreateCourseInput
): Promise<CourseData> {
  const response = await fetch(ENDPOINTS.courses(userId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create course');
  }

  return response.json();
}

/**
 * Get a single course by ID
 */
export async function getCourse(courseId: number): Promise<CourseData> {
  const response = await fetch(ENDPOINTS.courseById(courseId));
  if (!response.ok) {
    throw new Error('Failed to fetch course');
  }
  return response.json();
}

/**
 * Update a course
 */
export async function updateCourse(
  courseId: number,
  data: Partial<CreateCourseInput>
): Promise<CourseData> {
  const response = await fetch(ENDPOINTS.courseById(courseId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update course');
  }

  return response.json();
}

/**
 * Delete a course (and all its resources)
 */
export async function deleteCourse(courseId: number): Promise<void> {
  const response = await fetch(ENDPOINTS.courseById(courseId), {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete course');
  }
}

/**
 * Get all resources for a course
 */
export async function getCourseResources(
  courseId: number,
  weekNumber?: number
): Promise<any[]> {
  const params = new URLSearchParams();
  if (weekNumber !== undefined) {
    params.append('week_number', weekNumber.toString());
  }
  
  const url = `${ENDPOINTS.courseResources(courseId)}${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch course resources');
  }
  return response.json();
}
