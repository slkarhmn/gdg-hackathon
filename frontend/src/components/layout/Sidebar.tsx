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
  User
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isProfessor?: boolean; // Add prop to toggle professor view
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isProfessor = false }) => {
  const { account, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">
          <LayoutGrid />
        </div>
      </div>

      <nav className="nav-menu">
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

        {/* Professor Section - Only show if user is professor/admin */}
        
          <button
            className={`nav-item ${activeTab === 'professor' ? 'active' : ''}`}
            onClick={() => setActiveTab('professor')}
            title="Professor Tools"
          >
            <GraduationCap size={24} />
          </button>
      
      </nav>

      <div className="nav-bottom">
        <button
          className={`nav-item ${activeTab === 'help' ? 'active' : ''}`}
          onClick={() => setActiveTab('help')}
          title="Help"
        >
          <HelpCircle size={24} />
        </button>

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