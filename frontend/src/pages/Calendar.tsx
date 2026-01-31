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

const Calendar: React.FC<CalendarProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate(tab as Page);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAssignments(DEFAULT_USER_ID),
      fetchStudyPlan(DEFAULT_USER_ID),
    ])
      .then(([assignments, studyPlan]) => {
        if (cancelled) return;
        const assignmentEvents = assignmentsToCalendarEvents(assignments);
        const studyEvents = studyPlanToCalendarEvents(studyPlan ?? null);
        setEvents([...assignmentEvents, ...studyEvents]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

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
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
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
                <span>Event/Class</span>
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