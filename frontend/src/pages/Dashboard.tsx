import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import TodoList from '../components/dashboard/TodoList';
import NotesCard from '../components/dashboard/NotesCard';
import AssignmentsCard from '../components/dashboard/AssignmentsCard';
import Heatmap from '../components/dashboard/Heatmap';
import type { TodoItem, Note, Assignment, HeatmapData } from '../types';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentStreak, setCurrentStreak] = useState(7);
  const [longestStreak, setLongestStreak] = useState(12);

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab); // Debug log
    setActiveTab(tab);
    
    // Navigate to the appropriate page
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

  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: 'get up in the morning', completed: false },
    { id: 2, text: 'revise your notes', completed: false },
    { id: 3, text: 'meet up with professor for questions', completed: false },
    { id: 4, text: 'eat food', completed: false },
    { id: 5, text: 'have lunch', completed: false },
    { id: 6, text: 'network', completed: false },
    { id: 7, text: 'study for assignment', completed: false },
  ]);

  const [notes, setNotes] = useState<Note[]>([
    { id: 1, title: 'Lecture 9: How Humans and computers interact', subject: 'Human Computer Interaction', completed: false },
    { id: 2, title: 'Lecture 8: Interface Design Principles', subject: 'Human Computer Interaction', completed: true },
    { id: 3, title: 'Lecture 7: Cognitive Psychology', subject: 'Human Computer Interaction', completed: false },
    { id: 4, title: 'Lecture 6: User Research Methods', subject: 'Human Computer Interaction', completed: false },
  ]);

  const [assignments] = useState<Assignment[]>([
    { id: 1, title: 'Class Test 1', date: 'Jan 12 2026', priority: 'high' },
    { id: 2, title: 'Project Proposal', date: 'Jan 20 2026', priority: 'medium' },
    { id: 3, title: 'Midterm Exam', date: 'Feb 05 2026', priority: 'high' },
  ]);

  const generateHeatmapData = (): HeatmapData => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data: { [key: string]: number[] } = {};
    
    days.forEach(day => {
      data[day] = Array(35).fill(0).map(() => Math.floor(Math.random() * 5));
    });
    
    return { months, days, data };
  };

  const heatmapData = generateHeatmapData();
  const currentYear = 2024;

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
      <main className="main-content">
        <Header userName="Saachi" />
        
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
          <Heatmap data={heatmapData} currentYear={currentYear} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;