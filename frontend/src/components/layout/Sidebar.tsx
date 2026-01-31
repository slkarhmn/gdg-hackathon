import React from 'react';
import { LayoutGrid, FolderOpen, Calendar, Percent, List, HelpCircle, LogOut } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  account?: { name: string };
  logout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, account, logout }) => {
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
          onClick={() => {
            console.log('Notes button clicked'); // Debug log
            setActiveTab('notes');
          }}
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
      </nav>

      <div className="nav-bottom">
        <button
          className={`nav-item ${activeTab === 'help' ? 'active' : ''}`}
          onClick={() => setActiveTab('help')}
          title="Help"
        >
          <HelpCircle size={24} />
        </button>

        <div className="profile-section">
          <div className="profile-avatar">
            {account?.name?.charAt(0) || 'U'}
          </div>
          <button 
            className="logout-btn" 
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;