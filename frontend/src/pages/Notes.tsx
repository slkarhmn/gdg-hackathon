import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderPlus,
  FilePlus,
  Search,
  Settings,
  X,
  Sparkles,
  Send,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import './Notes.css';

interface Note {
  id: string;
  title: string;
  content?: string;
}

interface LectureFolder {
  id: string;
  name: string;
  notes: Note[];
  isExpanded: boolean;
  subfolders?: LectureFolder[];
}

interface OpenTab {
  id: string;
  title: string;
  folderId: string;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades';

interface NotesProps {
  onNavigate: (page: Page) => void;
}

const Notes: React.FC<NotesProps> = ({ onNavigate }) => {
  const [mainSidebarTab, setMainSidebarTab] = useState('notes');
  const [folders, setFolders] = useState<LectureFolder[]>([
    {
      id: '1',
      name: 'Human Computer Interaction',
      notes: [
        {
          id: '1-1',
          title: 'Lecture 1 - Introduction to HCI',
          content: `# Introduction to HCI

## What is HCI?
Human-Computer Interaction (HCI) is a multidisciplinary field of study focusing on the design of computer technology and the interaction between humans and computers.

## Key Components
- **The User**: Understanding user needs, capabilities, and limitations
- **The Task**: What the user wants to accomplish
- **The Context**: Where and when the interaction takes place
- **The Technology**: The tools and systems being used

## History
HCI emerged in the 1980s as personal computers became more widespread. It draws from computer science, psychology, design, and ergonomics.`
        },
        {
          id: '1-2',
          title: 'Lecture 2 - User Research Methods',
          content: `# User Research Methods

## Qualitative Methods
- **Interviews**: One-on-one conversations to understand user needs
- **Observations**: Watching users in their natural environment
- **Focus Groups**: Group discussions to gather diverse perspectives

## Quantitative Methods
- **Surveys**: Collecting data from large user populations
- **Analytics**: Measuring user behavior through data
- **A/B Testing**: Comparing different design variations

## Best Practices
Always combine qualitative and quantitative methods for comprehensive insights.`
        },
        {
          id: '1-3',
          title: 'Lecture 3 - Design Principles',
          content: `# Design Principles

## Norman's Principles
1. **Visibility**: Make functions easily discoverable
2. **Feedback**: Provide immediate response to user actions
3. **Constraints**: Limit interaction possibilities to prevent errors
4. **Consistency**: Similar elements should behave similarly
5. **Affordance**: Design should suggest how to use it

## Gestalt Principles
- Proximity
- Similarity
- Continuity
- Closure`
        },
        {
          id: '1-4',
          title: 'Lecture 4 - Prototyping Techniques',
          content: `# Prototyping

## Low-Fidelity Prototypes
- Paper sketches
- Wireframes
- Storyboards

## High-Fidelity Prototypes
- Interactive mockups (Figma, Adobe XD)
- Coded prototypes
- Functional demos

## When to Use Each
Low-fidelity for early exploration, high-fidelity for usability testing.`
        },
        {
          id: '1-5',
          title: 'Lecture 5 - Usability Testing',
          content: `# Usability Testing

## Key Metrics
- **Success Rate**: Can users complete the task?
- **Time on Task**: How long does it take?
- **Error Rate**: How many mistakes do they make?
- **Satisfaction**: How do users feel about the experience?

## Testing Methods
- Moderated testing
- Unmoderated remote testing
- Guerrilla testing`
        },
        {
          id: '1-6',
          title: 'Lecture 6 - Accessibility (a11y)',
          content: `# Accessibility

## WCAG Guidelines
1. **Perceivable**: Information must be presentable to users
2. **Operable**: UI components must be operable
3. **Understandable**: Information must be understandable
4. **Robust**: Content must work with assistive technologies

## Common Practices
- Provide alt text for images
- Ensure keyboard navigation
- Use sufficient color contrast
- Provide captions for videos`
        },
      ],
      isExpanded: true,
    },
    {
      id: '2',
      name: 'Data Structures & Algorithms',
      notes: [
        { id: '2-1', title: 'Arrays and Lists', content: '# Arrays\nContiguous memory, O(1) access\n\n# Linked Lists\nO(n) access, O(1) insertion at known position' },
        { id: '2-2', title: 'Trees and Graphs', content: '# Trees\nHierarchical structure with root, branches, leaves\n\n# Graphs\nNodes and edges, directed vs undirected' },
        { id: '2-3', title: 'Hash Tables', content: '# Hash Tables\nKey-value pairs using hash functions\n\n## Collision Resolution\n- Chaining\n- Open addressing' },
        { id: '2-4', title: 'Stacks and Queues', content: '# Stack (LIFO)\nPush, Pop operations\n\n# Queue (FIFO)\nEnqueue, Dequeue operations' },
      ],
      isExpanded: false,
      subfolders: [
        {
          id: '2-sub-1',
          name: 'Advanced Topics',
          notes: [
            { id: '2-sub-1-1', title: 'AVL Trees', content: 'Self-balancing BST with height difference ≤ 1' },
            { id: '2-sub-1-2', title: 'Red-Black Trees', content: 'Self-balancing BST using color properties' },
            { id: '2-sub-1-3', title: 'B-Trees', content: 'Multi-way search trees for databases' },
          ],
          isExpanded: false,
        }
      ]
    },
    {
      id: '3',
      name: 'Database Systems',
      notes: [
        { id: '3-1', title: 'SQL Basics', content: '# SQL Fundamentals\n\nSELECT * FROM users WHERE id = 1;\n\nBasic CRUD operations' },
        { id: '3-2', title: 'Normalization', content: '# Database Normalization\n\n1NF, 2NF, 3NF, BCNF\nReducing redundancy and dependency' },
        { id: '3-3', title: 'Transactions & ACID', content: '# ACID Properties\n- Atomicity\n- Consistency\n- Isolation\n- Durability' },
        { id: '3-4', title: 'Indexing Strategies', content: '# Database Indexes\n\nB-Tree indexes, Hash indexes\nSpeed up data retrieval' },
        { id: '3-5', title: 'Query Optimization', content: '# Optimization Techniques\n\nExplain plans, join strategies (Nested Loop, Hash Join, Merge Join)' },
      ],
      isExpanded: false,
    },
    {
      id: '4',
      name: 'Operating Systems',
      notes: [
        { id: '4-1', title: 'Process Management', content: '# Process States\nNew → Ready → Running → Waiting → Terminated\n\n# Scheduling\nFCFS, SJF, Round Robin' },
        { id: '4-2', title: 'Memory Management', content: '# Memory Concepts\nPaging, Segmentation, Virtual Memory' },
        { id: '4-3', title: 'File Systems', content: '# File System Types\nFAT, NTFS, ext4\n\ninodes, directory structures' },
        { id: '4-4', title: 'Synchronization', content: '# Concurrency Control\nMutex, Semaphores, Monitors\n\nDeadlock prevention' },
      ],
      isExpanded: false,
    },
    {
      id: '5',
      name: 'Web Development',
      notes: [
        { id: '5-1', title: 'HTML & CSS Fundamentals', content: '# HTML\nSemantic structure, accessibility\n\n# CSS\nBox model, Flexbox, Grid' },
        { id: '5-2', title: 'JavaScript Essentials', content: '# JavaScript\nVariables, Functions, ES6+ features\n\nAsync/Await, Promises' },
        { id: '5-3', title: 'React Framework', content: '# React Concepts\nComponents, Props, State, Hooks\n\nVirtual DOM' },
        { id: '5-4', title: 'REST APIs', content: '# RESTful APIs\nGET, POST, PUT, DELETE\n\nStatus codes: 200, 404, 500' },
      ],
      isExpanded: false,
    },
    {
      id: '6',
      name: 'Machine Learning',
      notes: [
        { id: '6-1', title: 'Supervised Learning', content: '# Supervised Learning\nRegression, Classification\n\nLabeled training data' },
        { id: '6-2', title: 'Unsupervised Learning', content: '# Unsupervised Learning\nClustering, PCA\n\nUnlabeled data patterns' },
        { id: '6-3', title: 'Neural Networks', content: '# Neural Networks\nNeurons, Layers, Activation Functions\n\nBackpropagation' },
      ],
      isExpanded: false,
    },
  ]);

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: '1-3', title: 'Lecture 3 - Design Principles', folderId: '1' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1-3');
  const [searchQuery, setSearchQuery] = useState('');
  const [notesSidebarCollapsed, setNotesSidebarCollapsed] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAIMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiInput, setAIInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (tab: string) => {
    setMainSidebarTab(tab);
    onNavigate(tab as Page);
  };

  const toggleFolder = (folderId: string, folders: LectureFolder[]): LectureFolder[] => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, isExpanded: !folder.isExpanded };
      }
      if (folder.subfolders) {
        return { ...folder, subfolders: toggleFolder(folderId, folder.subfolders) };
      }
      return folder;
    });
  };

  const handleFolderToggle = (folderId: string) => {
    setFolders(toggleFolder(folderId, folders));
  };

  const handleNoteClick = (noteId: string, noteTitle: string, folderId: string) => {
    // Check if tab is already open
    const existingTab = openTabs.find(tab => tab.id === noteId);
    if (existingTab) {
      setActiveTabId(noteId);
    } else {
      // Add new tab
      setOpenTabs([...openTabs, { id: noteId, title: noteTitle, folderId }]);
      setActiveTabId(noteId);
    }
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(tab => tab.id !== tabId);
    setOpenTabs(newTabs);

    // If closing active tab, switch to another tab
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      setSelectedText(text);
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      if (rect) {
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
      }
    } else {
      setSelectedText('');
      setSelectionPosition(null);
    }
  };

  const askAIAboutSelection = () => {
    if (selectedText) {
      setShowAIChat(true);
      setAIMessages([
        ...aiMessages,
        { role: 'user', text: `Can you explain this: "${selectedText}"` }
      ]);
      setSelectedText('');
      setSelectionPosition(null);

      // Simulate AI response
      setTimeout(() => {
        setAIMessages(prev => [
          ...prev,
          { role: 'ai', text: `I'd be happy to explain "${selectedText}"! This concept relates to the principles of user interface design...` }
        ]);
      }, 1000);
    }
  };

  const sendAIMessage = () => {
    if (aiInput.trim()) {
      setAIMessages([...aiMessages, { role: 'user', text: aiInput }]);
      setAIInput('');

      // Simulate AI response
      setTimeout(() => {
        setAIMessages(prev => [
          ...prev,
          { role: 'ai', text: 'I understand your question. Let me help you with that...' }
        ]);
      }, 1000);
    }
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.addEventListener('mouseup', handleTextSelection);
    }
    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener('mouseup', handleTextSelection);
      }
    };
  }, []);

  const renderFolderTree = (folders: LectureFolder[], level: number = 0) => {
    return folders.map(folder => (
      <div key={folder.id} className="folder-item" style={{ marginLeft: `${level * 12}px` }}>
        <div
          className="folder-header"
          onClick={() => handleFolderToggle(folder.id)}
        >
          <div className="folder-left">
            {(folder.notes.length > 0 || folder.subfolders) && (
              folder.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            )}
            <Folder size={16} />
            <span className="folder-name">{folder.name}</span>
          </div>
          <span className="note-count">{folder.notes.length}</span>
        </div>

        {folder.isExpanded && (
          <>
            {folder.notes.length > 0 && (
              <div className="notes-list">
                {folder.notes.map(note => (
                  <div
                    key={note.id}
                    className={`note-item ${activeTabId === note.id ? 'active' : ''}`}
                    onClick={() => handleNoteClick(note.id, note.title, folder.id)}
                  >
                    <FileText size={14} />
                    <span>{note.title}</span>
                  </div>
                ))}
              </div>
            )}
            {folder.subfolders && renderFolderTree(folder.subfolders, level + 1)}
          </>
        )}
      </div>
    ));
  };

  return (
    <div className="notes-page-container">
      <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />

      <div className="notes-content-wrapper">
        {/* Collapsible Notes Sidebar */}
        <aside className={`notes-sidebar ${notesSidebarCollapsed ? 'collapsed' : ''}`}>
          {!notesSidebarCollapsed && (
            <>
              <div className="sidebar-header">
                <span className="sidebar-title">Notes</span>
                <div className="sidebar-actions">
                  <button
                    className="action-btn"
                    onClick={() => setNotesSidebarCollapsed(true)}
                    title="Collapse Sidebar"
                  >
                    <PanelLeftClose size={18} />
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="sidebar-toolbar">
                <button
                  className="toolbar-btn"
                  onClick={handleCreateFolder}
                  title="New Folder"
                >
                  <FolderPlus size={18} />
                </button>

                <button
                  className="toolbar-btn"
                  onClick={handleCreateNote}
                  title="New Note"
                >
                  <FilePlus size={18} />
                </button>

                <button className="toolbar-btn" title="Settings">
                  <Settings size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="sidebar-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Folders List */}
              <div className="folders-list">
                {renderFolderTree(folders)}
              </div>
            </>
          )}
        </aside>

        {/* Expand Button (when sidebar is collapsed) */}
        {notesSidebarCollapsed && (
          <div className="expand-sidebar-container">
            <button
              className="expand-sidebar-btn"
              onClick={() => setNotesSidebarCollapsed(false)}
              title="Expand Sidebar"
            >
              <PanelLeft size={20} />
            </button>
          </div>
        )}

        {/* Main Note Editor */}
        <main className="note-editor">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="note-tabs">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`note-tab ${activeTabId === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <FileText size={14} />
                  <span className="tab-title">{tab.title}</span>
                  {openTabs.length > 1 && (
                    <button
                      className="tab-close"
                      onClick={(e) => closeTab(tab.id, e)}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Editor Content */}
          <div className="editor-content" ref={editorRef}>
            <h1 className="note-title-editable">Lecture 3 - Design Principles</h1>

            <div className="note-body">
              <h2>Core Design Principles</h2>
              <p>
                Design principles serve as fundamental guidelines for creating effective and user-friendly interfaces.
                These principles help ensure consistency, usability, and accessibility across digital products.
              </p>

              <h3>1. Visibility</h3>
              <p>
                The more visible an element is, the more likely users will know about it and how to use it.
                Important functions should be easily discoverable.
              </p>

              <h3>2. Feedback</h3>
              <p>
                Users should receive immediate and clear feedback about their actions. This helps them understand
                the system's state and whether their action was successful.
              </p>

              <h3>3. Constraints</h3>
              <p>
                Limiting the range of interaction possibilities helps prevent errors. Physical, logical, and
                cultural constraints guide users toward appropriate actions.
              </p>

              <h3>4. Consistency</h3>
              <p>
                Similar elements should behave in similar ways. Consistency reduces the learning curve and
                helps users transfer knowledge from one part of the interface to another.
              </p>

              <h3>5. Affordances</h3>
              <p>
                The design should suggest how an element should be used. Buttons should look clickable,
                sliders should look draggable, and so on.
              </p>

              <h2>Practical Applications</h2>
              <p>
                When designing interfaces, always consider these principles together. A well-designed interface
                balances all five principles to create an intuitive and efficient user experience.
              </p>
            </div>

            {/* Floating AI Help Button */}
            <button
              className="ai-help-fab"
              onClick={() => setShowAIChat(!showAIChat)}
              title="Ask AI for Help"
            >
              <Sparkles size={24} />
            </button>
          </div>

          {/* Text Selection Popup */}
          {selectionPosition && selectedText && (
            <div
              className="selection-popup"
              style={{
                position: 'fixed',
                left: `${selectionPosition.x}px`,
                top: `${selectionPosition.y}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <button
                className="ask-ai-btn"
                onClick={askAIAboutSelection}
              >
                <Sparkles size={14} />
                Ask AI
              </button>
            </div>
          )}

          {/* AI Chat Panel */}
          {showAIChat && (
            <div className="ai-chat-panel">
              <div className="ai-chat-header">
                <div className="ai-header-left">
                  <Sparkles size={18} />
                  <h3>AI Assistant</h3>
                </div>
                <button
                  className="ai-close-btn"
                  onClick={() => setShowAIChat(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ai-chat-messages">
                {aiMessages.length === 0 ? (
                  <div className="ai-empty-state">
                    <Sparkles size={32} />
                    <p>Ask me anything about this note!</p>
                  </div>
                ) : (
                  aiMessages.map((msg, idx) => (
                    <div key={idx} className={`ai-message ${msg.role}`}>
                      <div className="message-content">{msg.text}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="ai-chat-input">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={aiInput}
                  onChange={(e) => setAIInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
                />
                <button
                  className="ai-send-btn"
                  onClick={sendAIMessage}
                  disabled={!aiInput.trim()}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const handleCreateFolder = () => {
  // Placeholder function
};

const handleCreateNote = () => {
  // Placeholder function
};

export default Notes;