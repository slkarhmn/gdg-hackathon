import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Grades from './pages/Grades';
import Calendar from './pages/Calendar';
import ToDo from './pages/ToDo';
import './styles/globals.css';

function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'notes':
        return <Notes onNavigate={setCurrentPage} />;
      case 'grades':
      case 'analytics':
        return <Grades onNavigate={setCurrentPage} />;
      case 'calendar':
        return <Calendar onNavigate={setCurrentPage} />;
      case 'files':
      case 'todo':
        return <ToDo onNavigate={setCurrentPage} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return <div className="App">{renderPage()}</div>;
}

export default App;