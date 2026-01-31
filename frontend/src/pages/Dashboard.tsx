import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import TodoList from '../components/dashboard/TodoList';
import NotesCard from '../components/dashboard/NotesCard';
import AssignmentsCard from '../components/dashboard/AssignmentsCard';
import Heatmap from '../components/dashboard/Heatmap';
import type { TodoItem, Note, Assignment, HeatmapData } from '../types';
import {
  fetchUpcomingAssignments,
  toDashboardAssignments,
  fetchNotes,
  toDashboardNotes,
  fetchSpacedRepetitions,
  toHeatmapData,
  getDueForReview
} from '../api';
import type { BackendSpacedRepetition } from '../api';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: 'get up in the morning', completed: false },
    { id: 2, text: 'revise your notes', completed: false },
    { id: 3, text: 'meet up with professor for questions', completed: false },
    { id: 4, text: 'eat food', completed: false },
    { id: 5, text: 'have lunch', completed: false },
    { id: 6, text: 'network', completed: false },
    { id: 7, text: 'study for assignment', completed: false },
  ]);

  const [notes, setNotes] = useState<Note[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData>({
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: {}
  });
  const [spacedReps, setSpacedReps] = useState<BackendSpacedRepetition[]>([]);

  const currentYear = new Date().getFullYear();

  // Fetch data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [assignmentsData, notesData, spacedRepsData] = await Promise.all([
          fetchUpcomingAssignments().catch(() => []),
          fetchNotes().catch(() => []),
          fetchSpacedRepetitions().catch(() => [])
        ]);

        // Transform assignments to dashboard format
        const dashboardAssignments = toDashboardAssignments(assignmentsData);
        setAssignments(dashboardAssignments);

        // Transform notes to dashboard format
        const dashboardNotes = toDashboardNotes(notesData);
        setNotes(dashboardNotes);

        // Store spaced reps and transform to heatmap
        setSpacedReps(spacedRepsData);
        const heatmap = toHeatmapData(spacedRepsData, currentYear);
        setHeatmapData(heatmap);

        // Calculate streaks from spaced repetition data
        const streaks = calculateStreaks(spacedRepsData);
        setCurrentStreak(streaks.current);
        setLongestStreak(streaks.longest);

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load data. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentYear]);

  // Calculate current and longest streaks from spaced repetition data
  const calculateStreaks = (reps: BackendSpacedRepetition[]): { current: number; longest: number } => {
    // Collect all review dates
    const allDates = new Set<string>();
    reps.forEach(rep => {
      rep.repetition_dates.forEach(dateStr => {
        const date = new Date(dateStr);
        allDates.add(date.toISOString().split('T')[0]);
      });
    });

    if (allDates.size === 0) {
      return { current: 0, longest: 0 };
    }

    // Sort dates
    const sortedDates = Array.from(allDates).sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    // Check if today or yesterday has a review (for current streak)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const hasRecentReview = allDates.has(today) || allDates.has(yesterday);

    // Calculate longest streak
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak (counting backwards from today)
    if (hasRecentReview) {
      let checkDate = allDates.has(today) ? today : yesterday;
      currentStreak = 1;
      
      let prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - 1);
      
      while (allDates.has(prevDate.toISOString().split('T')[0])) {
        currentStreak++;
        prevDate.setDate(prevDate.getDate() - 1);
      }
    }

    return { current: currentStreak, longest: longestStreak };
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate(tab);
  };

  const handleNoteClick = (noteId: number) => {
    console.log('Note clicked:', noteId);
    onNavigate('notes');
  };

  const handleTodoToggle = (todoId: number) => {
    setTodos(todos.map(todo => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleNoteToggle = (noteId: number) => {
    setNotes(notes.map(note => 
      note.id === noteId ? { ...note, completed: !note.completed } : note
    ));
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="main-content">
          <Header userName="Saachi" />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <p>Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
      <main className="main-content">
        <Header userName="Saachi" />
        
        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        
        <div className="cards-row">
          <TodoList todos={todos} onTodoToggle={handleTodoToggle} />
          <NotesCard 
            notes={notes} 
            onNoteClick={handleNoteClick}
            onNoteToggle={handleNoteToggle}
            currentStreak={currentStreak}
            longestStreak={longestStreak}
          />
          <AssignmentsCard assignments={assignments} />
        </div>
        
        <div className="heatmap-row">
          <Heatmap 
            data={heatmapData} 
            currentYear={currentYear}
            spacedReps={spacedReps}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;