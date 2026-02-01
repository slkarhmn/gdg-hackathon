import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Plus,
  Send,
  RotateCcw,
  Bot,
  CheckCircle,
  ExternalLink,
  Upload,
  X
} from 'lucide-react';
import { fetchAssignments, type BackendAssignment } from '../api/assignments';
import { fetchStudyPlan, type StudyPlanResponse } from '../api/studyPlans';
import { DEFAULT_USER_ID, API_BASE_URL } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import { GraphService } from '../auth/graphService';
import { AiChatAPI, type ChatMessage, type StudyPlan } from '../api/ai';
import './Calendar.css';

// ===========================================================================
// Types
// ===========================================================================

interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  type: 'assignment' | 'exam' | 'class' | 'event';
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
  outlookEventId?: string;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades';

interface CalendarProps {
  onNavigate: (page: Page) => void;
  viewMode?: 'student' | 'professor';
  onViewModeToggle?: () => void;
}

interface UploadedFile {
  id: string;
  name: string;
  base64: string;
  type: 'image' | 'pdf';
}

interface StudyPlanJSON {
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
    type: 'study' | 'break';
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

interface OutlookEvent {
  id?: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  location?: { displayName?: string };
  isCancelledEvent?: boolean;
}

// ===========================================================================
// Helper functions
// ===========================================================================

function assignmentPriority(dueDate: string): 'high' | 'medium' | 'low' {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'high';
  if (diffDays <= 14) return 'medium';
  return 'low';
}

function formatTimeFromIso(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 23 && m === 59) return '11:59 PM';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function studyPlanDateToIso(dateStr: string): string {
  const [mm, dd, yyyy] = dateStr.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

function studyPlanTimeToDisplay(slot: string): string {
  const [hStr, mStr] = slot.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function assignmentsToCalendarEvents(assignments: BackendAssignment[]): CalendarEvent[] {
  return assignments.map((a) => {
    const due = new Date(a.due_date);
    const dateStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
    const subject = Array.isArray(a.tags) && a.tags.length > 0 ? a.tags[0] : 'Assignment';
    return {
      id: `assignment-${a.id}`,
      title: a.name,
      subject,
      date: dateStr,
      time: formatTimeFromIso(a.due_date),
      type: 'assignment',
      priority: assignmentPriority(a.due_date),
    };
  });
}

function studyPlanToCalendarEvents(plan: StudyPlanResponse | null): CalendarEvent[] {
  if (!plan?.study_plan || typeof plan.study_plan !== 'object') return [];
  const events: CalendarEvent[] = [];
  for (const [dateStr, slots] of Object.entries(plan.study_plan)) {
    if (!slots || typeof slots !== 'object') continue;
    const isoDate = studyPlanDateToIso(dateStr);
    for (const [timeSlot, session] of Object.entries(slots)) {
      const subject = session?.subject?.[0] ?? 'Study Session';
      events.push({
        id: `study-${isoDate}-${timeSlot}`,
        title: `Study: ${subject}`,
        subject,
        date: isoDate,
        time: studyPlanTimeToDisplay(timeSlot),
        type: 'class',
        priority: 'medium',
      });
    }
  }
  return events;
}

function outlookEventsToCalendarEvents(outlookEvents: Record<string, unknown>[]): CalendarEvent[] {
  return (outlookEvents as OutlookEvent[])
    .filter((e) => e.start?.dateTime && e.subject)
    .map((e) => {
      const rawDateTime = e.start!.dateTime!;
      const datePart = rawDateTime.slice(0, 10);
      const timePortion = rawDateTime.slice(11);
      const [hStr = '0', mStr = '0'] = timePortion.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      const displayTime = `${hour}:${m.toString().padStart(2, '0')} ${period}`;
      const priority = assignmentPriority(datePart + 'T00:00:00');
      const subject = e.location?.displayName || 'Outlook Calendar';

      return {
        id: `outlook-${e.id ?? datePart}-${hStr}${mStr}`,
        title: e.subject!,
        subject,
        date: datePart,
        time: displayTime,
        type: 'event' as const,
        priority,
        outlookEventId: e.id,
      };
    });
}

function buildOutlookDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  const end = new Date(now);
  end.setDate(end.getDate() + 60);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`;
  return { startDate: toISO(start), endDate: toISO(end) };
}

async function addToOutlook(
  event: CalendarEvent,
  graphService: GraphService
): Promise<string> {
  const [year, month, day] = event.date.split('-').map(Number);
  const timeParts = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);

  if (!timeParts) {
    throw new Error('Invalid time format');
  }

  let hours = parseInt(timeParts[1], 10);
  const minutes = parseInt(timeParts[2], 10);
  const period = timeParts[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const startDate = new Date(year, month - 1, day, hours, minutes);
  let durationMinutes = 60;
  if (event.type === 'assignment' || event.type === 'exam') {
    durationMinutes = 120;
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  const formatForGraph = (date: Date) => {
    return date.toISOString().slice(0, 19);
  };

  const body = {
    subject: event.title,
    body: {
      contentType: 'text',
      content: `${event.subject}\n\nPriority: ${event.priority}\nType: ${event.type}\n\nCreated from Study Helper App`,
    },
    start: {
      dateTime: formatForGraph(startDate),
      timeZone: 'UTC',
    },
    end: {
      dateTime: formatForGraph(endDate),
      timeZone: 'UTC',
    },
    location: {
      displayName: event.subject,
    },
    categories: ['Study Helper', event.type, event.priority],
    isReminderOn: true,
    reminderMinutesBeforeStart: event.priority === 'high' ? 60 : 30,
  };

  const response = await graphService.createCalendarEvent(body);
  return response.id;
}

function studyPlanJSONToCalendarEvents(plan: StudyPlanJSON): CalendarEvent[] {
  return plan.plan
    .filter((p) => p.type === 'study')
    .map((p) => {
      const start = new Date(p.start);
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const h = start.getHours();
      const m = start.getMinutes();
      const period = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      const displayTime = `${hour}:${m.toString().padStart(2, '0')} ${period}`;

      return {
        id: `generated-study-${p.start}-${p.end}`,
        title: p.title,
        subject: p.moduleId ?? 'Study Session',
        date: dateStr,
        time: displayTime,
        type: 'class',
        priority: 'medium',
      };
    });
}

// ===========================================================================
// StudyBotPanel component
// ===========================================================================

interface StudyBotPanelProps {
  assignments: BackendAssignment[];
  onPlanGenerated?: (plan: StudyPlanJSON) => void;
}

const StudyBotPanel: React.FC<StudyBotPanelProps> = ({ assignments, onPlanGenerated }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<StudyPlan | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [generatedPlanJSON, setGeneratedPlanJSON] = useState<StudyPlanJSON | null>(null);

  const [preferences, setPreferences] = useState({
    studyDays: [] as string[],
    dailyStart: "18:00",
    dailyEnd: "22:00",
    breakEveryMinutes: 50,
    breakDuration: 10,
    maxSessionMinutes: 90,
  });

  const { isAuthenticated, getAccessToken } = useAuth();

  const [savingToOutlook, setSavingToOutlook] = useState(false);
  const [saveResult, setSaveResult] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFreshSession = messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, showPreferences, generatedPlanJSON, saveResult]);

  useEffect(() => {
    AiChatAPI.getHistory(DEFAULT_USER_ID).then((hist) => {
      if (hist.length > 0) setMessages(hist);
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        base64,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
      });
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    if (newFiles.length > 0) {
      await parseFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const parseFiles = async (files: UploadedFile[]) => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL + '/ai/parse-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: files.map((f) => {
            return { type: f.type, base64: f.base64, filename: f.name };
          })
        }),
      });

      const data = await res.json();
      setShowPreferences(true);

      const parsedMessage = '✅ Files parsed! Here\'s what I found:\n\n' + data.extracted_text + '\n\nNow let\'s set your study preferences.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: parsedMessage }
      ]);
    } catch (error) {
      console.error('Failed to parse files:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t parse those files. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (preferences.studyDays.length === 0) {
      alert('Please select at least one study day');
      return;
    }

    setLoading(true);
    setSaveResult('');

    try {
      const modules = assignments.map((a, i) => {
        const moduleName = Array.isArray(a.tags) && a.tags.length > 0 ? a.tags[0] : 'General';
        return {
          moduleId: 'MOD' + (i + 1),
          name: moduleName,
        };
      });

      const deadlines = assignments.map((a, i) => {
        return {
          title: a.name,
          dueAt: a.due_date,
          moduleId: 'MOD' + (i + 1),
        };
      });

      const prefs = {
        studyDays: preferences.studyDays,
        dailyStart: preferences.dailyStart,
        dailyEnd: preferences.dailyEnd,
        breakRule: {
          everyMinutes: preferences.breakEveryMinutes,
          breakMinutes: preferences.breakDuration,
        },
        maxSessionMinutes: preferences.maxSessionMinutes,
      };

      const res = await fetch(API_BASE_URL + '/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: modules,
          deadlines: deadlines,
          preferences: prefs,
          timezone: 'Asia/Dubai',
        }),
      });

      const plan: StudyPlanJSON = await res.json();
      setGeneratedPlanJSON(plan);
      onPlanGenerated?.(plan);

      const breakCount = plan.plan.filter((p) => p.type === 'break').length;
      const successMessage =
        '🎉 Your study plan is ready! It includes ' +
        plan.summary.totalStudyMinutes +
        ' minutes of study time with ' +
        breakCount +
        ' breaks. You can customize it or save it to Outlook below.';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: successMessage }
      ]);
    } catch (error) {
      console.error('Failed to generate plan:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t generate the plan. Please try again.' }]);
    } finally {
      setLoading(false);
      setShowPreferences(false);
    }
  };

  const toggleStudyDay = (day: string) => {
    setPreferences((prev) => ({
      ...prev,
      studyDays: prev.studyDays.includes(day)
        ? prev.studyDays.filter((d) => d !== day)
        : [...prev.studyDays, day],
    }));
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const res = await AiChatAPI.sendMessage(DEFAULT_USER_ID, trimmed, assignments);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      if (res.plan) setGeneratedPlan(res.plan);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, assignments]);

  const handleReset = async () => {
    await AiChatAPI.reset(DEFAULT_USER_ID);
    setMessages([]);
    setGeneratedPlan(null);
    setUploadedFiles([]);
    setShowPreferences(false);
    setGeneratedPlanJSON(null);
    setSaveResult("");
  };

  const savePlanToOutlook = async () => {
    if (!generatedPlanJSON) return;

    if (!isAuthenticated) {
      setSaveResult('Please sign in to save to Outlook.');
      return;
    }

    setSavingToOutlook(true);
    setSaveResult('');

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Failed to get access token');

      const graphService = new GraphService(token);
      const studySessions = generatedPlanJSON.plan.filter((p) => p.type === 'study');
      const toGraphDateTime = (d: Date) => d.toISOString().slice(0, 19);

      let created = 0;
      for (const s of studySessions) {
        const startDate = new Date(s.start);
        const endDate = new Date(s.end);

        await graphService.createCalendarEvent({
          subject: s.title,
          body: {
            contentType: 'text',
            content: `Study session\n\nModule: ${s.moduleId ?? 'N/A'}\n\nCreated from Study Helper App`,
          },
          start: { dateTime: toGraphDateTime(startDate), timeZone: 'UTC' },
          end: { dateTime: toGraphDateTime(endDate), timeZone: 'UTC' },
          categories: ['Study Helper', 'study'],
          isReminderOn: true,
          reminderMinutesBeforeStart: 15,
        } as any);

        created += 1;
      }

      setSaveResult(`✅ Saved ${created} study sessions to Outlook.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSaveResult(`❌ Failed to save to Outlook: ${msg}`);
    } finally {
      setSavingToOutlook(false);
    }
  };

  const renderPlanPreview = () => {
    if (!generatedPlan) return null;

    return (
      <div className="bot-plan-card">
        <div className="bot-plan-card-header">
          <span className="bot-plan-card-title">{generatedPlan.plan_name}</span>
          <span className="bot-plan-card-dates">
            {generatedPlan.start_date} → {generatedPlan.end_date}
          </span>
        </div>
        <div className="bot-plan-subjects">
          {generatedPlan.subjects.map((s, i) => (
            <div key={i} className={`bot-plan-subject-tag ${s.priority}`}>
              {s.name}
              <span className="bot-plan-subject-hours">{s.hours_per_week}h/wk</span>
            </div>
          ))}
        </div>
        <div className="bot-plan-tips">
          {generatedPlan.tips.slice(0, 3).map((tip, i) => (
            <p key={i} className="bot-plan-tip">💡 {tip}</p>
          ))}
        </div>
      </div>
    );
  };

  const renderMessage = (msg: ChatMessage, idx: number) => {
    const isBot = msg.role === "assistant";
    let displayContent = msg.content;

    if (isBot) {
      displayContent = displayContent.replace(/```json[\s\S]*?```/g, "").trim();
      if (!displayContent) {
        displayContent = "I've generated your study plan above! Let me know if you'd like to adjust anything.";
      }
    }

    return (
      <div key={idx} className={`bot-message ${isBot ? "assistant" : "user"}`}>
        {isBot && (
          <div className="bot-avatar">
            <Bot size={16} />
          </div>
        )}
        <div className="bot-bubble">
          <p style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="studybot-panel">
      <div className="studybot-top">
        <div className="studybot-top-info">
          <Bot size={18} className="studybot-top-icon" />
          <span>StudyBot</span>
        </div>
        <button className="studybot-reset-btn" onClick={handleReset} title="New conversation">
          <RotateCcw size={15} />
        </button>
      </div>

      <div className="studybot-messages">
        {isFreshSession && uploadedFiles.length === 0 && (
          <div className="studybot-welcome">
            <div className="studybot-welcome-icon">
              <Bot size={36} />
            </div>
            <h4>Hi, I'm StudyBot</h4>
            <p>Upload your syllabus or assignment list, and I'll create a personalized study plan for you.</p>
            <button
              className="studybot-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} />
              Upload Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-list">
            <h5>📎 Uploaded Files:</h5>
            {uploadedFiles.map((file) => (
              <div key={file.id} className="uploaded-file-item">
                <span>{file.name}</span>
                <button onClick={() => setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {messages.map(renderMessage)}
        {renderPlanPreview()}

        {showPreferences && (
          <div className="preferences-form">
            <h4>📅 Study Preferences</h4>

            <div className="pref-group">
              <label>Which days do you want to study?</label>
              <div className="day-picker">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`day-btn ${preferences.studyDays.includes(day) ? 'active' : ''}`}
                    onClick={() => toggleStudyDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="pref-group">
              <label>Daily study hours</label>
              <div className="time-inputs">
                <input
                  type="time"
                  value={preferences.dailyStart}
                  onChange={(e) => setPreferences((prev) => {
                    return { ...prev, dailyStart: e.target.value };
                  })}
                />
                <span>to</span>
                <input
                  type="time"
                  value={preferences.dailyEnd}
                  onChange={(e) => setPreferences((prev) => {
                    return { ...prev, dailyEnd: e.target.value };
                  })}
                />
              </div>
            </div>

            <div className="pref-group">
              <label>Break every {preferences.breakEveryMinutes} min</label>
              <input
                type="range"
                min="30"
                max="90"
                value={preferences.breakEveryMinutes}
                onChange={(e) => setPreferences((prev) => {
                  return { ...prev, breakEveryMinutes: Number(e.target.value) };
                })}
              />
            </div>

            <button className="generate-plan-btn" onClick={handleGeneratePlan} disabled={loading}>
              {loading ? 'Generating...' : '✨ Generate Study Plan'}
            </button>
          </div>
        )}

        {generatedPlanJSON && (
          <div className="plan-preview">
            <h4>📋 Your Study Plan</h4>
            <div className="plan-stats">
              <div className="stat">
                <strong>{Math.floor(generatedPlanJSON.summary.totalStudyMinutes / 60)}h {generatedPlanJSON.summary.totalStudyMinutes % 60}m</strong>
                <span>Total Study Time</span>
              </div>
              <div className="stat">
                <strong>{generatedPlanJSON.plan.filter((p) => p.type === 'study').length}</strong>
                <span>Study Sessions</span>
              </div>
              <div className="stat">
                <strong>{generatedPlanJSON.plan.filter((p) => p.type === 'break').length}</strong>
                <span>Breaks</span>
              </div>
            </div>

            <div className="plan-actions">
              <button
                type="button"
                className="plan-action-btn secondary"
                onClick={() => setShowPreferences(true)}
              >
                Customize
              </button>

              <button
                type="button"
                className="plan-action-btn primary"
                onClick={savePlanToOutlook}
                disabled={savingToOutlook}
                title={!isAuthenticated ? 'Sign in to save to Outlook' : ''}
              >
                {savingToOutlook ? 'Saving…' : 'Save to Outlook'}
              </button>
            </div>

            {saveResult && <div className="plan-save-result">{saveResult}</div>}
          </div>
        )}

        {loading && (
          <div className="bot-message assistant">
            <div className="bot-avatar">
              <Bot size={16} />
            </div>
            <div className="bot-bubble bot-typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {!showPreferences && uploadedFiles.length > 0 && !generatedPlanJSON && (
        <button
          type="button"
          className="studybot-continue-btn"
          onClick={() => setShowPreferences(true)}
        >
          Continue to Preferences →
        </button>
      )}

      {!uploadedFiles.length && messages.length === 0 && (
        <div className="studybot-input-bar">
          <input
            ref={inputRef}
            type="text"
            className="studybot-input"
            placeholder="Ask me anything about your study plan…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
            disabled={loading}
          />
          <button
            className="studybot-send-btn"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Main Calendar Component
// ===========================================================================

const Calendar: React.FC<CalendarProps> = ({ onNavigate, viewMode, onViewModeToggle }) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'events' | 'studybot'>('studybot');
  const [rawAssignments, setRawAssignments] = useState<BackendAssignment[]>([]);
  const [addingToOutlook, setAddingToOutlook] = useState<Set<string>>(new Set());

  const { isAuthenticated, getAccessToken } = useAuth();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate(tab as Page);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchOutlookEvents = async (): Promise<CalendarEvent[]> => {
      if (!isAuthenticated) return [];

      const token = await getAccessToken();
      if (!token) return [];

      const graphService = new GraphService(token);
      const { startDate, endDate } = buildOutlookDateRange();
      const rawEvents = await graphService.getCalendarEvents(startDate, endDate);
      return outlookEventsToCalendarEvents(rawEvents);
    };

    Promise.all([
      fetchAssignments(DEFAULT_USER_ID),
      fetchStudyPlan(DEFAULT_USER_ID),
      fetchOutlookEvents(),
    ])
      .then(([assignments, studyPlan, outlookEvents]) => {
        if (cancelled) return;
        setRawAssignments(assignments);
        const assignmentEvents = assignmentsToCalendarEvents(assignments);
        const studyEvents = studyPlanToCalendarEvents(studyPlan ?? null);
        setEvents([...assignmentEvents, ...studyEvents, ...outlookEvents]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, getAccessToken]);

  const handleAddToOutlook = async (event: CalendarEvent) => {
    if (!isAuthenticated) {
      alert('Please sign in to add events to Outlook');
      return;
    }

    if (event.outlookEventId) {
      alert('This event is already in your Outlook calendar');
      return;
    }

    setAddingToOutlook(prev => new Set(prev).add(event.id));

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Failed to get access token');
      }

      const graphService = new GraphService(token);
      const outlookEventId = await addToOutlook(event, graphService);

      setEvents(prevEvents =>
        prevEvents.map(e =>
          e.id === event.id ? { ...e, outlookEventId } : e
        )
      );

      alert('✅ Successfully added to Outlook Calendar!');
    } catch (error) {
      console.error('Failed to add to Outlook:', error);
      alert(`Failed to add to Outlook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAddingToOutlook(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.id);
        return newSet;
      });
    }
  };

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: React.ReactNode[] = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const headers = weekDays.map(day => (
      <div key={day} className="calendar-day-header">{day}</div>
    ));

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <span className="day-number">{day}</span>
          {dayEvents.length > 0 && (
            <div className="day-events">
              {dayEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="day-event-row">
                  <div className={`event-indicator ${event.type} ${event.priority}`} title={event.title} />
                  <span className="event-label" title={event.title}>
                    {event.title.length > 12 ? `${event.title.slice(0, 12)}…` : event.title}
                  </span>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <span className="more-events">+{dayEvents.length - 3} more</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return [...headers, ...days];
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      return eventDate >= todayStart;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      assignment: 'Assignment', exam: 'Exam', class: 'Class', event: 'Event'
    };
    return labels[type] || type;
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="calendar-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        viewMode={viewMode}
        onViewModeToggle={onViewModeToggle}
      />
      
      <main className="calendar-main">
        <Header userName="Saachi" />

        {error && (
          <div className="calendar-error" role="alert">{error}</div>
        )}

        <div className="calendar-content">
          <div className="calendar-section">
            {loading && (
              <div className="calendar-loading">
                <p>Loading assignments and study plan…</p>
              </div>
            )}
            <div className="calendar-header">
              <div className="calendar-title-section">
                <h2 className="calendar-title">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <p className="calendar-subtitle">Track all your deadlines and events</p>
              </div>
              <div className="calendar-controls">
                <button className="calendar-btn" onClick={() => changeMonth('prev')}>
                  <ChevronLeft size={20} />
                </button>
                <button className="calendar-btn today-btn" onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))}>
                  Today
                </button>
                <button className="calendar-btn" onClick={() => changeMonth('next')}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {renderCalendarGrid()}
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-dot exam high"></div>
                <span>High Priority Exam</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot assignment high"></div>
                <span>High Priority Assignment</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot event"></div>
                <span>Outlook Event</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot class medium"></div>
                <span>Study Session</span>
              </div>
            </div>
          </div>

          <div className="events-sidebar">
            <div className="sidebar-tabs">
              <button
                className={`sidebar-tab ${sidebarTab === 'events' ? 'active' : ''}`}
                onClick={() => setSidebarTab('events')}
              >
                Events
              </button>
              <button
                className={`sidebar-tab ${sidebarTab === 'studybot' ? 'active' : ''}`}
                onClick={() => setSidebarTab('studybot')}
              >
                <Bot size={14} /> StudyBot
              </button>
            </div>

            {sidebarTab === 'events' && (
              <>
                <div className="events-header">
                  <div className="events-header-text">
                    <h3>
                      {selectedDate
                        ? selectedDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Upcoming Events'}
                    </h3>
                    {selectedDate && (
                      <p className="events-subtitle">
                        {selectedDateEvents.length === 0
                          ? 'No events this day'
                          : `${selectedDateEvents.length} event${selectedDateEvents.length === 1 ? '' : 's'}`}
                      </p>
                    )}
                  </div>
                  <button className="add-event-btn" type="button" aria-label="Add event">
                    <Plus size={18} />
                  </button>
                </div>

                <div className="events-list">
                  {(selectedDate ? selectedDateEvents : upcomingEvents).length === 0 ? (
                    <div className="empty-events">
                      <CalendarIcon size={48} />
                      <p>
                        {selectedDate
                          ? 'No events on this date. Select another day or view upcoming events by clearing the selection.'
                          : 'No events upcoming'}
                      </p>
                    </div>
                  ) : (
                    (selectedDate ? selectedDateEvents : upcomingEvents).map(event => {
                      const daysUntil = getDaysUntil(event.date);
                      const isUrgent = daysUntil <= 3;
                      const isAdding = addingToOutlook.has(event.id);
                      const isOutlookEvent = event.type === 'event';

                      return (
                        <div
                          key={event.id}
                          className={`event-card ${event.type} ${event.priority} ${isUrgent ? 'urgent' : ''}`}
                        >
                          <div className="event-card-header">
                            <span className={`event-type-badge ${event.type}`}>
                              {getEventTypeLabel(event.type)}
                            </span>
                            {isUrgent && !selectedDate && <AlertCircle size={16} className="urgent-icon" />}
                          </div>

                          <h4 className="event-title">{event.title}</h4>
                          <p className="event-subject">{event.subject}</p>

                          <div className="event-meta">
                            <div className="meta-item">
                              <CalendarIcon size={14} />
                              <span>{new Date(event.date).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="meta-item">
                              <Clock size={14} />
                              <span>{event.time}</span>
                            </div>
                          </div>

                          {!selectedDate && (
                            <div className="days-until">
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                            </div>
                          )}

                          {isAuthenticated && (
                            <div className="event-actions" style={{ marginTop: '12px' }}>
                              {event.outlookEventId ? (
                                <button className="outlook-added-btn" disabled>
                                  <CheckCircle size={14} />
                                  In Outlook
                                </button>
                              ) : isOutlookEvent ? (
                                <button className="outlook-synced-btn" disabled>
                                  <ExternalLink size={14} />
                                  From Outlook
                                </button>
                              ) : (
                                <button
                                  className="add-to-outlook-btn"
                                  onClick={() => handleAddToOutlook(event)}
                                  disabled={isAdding}
                                >
                                  {isAdding ? (
                                    <>Adding...</>
                                  ) : (
                                    <>
                                      <ExternalLink size={14} />
                                      Add to Outlook
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {sidebarTab === 'studybot' && (
              <StudyBotPanel
                assignments={rawAssignments}
                onPlanGenerated={(plan) => {
                  const newEvents = studyPlanJSONToCalendarEvents(plan);
                  setEvents((prev) => {
                    const existing = new Set(prev.map((e) => e.id));
                    const merged = [...prev];
                    for (const ev of newEvents) {
                      if (!existing.has(ev.id)) merged.push(ev);
                    }
                    return merged;
                  });
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Calendar;