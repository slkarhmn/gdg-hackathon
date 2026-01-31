import { ENDPOINTS, DEFAULT_USER_ID } from './config';

/** Study plan API response: date (MM/DD/YYYY) -> time slot -> session */
export interface StudyPlanResponse {
  plan_id: number;
  user_id: number;
  study_plan: Record<string, Record<string, { subject: string[]; tags: string[]; associated_notes: number[] }>>;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Fetch study plan for a user
 */
export async function fetchStudyPlan(userId: number = DEFAULT_USER_ID): Promise<StudyPlanResponse | null> {
  const response = await fetch(ENDPOINTS.studyPlan(userId));
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch study plan: ${response.statusText}`);
  }
  return response.json();
}
