import { ENDPOINTS, DEFAULT_USER_ID } from './config';

// Backend assignment response type
export interface BackendAssignment {
  id: number;
  user_id: number;
  canvas_id: number | null;
  name: string;
  due_date: string;
  tags: string[];
  grade: number | null;
  weight: number;
  created_at: string;
}

// Frontend assignment type for Dashboard
export interface DashboardAssignment {
  id: number;
  title: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

// Frontend assignment type for Grades page
export interface GradeAssignment {
  id: string;
  title: string;
  subject: string;
  grade: number;
  maxGrade: number;
  date: string;
  topics: string[];
  status: 'graded' | 'pending' | 'upcoming';
}

// Weighted grade response
export interface WeightedGradeResponse {
  user_id: number;
  weighted_grade: number | null;
  total_weight_used?: number;
  message?: string;
}

/**
 * Calculate priority based on days until due date
 */
function calculatePriority(dueDate: string): 'high' | 'medium' | 'low' {
  const due = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) return 'high';
  if (diffDays <= 14) return 'medium';
  return 'low';
}

/**
 * Format date for display (e.g., "Jan 28, 2026")
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Determine assignment status based on grade and due date
 */
function getAssignmentStatus(assignment: BackendAssignment): 'graded' | 'pending' | 'upcoming' {
  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  
  if (assignment.grade !== null) {
    return 'graded';
  }
  if (dueDate > now) {
    return 'upcoming';
  }
  return 'pending';
}

/**
 * Extract subject from tags (first tag or default)
 */
function extractSubject(tags: string[]): string {
  if (tags.length > 0) {
    return tags[0];
  }
  return 'General';
}

/**
 * Fetch all assignments for a user
 */
export async function fetchAssignments(userId: number = DEFAULT_USER_ID): Promise<BackendAssignment[]> {
  const response = await fetch(ENDPOINTS.assignments(userId));
  
  if (!response.ok) {
    throw new Error(`Failed to fetch assignments: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch upcoming assignments for a user
 */
export async function fetchUpcomingAssignments(userId: number = DEFAULT_USER_ID): Promise<BackendAssignment[]> {
  const response = await fetch(`${ENDPOINTS.assignments(userId)}?upcoming=true`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch upcoming assignments: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Create assignment payload for POST
 */
export interface CreateAssignmentPayload {
  name: string;
  due_date: string; // ISO format, e.g. YYYY-MM-DD or full ISO
  tags?: string[];
  grade?: number | null;
  weight?: number;
}

/**
 * Create a new assignment for a user
 */
export async function createAssignment(
  payload: CreateAssignmentPayload,
  userId: number = DEFAULT_USER_ID
): Promise<BackendAssignment> {
  const body = {
    name: payload.name,
    due_date: payload.due_date,
    tags: payload.tags ?? [],
    weight: payload.weight ?? 0,
    ...(payload.grade != null && { grade: payload.grade }),
  };

  const response = await fetch(ENDPOINTS.assignments(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Failed to create assignment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch weighted grade for a user
 */
export async function fetchWeightedGrade(userId: number = DEFAULT_USER_ID): Promise<WeightedGradeResponse> {
  const response = await fetch(ENDPOINTS.weightedGrade(userId));
  
  if (!response.ok) {
    throw new Error(`Failed to fetch weighted grade: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Transform backend assignments to Dashboard format
 */
export function toDashboardAssignments(assignments: BackendAssignment[]): DashboardAssignment[] {
  return assignments.map(a => ({
    id: a.id,
    title: a.name,
    date: formatDate(a.due_date),
    priority: calculatePriority(a.due_date)
  }));
}

/**
 * Transform backend assignments to Grades page format
 */
export function toGradeAssignments(assignments: BackendAssignment[]): GradeAssignment[] {
  return assignments.map(a => ({
    id: a.id.toString(),
    title: a.name,
    subject: extractSubject(a.tags),
    grade: a.grade ?? 0,
    maxGrade: 100, // Default max grade since backend doesn't have this
    date: formatDate(a.due_date),
    topics: a.tags,
    status: getAssignmentStatus(a)
  }));
}
