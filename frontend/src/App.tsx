import React, { useState, useEffect } from 'react';
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
import './styles/globals.css';

export type NavigateOptions = { openNoteId?: string }; 

// Main App Component (wrapped with auth)
function AppContent() {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const { isAuthenticated, isLoading, account, getAccessToken } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Render appropriate page  
  const [notesOpenNoteId, setNotesOpenNoteId] = useState<string | null>(null); 
  
  // Check if user is professor/admin (you can customize this logic)
  const isProfessor = true; // Set to true for demo, or check account.jobTitle, account.roles, etc.

  // Get access token when user is authenticated
  useEffect(() => {
    const fetchToken = async () => {
      if (isAuthenticated) {
        const token = await getAccessToken();
        setAccessToken(token);
      } else {
        setAccessToken(null);
      }
    };
    fetchToken();
  }, [isAuthenticated, getAccessToken]);

  // Initialize Graph Service
  const graphService = useGraphService(accessToken);

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

  if (isAuthenticated && !accessToken) {
    return (
      <div style={{ padding: 24 }}>
        Loading Microsoft access…
      </div>
    );
  }

  const handleNavigate = (page: string, options?: NavigateOptions) => {
    setCurrentPage(page);
    if (page === 'notes' && options?.openNoteId != null) {
      setNotesOpenNoteId(options.openNoteId);
    } else {
      setNotesOpenNoteId(null);
    }
  };

  const renderPage = () => {
    const pageProps = {
      onNavigate: (p: any) => setCurrentPage(p),
      graphService,
      userProfile: account,
    };

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard {...pageProps} />;
      case 'notes':
        return (
          <Notes
            onNavigate={setCurrentPage}
            initialOpenNoteId={notesOpenNoteId}
            onInitialOpenNoteHandled={() => setNotesOpenNoteId(null)}
          />
        );
        // return <Notes {...pageProps} />;
      case 'grades':
      case 'analytics':
        return <Grades onNavigate={handleNavigate} />;
        // return <Grades {...pageProps} />;
      case 'calendar':
        return <Calendar {...pageProps} />;
      case 'files':
      case 'todo':
        return <ToDo {...pageProps} />;
      case 'help':
        return <GetHelp {...pageProps} />;
      case 'professor':
        return <ProfessorDashboard {...pageProps} />;
      default:
        return <Dashboard {...pageProps} />;
    }
  };

  return <div className="App">{renderPage()}</div>;
}

// Root App with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;