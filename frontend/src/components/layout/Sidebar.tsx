import React from 'react';
import { 
  LayoutGrid, 
  FolderOpen, 
  Calendar, 
  Percent, 
  List, 
  HelpCircle,
  GraduationCap,
  LogOut,
  User,
  UserCircle,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewMode?: 'student' | 'professor';
  onViewModeToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  viewMode = 'student',
  onViewModeToggle 
}) => {
  const { account, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">
          <img 
            src="/public/favicon.jpeg"
            alt="Logo" 
            style={{ 
              width: '40px', 
              height: '40px',
              borderRadius: '8px',
              objectFit: 'cover'
            }} 
          />
        </div>
      </div>

      <nav className="nav-menu">
        {/* Only show student navigation items when in student view */}
        {viewMode === 'student' && (
          <>
            <button
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              title="Dashboard"
            >
              <LayoutGrid size={24} />
            </button>
            <button
              className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
              title="Notes"
            >
              <FolderOpen size={24} />
            </button>
            <button
              className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
              title="Calendar"
            >
              <Calendar size={24} />
            </button>
            <button
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
              title="Analytics"
            >
              <Percent size={24} />
            </button>
            <button
              className={`nav-item ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
              title="Files"
            >
              <List size={24} />
            </button>
            <button
              className={`nav-item ${activeTab === 'help' ? 'active' : ''}`}
              onClick={() => setActiveTab('help')}
              title="Help"
            >
              <HelpCircle size={24} />
            </button>
          </>
        )}
      </nav>

      <div className="nav-bottom">
        {/* View Mode Toggle */}
        {onViewModeToggle && (
          <button
            onClick={onViewModeToggle}
            style={{
              width: '100%',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: viewMode === 'professor' ? '#6B9080' : 'transparent',
              color: viewMode === 'professor' ? 'white' : '#5a5a5a',
              border: 'none',
              borderTop: '1px solid #E0E0E0',
              borderRadius: '0',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (viewMode === 'student') {
                e.currentTarget.style.background = '#F5F5F0';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode === 'student') {
                e.currentTarget.style.background = 'transparent';
              }
            }}
            title={viewMode === 'student' ? 'Switch to Professor View' : 'Switch to Student View'}
          >
            {viewMode === 'student' ? (
              <>
                <GraduationCap size={18} />
                <span style={{ fontSize: '11px' }}>Professor</span>
              </>
            ) : (
              <>
                <UserCircle size={18} />
                <span style={{ fontSize: '11px' }}>Student</span>
              </>
            )}
          </button>
        )}

        {/* Profile Section */}
        {account && (
          <div className="profile-section">
            <div className="profile-avatar" title={account.name || 'User'}>
              {account.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button 
              className="logout-btn" 
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;