/**
 * ai.ts — API wrapper for StudyBot with file upload and plan generation
 */

import { API_BASE_URL, DEFAULT_USER_ID } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StudyPlanSubject {
  name: string;
  topics: string[];
  hours_per_week: number;
  priority: "high" | "medium" | "low";
}

export interface ScheduleSlot {
  time: string;
  subject: string;
  duration_minutes: number;
  activity: string;
}

export interface StudyPlan {
  plan_name: string;
  start_date: string;
  end_date: string;
  daily_hours: number;
  subjects: StudyPlanSubject[];
  weekly_schedule: Record<string, ScheduleSlot[]>;
  tips: string[];
}

export interface ChatResponse {
  reply: string;
  plan: StudyPlan | null;
}

export interface UploadedFile {
  type: "image" | "pdf";
  base64: string;
  filename: string;
}

export interface ParseFilesResponse {
  extracted_text: string;
}

export interface StudyPlanJSON {
  metadata: {
    timezone: string;
    generatedAt: string;
    weekStart: string;
  };
  inputs: {
    modules: Array<{ moduleId: string; name: string }>;
    deadlines: Array<{ title: string; dueAt: string; moduleId: string }>;
    preferences: {
      studyDays: string[];
      dailyStart: string;
      dailyEnd: string;
      breakRule: { everyMinutes: number; breakMinutes: number };
      maxSessionMinutes: number;
    };
  };
  plan: Array<{
    title: string;
    type: "study" | "break";
    moduleId?: string;
    start: string;
    end: string;
    resources?: Array<{ label: string; url: string }>;
  }>;
  summary: {
    totalStudyMinutes: number;
    totalBreakMinutes: number;
  };
}

// ---------------------------------------------------------------------------
// API class
// ---------------------------------------------------------------------------

export class AiChatAPI {
  /**
   * Send one message in the ongoing study-plan conversation.
   */
  static async sendMessage(
    userId: number,
    message: string,
    assignments?: unknown[]
  ): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message,
        assignments: assignments ?? [],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    return res.json();
  }

  /** Pull the full visible history for this user. */
  static async getHistory(userId: number): Promise<ChatMessage[]> {
    const res = await fetch(
      `${API_BASE_URL}/ai/chat/history?user_id=${userId}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages ?? [];
  }

  /** Wipe the conversation so the student can start fresh. */
  static async reset(userId: number): Promise<void> {
    await fetch(`${API_BASE_URL}/ai/chat/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  }

  /** Parse uploaded files using GPT-4 Vision */
  static async parseFiles(files: UploadedFile[]): Promise<ParseFilesResponse> {
    const res = await fetch(`${API_BASE_URL}/ai/parse-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });

    if (!res.ok) {
      throw new Error(`Failed to parse files: ${res.status}`);
    }

    return res.json();
  }

  /** Generate a structured study plan JSON */
  static async generatePlan(
    modules: Array<{ moduleId: string; name: string }>,
    deadlines: Array<{ title: string; dueAt: string; moduleId: string }>,
    preferences: {
      studyDays: string[];
      dailyStart: string;
      dailyEnd: string;
      breakRule: { everyMinutes: number; breakMinutes: number };
      maxSessionMinutes: number;
    },
    timezone: string = "Asia/Dubai"
  ): Promise<StudyPlanJSON> {
    const res = await fetch(`${API_BASE_URL}/ai/generate-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modules,
        deadlines,
        preferences,
        timezone,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate plan: ${res.status}`);
    }

    return res.json();
  }
}