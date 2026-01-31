import React, { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Grades from './pages/Grades';
import Calendar from './pages/Calendar';
import ToDo from './pages/ToDo';
import GetHelp from './pages/GetHelp';
import type { BackendNote } from './api';
import './styles/globals.css';

export type NavigateOptions = { openNoteId?: string; preloadedNote?: BackendNote };

export interface OpenTab {
  id: string;
  title: string;
  folderId: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [notesPreloadedNote, setNotesPreloadedNote] = useState<BackendNote | null>(null);
  
  // Persist note tabs across navigation
  const [notesOpenTabs, setNotesOpenTabs] = useState<OpenTab[]>([]);
  const [notesActiveTabId, setNotesActiveTabId] = useState<string>('');

  const handleNavigate = (page: string, options?: NavigateOptions) => {
    setCurrentPage(page);
    if (page === 'notes' && options?.preloadedNote != null) {
      setNotesPreloadedNote(options.preloadedNote);
    } else {
      setNotesPreloadedNote(null);
    }
  };

  // Callbacks to sync Notes tab state with App
  const handleNotesTabsChange = useCallback((tabs: OpenTab[]) => {
    setNotesOpenTabs(tabs);
  }, []);

  const handleNotesActiveTabChange = useCallback((tabId: string) => {
    setNotesActiveTabId(tabId);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'notes':
        return (
          <Notes
            onNavigate={setCurrentPage}
            initialPreloadedNote={notesPreloadedNote}
            onClearPreloadedNote={() => setNotesPreloadedNote(null)}
            persistedOpenTabs={notesOpenTabs}
            persistedActiveTabId={notesActiveTabId}
            onTabsChange={handleNotesTabsChange}
            onActiveTabChange={handleNotesActiveTabChange}
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
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return <div className="App">{renderPage()}</div>;
}

export default App;