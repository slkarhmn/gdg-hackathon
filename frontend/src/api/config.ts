// API Configuration
export const API_BASE_URL = 'http://localhost:5000/api';

// Default user ID (in production, this would come from authentication)
export const DEFAULT_USER_ID = 1;

// API endpoints
export const ENDPOINTS = {
  assignments: (userId: number) => `${API_BASE_URL}/assignments/user/${userId}`,
  assignmentById: (assignmentId: number) => `${API_BASE_URL}/assignments/${assignmentId}`,
  weightedGrade: (userId: number) => `${API_BASE_URL}/assignments/user/${userId}/weighted-grade`,
  notes: (userId: number) => `${API_BASE_URL}/users/${userId}/notes`,
  noteById: (noteId: number) => `${API_BASE_URL}/notes/${noteId}`,
  studyPlan: (userId: number) => `${API_BASE_URL}/study-plans/user/${userId}`,
  spacedRepetitions: (userId: number) => `${API_BASE_URL}/spaced-repetitions/user/${userId}`,
  spacedRepetitionRecordReview: (userId: number) => `${API_BASE_URL}/spaced-repetitions/user/${userId}/record-review`,
  spacedRepetitionByNote: (userId: number, noteId: number) => `${API_BASE_URL}/spaced-repetitions/user/${userId}/note/${noteId}`,
  spacedRepetitionHeatmap: (userId: number, year?: number) =>
    `${API_BASE_URL}/spaced-repetitions/user/${userId}/heatmap${year != null ? `?year=${year}` : ''}`,
  spacedRepetitionReview: (repId: number) => `${API_BASE_URL}/spaced-repetitions/${repId}/review`,
  tags: (userId: number) => `${API_BASE_URL}/tags/user/${userId}`,
  tagNames: (userId: number) => `${API_BASE_URL}/tags/user/${userId}/names`,
  user: (userId: number) => `${API_BASE_URL}/users/${userId}`,
  // Resources endpoints
  resources: (userId: number) => `${API_BASE_URL}/resources/user/${userId}`,
  resourceUpload: (userId: number) => `${API_BASE_URL}/resources/user/${userId}/upload`,
  resourceById: (resourceId: number) => `${API_BASE_URL}/resources/${resourceId}`,
  resourceFile: (resourceId: number) => `${API_BASE_URL}/resources/${resourceId}/file`,
  resourceCourses: (userId: number) => `${API_BASE_URL}/resources/user/${userId}/courses`,
  resourceBatchDelete: (userId: number) => `${API_BASE_URL}/resources/user/${userId}/batch-delete`,
};
