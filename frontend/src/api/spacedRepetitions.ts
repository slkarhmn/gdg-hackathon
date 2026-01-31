import { ENDPOINTS, DEFAULT_USER_ID } from './config';

// Backend spaced repetition response type
export interface BackendSpacedRepetition {
  id: number;
  user_id: number;
  note_id: number;
  repetition_dates: string[];
  revision_count: number;
  next_review_date: string | null;
  created_at: string;
}

// Heatmap data for visualization
export interface HeatmapData {
  months: string[];
  days: string[];
  data: { [key: string]: number[] };
}

/**
 * Fetch all spaced repetitions for a user
 */
export async function fetchSpacedRepetitions(userId: number = DEFAULT_USER_ID): Promise<BackendSpacedRepetition[]> {
  const response = await fetch(ENDPOINTS.spacedRepetitions(userId));
  
  if (!response.ok) {
    throw new Error(`Failed to fetch spaced repetitions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Add a note to spaced repetition
 */
export async function addToSpacedRepetition(noteId: number, userId: number = DEFAULT_USER_ID): Promise<BackendSpacedRepetition> {
  const response = await fetch(ENDPOINTS.spacedRepetitions(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note_id: noteId }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to add to spaced repetition: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Mark a spaced repetition as reviewed
 */
export async function markAsReviewed(repId: number): Promise<BackendSpacedRepetition> {
  const response = await fetch(ENDPOINTS.spacedRepetitionReview(repId), {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark as reviewed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Record opening a note as a repetition (creates SpacedRepetition for note if needed).
 * Use when the user has "mark for spaced repetition" on and opens/views the note.
 */
export async function recordNoteReview(noteId: number, userId: number = DEFAULT_USER_ID): Promise<BackendSpacedRepetition> {
  const response = await fetch(ENDPOINTS.spacedRepetitionRecordReview(userId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note_id: noteId }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to record note review: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Remove a note from spaced repetition (unmark for spaced repetition).
 */
export async function removeNoteFromSpacedRepetition(noteId: number, userId: number = DEFAULT_USER_ID): Promise<void> {
  const response = await fetch(ENDPOINTS.spacedRepetitionByNote(userId, noteId), {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to remove note from spaced repetition: ${response.statusText}`);
  }
}

/** Response from heatmap endpoint: daily repetition counts per date */
export interface HeatmapCountsResponse {
  year: number;
  daily_counts: { [date: string]: number };
}

/**
 * Fetch daily repetition counts for heatmap (optional; can use toHeatmapData from list instead)
 */
export async function fetchHeatmapCounts(
  userId: number = DEFAULT_USER_ID,
  year?: number
): Promise<HeatmapCountsResponse> {
  const url = ENDPOINTS.spacedRepetitionHeatmap(userId, year);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch heatmap counts: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Build HeatmapData grid from heatmap endpoint response (daily_counts keyed by YYYY-MM-DD).
 */
export function heatmapDataFromDailyCounts(
  daily_counts: { [date: string]: number },
  year: number
): HeatmapData {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data: { [key: string]: number[] } = {};

  days.forEach((day, dayIndex) => {
    data[day] = [];

    const yearStart = new Date(year, 0, 1);
    let firstDay = new Date(yearStart);
    const targetDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;

    while (firstDay.getDay() !== targetDayOfWeek) {
      firstDay.setDate(firstDay.getDate() + 1);
    }

    for (let week = 0; week < 53; week++) {
      const currentDate = new Date(firstDay);
      currentDate.setDate(firstDay.getDate() + week * 7);

      if (currentDate.getFullYear() === year) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const count = daily_counts[dateKey] ?? 0;
        data[day].push(count);
      } else {
        data[day].push(0);
      }
    }
  });

  return { months, days, data };
}

/**
 * Transform spaced repetition data to heatmap format.
 * Stores raw repetition counts per day (not 0–4 levels); Heatmap component maps counts to color.
 */
export function toHeatmapData(spacedReps: BackendSpacedRepetition[], year: number = new Date().getFullYear()): HeatmapData {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const reviewCounts: Map<string, number> = new Map();

  spacedReps.forEach(rep => {
    rep.repetition_dates.forEach(dateStr => {
      const date = new Date(dateStr);
      if (date.getFullYear() === year) {
        const dateKey = date.toISOString().split('T')[0];
        reviewCounts.set(dateKey, (reviewCounts.get(dateKey) || 0) + 1);
      }
    });
  });

  const data: { [key: string]: number[] } = {};

  days.forEach((day, dayIndex) => {
    data[day] = [];

    const yearStart = new Date(year, 0, 1);
    let firstDay = new Date(yearStart);
    const targetDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;

    while (firstDay.getDay() !== targetDayOfWeek) {
      firstDay.setDate(firstDay.getDate() + 1);
    }

    for (let week = 0; week < 52; week++) {
      const currentDate = new Date(firstDay);
      currentDate.setDate(firstDay.getDate() + week * 7);

      if (currentDate.getFullYear() === year) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const count = reviewCounts.get(dateKey) || 0;
        data[day].push(count);
      } else {
        data[day].push(0);
      }
    }
  });

  return { months, days, data };
}

/**
 * Get total review count from spaced repetitions
 */
export function getTotalReviews(spacedReps: BackendSpacedRepetition[]): number {
  return spacedReps.reduce((total, rep) => total + rep.revision_count, 0);
}

/**
 * Get items due for review today
 */
export function getDueForReview(spacedReps: BackendSpacedRepetition[]): BackendSpacedRepetition[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return spacedReps.filter(rep => {
    if (!rep.next_review_date) return false;
    const reviewDate = new Date(rep.next_review_date);
    reviewDate.setHours(0, 0, 0, 0);
    return reviewDate <= today;
  });
}
