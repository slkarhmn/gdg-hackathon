import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { useGraphService } from './auth/graphService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Grades from './pages/Grades';
import Calendar from './pages/Calendar';
import ToDo from './pages/ToDo';
import GetHelp from './pages/GetHelp';
import ProfessorDashboard from './pages/Professordashboard';
import AuthCallback from './components/AuthCallback';
import type { BackendNote } from './api';
import './styles/globals.css';

export type NavigateOptions = { openNoteId?: string; preloadedNote?: BackendNote };

export interface OpenTab {
  id: string;
  title: string;
  folderId: string;
}

// Main App Component (wrapped with auth)
function AppContent() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const { isAuthenticated, isLoading, account, getAccessToken } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [notesPreloadedNote, setNotesPreloadedNote] = useState<BackendNote | null>(null);
  
  // Persist note tabs across navigation
  const [notesOpenTabs, setNotesOpenTabs] = useState<OpenTab[]>([]);
  const [notesActiveTabId, setNotesActiveTabId] = useState<string>('');
  
  // Check if user is professor/admin (you can customize this logic)
  const isProfessor = true; // Set to true for demo, or check account.jobTitle, account.roles, etc.

  // Get access token when user is authenticated
  useEffect(() => {
    const fetchToken = async () => {
      if (isAuthenticated) {
        const token = await getAccessToken();
        setAccessToken(token);
      }
    };
    fetchToken();
  }, [isAuthenticated, getAccessToken]);

  // Initialize Graph Service
  const graphService = useGraphService(accessToken);

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

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #F5F5F0 0%, #E7EAD7 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E0E0E0',
            borderTopColor: '#6B9080',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#5a5a5a', fontSize: '14px', fontWeight: 500 }}>
            Loading StudySync...
          </p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Render appropriate page
  const renderPage = () => {
    const pageProps = {
      graphService,
      userProfile: account,
    };

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} {...pageProps} />;
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
            {...pageProps}
          />
        );
      case 'grades':
      case 'analytics':
        return <Grades onNavigate={handleNavigate} {...pageProps} />;
      case 'calendar':
        return <Calendar onNavigate={handleNavigate} {...pageProps} />;
      case 'files':
      case 'todo':
        return <ToDo onNavigate={handleNavigate} {...pageProps} />;
      case 'help':
        return <GetHelp onNavigate={handleNavigate} {...pageProps} />;
      case 'professor':
        return <ProfessorDashboard onNavigate={handleNavigate} {...pageProps} />;
      default:
        return <Dashboard onNavigate={handleNavigate} {...pageProps} />;
    }
  };

  return <div className="App">{renderPage()}</div>;
}

// Root App with AuthProvider
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;