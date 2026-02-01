import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';
import { fetchAssignments, type BackendAssignment } from '../api/assignments';
import { fetchStudyPlan, type StudyPlanResponse } from '../api/studyPlans';
import { DEFAULT_USER_ID } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import { GraphService } from '../auth/graphService';
import './Calendar.css';

interface CalendarEvent {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  type: 'assignment' | 'exam' | 'class' | 'event';
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades';

interface CalendarProps {
  onNavigate: (page: Page) => void;
  viewMode?: 'student' | 'professor';
  onViewModeToggle?: () => void;
}

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

/** MM/DD/YYYY -> YYYY-MM-DD */
function studyPlanDateToIso(dateStr: string): string {
  const [mm, dd, yyyy] = dateStr.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

/** "09:00" -> "9:00 AM" */
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

// ---------------------------------------------------------------------------
// Outlook event → CalendarEvent
// ---------------------------------------------------------------------------
// The Graph API returns each event with a nested start/end object like:
//   { dateTime: "2025-02-15T14:00:00", timeZone: "Eastern Standard Time" }
// We parse the dateTime string directly (it has no timezone offset, so it is
// already in the user's local calendar time) to extract the date and display
// time without any unintended timezone shift.
// ---------------------------------------------------------------------------

interface OutlookEvent {
  id?: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  location?: { displayName?: string };
  isCancelledEvent?: boolean;
}

function outlookEventsToCalendarEvents(outlookEvents: Record<string, unknown>[]): CalendarEvent[] {
  return (outlookEvents as OutlookEvent[])
    .filter((e) => e.start?.dateTime && e.subject) // skip malformed entries
    .map((e) => {
      // dateTime from Graph looks like "2025-02-15T14:00:00.0000000"
      // Slice to the first 10 chars for the date, parse the time portion manually
      // so we never hand an ambiguous string to `new Date()` which would apply
      // the local-zone offset and shift the time.
      const rawDateTime = e.start!.dateTime!;
      const datePart = rawDateTime.slice(0, 10); // "2025-02-15"

      // Time portion: everything after the T, e.g. "14:00:00.0000000"
      const timePortion = rawDateTime.slice(11);
      const [hStr = '0', mStr = '0'] = timePortion.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      const displayTime = `${hour}:${m.toString().padStart(2, '0')} ${period}`;

      // Derive priority the same way assignments do: distance from today.
      const priority = assignmentPriority(datePart + 'T00:00:00');

      // Use the calendar name or location as the "subject" line shown under
      // the title. Fall back to a generic label.
      const subject = e.location?.displayName || 'Outlook Calendar';

      return {
        id: `outlook-${e.id ?? datePart}-${hStr}${mStr}`,
        title: e.subject!,
        subject,
        date: datePart,
        time: displayTime,
        type: 'event' as const,
        priority,
      };
    });
}

// ---------------------------------------------------------------------------
// Helper: build an ISO date string for the Graph API $filter.
// We fetch a generous window (today − 1 day  →  today + 60 days) so the
// calendar has data for the current month and the next one without extra calls.
// ---------------------------------------------------------------------------
function buildOutlookDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1); // include yesterday in case of timezone edge cases

  const end = new Date(now);
  end.setDate(end.getDate() + 60);

  // Graph expects ISO 8601 without offset for the $filter on start/end dateTime
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00`;

  return { startDate: toISO(start), endDate: toISO(end) };
}

const Calendar: React.FC<CalendarProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pull auth state so we can request an access token for Graph API.
  const { isAuthenticated, getAccessToken } = useAuth();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate(tab as Page);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // ---------------------------------------------------------------------------
    // Fetch Outlook events only when the user is authenticated.
    // If they haven't signed in, this simply resolves to an empty array so the
    // rest of the calendar (assignments, study plan) still works fine.
    // ---------------------------------------------------------------------------
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
      fetchOutlookEvents(),                // ← new: Outlook sync
    ])
      .then(([assignments, studyPlan, outlookEvents]) => {
        if (cancelled) return;
        const assignmentEvents = assignmentsToCalendarEvents(assignments);
        const studyEvents = studyPlanToCalendarEvents(studyPlan ?? null);
        // Merge all three sources. Outlook events are appended last; the
        // upcoming-events list is sorted by date afterward so order doesn't matter.
        setEvents([...assignmentEvents, ...studyEvents, ...outlookEvents]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated]); // re-run when auth state changes (e.g. after login)

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Week day headers
    const headers = weekDays.map(day => (
      <div key={day} className="calendar-day-header">
        {day}
      </div>
    ));

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    // Days of the month
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
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
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
    const labels = {
      assignment: 'Assignment',
      exam: 'Exam',
      class: 'Class',
      event: 'Event'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
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
          <div className="calendar-error" role="alert">
            {error}
          </div>
        )}
        <div className="calendar-content">
          {/* Calendar Grid */}
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

          {/* Sidebar - Selected day details or Upcoming Events */}
          <div className="events-sidebar">
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
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Calendar;