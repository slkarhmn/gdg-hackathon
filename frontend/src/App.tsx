import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Grades from './pages/Grades';
import Calendar from './pages/Calendar';
import ToDo from './pages/ToDo';
import GetHelp from './pages/GetHelp';
import './styles/globals.css';

export type NavigateOptions = { openNoteId?: string };

function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [notesOpenNoteId, setNotesOpenNoteId] = useState<string | null>(null);

  const handleNavigate = (page: string, options?: NavigateOptions) => {
    setCurrentPage(page);
    if (page === 'notes' && options?.openNoteId != null) {
      setNotesOpenNoteId(options.openNoteId);
    } else {
      setNotesOpenNoteId(null);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'notes':
        return (
          <Notes
            onNavigate={setCurrentPage}
            initialOpenNoteId={notesOpenNoteId}
            onInitialOpenNoteHandled={() => setNotesOpenNoteId(null)}
          />
        );
      case 'grades':
      case 'analytics':
        return <Grades onNavigate={handleNavigate} />;
      case 'calendar':
        return <Calendar onNavigate={setCurrentPage} />;
      case 'files':
      case 'todo':
        return <ToDo onNavigate={setCurrentPage} />;
      case 'help':
        return <GetHelp onNavigate={setCurrentPage} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return <div className="App">{renderPage()}</div>;
}

export default App;