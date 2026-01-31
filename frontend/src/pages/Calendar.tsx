import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Plus,
  Filter
} from 'lucide-react';
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

const Calendar: React.FC<CalendarProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 31)); // January 31, 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate(tab as Page);
  };

  const events: CalendarEvent[] = [
    {
      id: '1',
      title: 'JavaFX GUI Development Test',
      subject: 'Object-Oriented Programming',
      date: '2026-02-05',
      time: '10:00 AM',
      type: 'exam',
      priority: 'high',
    },
    {
      id: '2',
      title: 'UX Research Project Due',
      subject: 'Human Computer Interaction',
      date: '2026-02-05',
      time: '11:59 PM',
      type: 'assignment',
      priority: 'high',
    },
    {
      id: '3',
      title: 'Algorithm Analysis Quiz',
      subject: 'Data Structures',
      date: '2026-02-01',
      time: '2:00 PM',
      type: 'exam',
      priority: 'medium',
    },
    {
      id: '4',
      title: 'Database Design Presentation',
      subject: 'Database Systems',
      date: '2026-02-08',
      time: '3:30 PM',
      type: 'assignment',
      priority: 'high',
    },
    {
      id: '5',
      title: 'Web Development Workshop',
      subject: 'Web Development',
      date: '2026-02-12',
      time: '1:00 PM',
      type: 'event',
      priority: 'low',
    },
    {
      id: '6',
      title: 'OS Lab Report',
      subject: 'Operating Systems',
      date: '2026-02-15',
      time: '11:59 PM',
      type: 'assignment',
      priority: 'medium',
    },
    {
      id: '7',
      title: 'HCI Midterm Exam',
      subject: 'Human Computer Interaction',
      date: '2026-02-20',
      time: '9:00 AM',
      type: 'exam',
      priority: 'high',
    },
    {
      id: '8',
      title: 'Data Structures Project Demo',
      subject: 'Data Structures',
      date: '2026-02-18',
      time: '4:00 PM',
      type: 'assignment',
      priority: 'high',
    },
  ];

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
      const isToday = date.toDateString() === new Date(2026, 0, 31).toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <span className="day-number">{day}</span>
          {dayEvents.length > 0 && (
            <div className="event-indicators">
              {dayEvents.slice(0, 3).map((event, idx) => (
                <div
                  key={idx}
                  className={`event-indicator ${event.type} ${event.priority}`}
                  title={event.title}
                />
              ))}
              {dayEvents.length > 3 && (
                <span className="more-events">+{dayEvents.length - 3}</span>
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
    .filter(event => new Date(event.date) >= new Date(2026, 0, 31))
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
    const today = new Date(2026, 0, 31);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="calendar-container">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
      <main className="calendar-main">
        <Header userName="Saachi" />

        <div className="calendar-content">
          {/* Calendar Grid */}
          <div className="calendar-section">
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
                <button className="calendar-btn today-btn" onClick={() => setCurrentDate(new Date(2026, 0, 31))}>
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

          {/* Sidebar - Upcoming Events / Selected Date Events */}
          <div className="events-sidebar">
            <div className="events-header">
              <h3>{selectedDate ? 'Events on ' + selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric' }) : 'Upcoming Events'}</h3>
              <button className="add-event-btn">
                <Plus size={18} />
              </button>
            </div>

            <div className="events-list">
              {(selectedDate ? selectedDateEvents : upcomingEvents).length === 0 ? (
                <div className="empty-events">
                  <CalendarIcon size={48} />
                  <p>No events {selectedDate ? 'on this date' : 'upcoming'}</p>
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
                        {isUrgent && <AlertCircle size={16} className="urgent-icon" />}
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