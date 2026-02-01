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
  X,
  Sparkles,
  Send,
  PanelLeftClose,
  PanelLeft,
  Tag,
  Repeat
} from 'lucide-react';
import './Notes.css';
import { fetchNotes, createNote, updateNote, fetchTagNames, fetchSpacedRepetitions, recordNoteReview, removeNoteFromSpacedRepetition } from '../api';
import type { BackendNote } from '../api';
import { DEFAULT_USER_ID } from '../api/config';

interface Note {
  id: string;
  title: string;
  content?: string;
  tags?: string[];
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

// Helper to extract title from note content
function extractNoteTitle(note: BackendNote): string {
  if (note.content?.title) {
    return note.content.title;
  }
  const bodyStr = typeof note.content?.body === 'string' ? note.content.body : '';
  if (bodyStr) {
    const headingMatch = bodyStr.match(/^#\s*(.+)/m);
    if (headingMatch) return headingMatch[1].trim();
  }
  const textStr: string = typeof (note.content as Record<string, unknown>)?.text === 'string' ? ((note.content as Record<string, unknown>).text as string) : '';
  if (textStr) {
    const headingMatch = textStr.match(/^#\s*(.+)/m);
    if (headingMatch) return headingMatch[1].trim();
  }
  return note.subject ? `${note.subject} Notes` : `Note ${note.id}`;
}

// Helper to extract body content from note (supports body, text, or other string fields from backend)
function extractNoteContent(note: BackendNote): string {
  if (note.content?.body) {
    return typeof note.content.body === 'string' ? note.content.body : JSON.stringify(note.content.body);
  }
  const c = note.content as Record<string, unknown> | undefined;
  if (c?.text && typeof c.text === 'string') return c.text;
  if (c && typeof c === 'object') {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(c)) {
      if (key === 'title' && typeof value === 'string') parts.push(`# ${value}`);
      else if (typeof value === 'string' && (key === 'summary' || key === 'example' || key === 'text')) parts.push(value);
    }
    if (parts.length) return parts.join('\n\n');
  }
  return '';
}

// Transform backend notes to folder structure grouped by subject
function groupNotesIntoFolders(notes: BackendNote[]): LectureFolder[] {
  const folderMap = new Map<string, Note[]>();

  notes.forEach(note => {
    const subject = note.subject || 'Uncategorized';
    if (!folderMap.has(subject)) {
      folderMap.set(subject, []);
    }
    folderMap.get(subject)!.push({
      id: note.id.toString(),
      title: extractNoteTitle(note),
      content: extractNoteContent(note),
      tags: note.tags || []
    });
  });

  const folders: LectureFolder[] = [];
  let index = 1;

  folderMap.forEach((folderNotes, folderName) => {
    folders.push({
      id: index.toString(),
      name: folderName,
      notes: folderNotes,
      isExpanded: index === 1 // Expand first folder by default
    });
    index++;
  });

  return folders;
}

const Notes: React.FC<NotesProps> = ({ onNavigate }) => {
  const [mainSidebarTab, setMainSidebarTab] = useState('notes');
  const [folders, setFolders] = useState<LectureFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setAllNotesData] = useState<BackendNote[]>([]);

  // Fetch notes from API
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        setError(null);

        const notesData = await fetchNotes();
        setAllNotesData(notesData);

        // Group notes into folders by subject
        const groupedFolders = groupNotesIntoFolders(notesData);

        // If no notes from API, use placeholder folders
        if (groupedFolders.length === 0) {
          const placeholderFolders: LectureFolder[] = [
            {
              id: '1',
              name: 'Getting Started',
              notes: [
                {
                  id: 'placeholder-1',
                  title: 'Welcome to Notes',
                  content: '# Welcome!\n\nStart creating notes to see them here. Notes will be grouped by subject.',
                  tags: []
                }
              ],
              isExpanded: true
            }
          ];
          setFolders(placeholderFolders);

          // Set initial tab
          setOpenTabs([{ id: 'placeholder-1', title: 'Welcome to Notes', folderId: '1' }]);
          setActiveTabId('placeholder-1');
        } else {
          setFolders(groupedFolders);

          // Set initial tab to first note of first folder
          if (groupedFolders[0]?.notes[0]) {
            const firstNote = groupedFolders[0].notes[0];
            setOpenTabs([{ id: firstNote.id, title: firstNote.title, folderId: groupedFolders[0].id }]);
            setActiveTabId(firstNote.id);
          }
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
        setError('Failed to load notes. Please check if the backend is running.');
        // Set fallback empty state
        setFolders([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, []);

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notesSidebarCollapsed, setNotesSidebarCollapsed] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAIMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [aiInput, setAIInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [spacedRepNoteIds, setSpacedRepNoteIds] = useState<Set<number>>(new Set());
  const [spacedRepToggling, setSpacedRepToggling] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [availableTagNames, setAvailableTagNames] = useState<string[]>([]);
  const [tagSaving, setTagSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorTitleRef = useRef('');
  const editorBodyRef = useRef('');
  // --- AI-powered summary & export states ---
  const [aiSummary, setAISummary] = useState('');
  const [aiQuestions, setAIQuestions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAI, setIsSavingAI] = useState(false);



  const editorRef = useRef<HTMLDivElement>(null);

  const loadSpacedRepetitions = () => {
    fetchSpacedRepetitions(DEFAULT_USER_ID)
      .then((reps) => setSpacedRepNoteIds(new Set(reps.map((r) => r.note_id))))
      .catch(() => setSpacedRepNoteIds(new Set()));
  };

  useEffect(() => {
    loadSpacedRepetitions();
  }, []);

  useEffect(() => {
    fetchTagNames(DEFAULT_USER_ID)
      .then(setAvailableTagNames)
      .catch(() => setAvailableTagNames([]));
  }, []);

  useEffect(() => {
    if (!activeTabId || activeTabId.startsWith('placeholder')) return;
    const noteId = parseInt(activeTabId, 10);
    if (Number.isNaN(noteId) || !spacedRepNoteIds.has(noteId)) return;
    recordNoteReview(noteId, DEFAULT_USER_ID).catch(() => {});
  }, [activeTabId, spacedRepNoteIds]);

  const handleSpacedRepToggle = async (enabled: boolean) => {
    if (!activeNote || activeTabId.startsWith('placeholder')) return;
    const noteId = parseInt(activeNote.id, 10);
    if (Number.isNaN(noteId)) return;
    setSpacedRepToggling(true);
    try {
      if (enabled) {
        await recordNoteReview(noteId, DEFAULT_USER_ID);
      } else {
        await removeNoteFromSpacedRepetition(noteId, DEFAULT_USER_ID);
      }
      loadSpacedRepetitions();
    } catch (err) {
      console.error('Spaced repetition toggle failed:', err);
    } finally {
      setSpacedRepToggling(false);
    }
  };

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
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</span>
                      {note.tags && note.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {note.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.65rem',
                                backgroundColor: '#e5e7eb',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                color: '#4b5563'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {note.tags.length > 3 && (
                            <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                              +{note.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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

  // Get the currently active note
  const getActiveNote = (): Note | null => {
    for (const folder of folders) {
      const note = folder.notes.find(n => n.id === activeTabId);
      if (note) return note;
      if (folder.subfolders) {
        for (const subfolder of folder.subfolders) {
          const subNote = subfolder.notes.find(n => n.id === activeTabId);
          if (subNote) return subNote;
        }
      }
    }
    return null;
  };

  const activeNote = getActiveNote();

  // Sync editor state when active note changes
  useEffect(() => {
    if (activeNote) {
      setEditorTitle(activeNote.title);
      setEditorBody(activeNote.content ?? '');
      editorTitleRef.current = activeNote.title;
      editorBodyRef.current = activeNote.content ?? '';
    }
  }, [activeTabId, activeNote?.id]);

  const handleCreateFolder = () => {
    const name = window.prompt('Folder name');
    if (!name?.trim()) return;
    const newFolder: LectureFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim(),
      notes: [],
      isExpanded: true,
    };
    setFolders((prev) => [newFolder, ...prev]);
  };

  const pendingSaveRef = useRef<{ noteId: string; title: string; body: string }>({ noteId: '', title: '', body: '' });
  const persistNote = useRef<(noteId: string, title: string, body: string) => void>(() => {});
  persistNote.current = (noteId: string, title: string, body: string) => {
    if (!noteId || noteId.startsWith('placeholder')) return;
    const id = parseInt(noteId, 10);
    if (Number.isNaN(id)) return;
    setSaveStatus('saving');
    updateNote(id, { content: { title: title || 'Untitled Note', body } })
      .then((updated) => {
        const newTitle = extractNoteTitle(updated);
        const newContent = extractNoteContent(updated);
        setFolders((prev) =>
          prev.map((folder) => ({
            ...folder,
            notes: folder.notes.map((n) =>
              n.id === noteId ? { ...n, title: newTitle, content: newContent } : n
            ),
          }))
        );
        setOpenTabs((tabs) =>
          tabs.map((t) => (t.id === noteId ? { ...t, title: newTitle } : t))
        );
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch((err) => {
        console.error('Failed to save note:', err);
        setSaveStatus('idle');
        setError(err instanceof Error ? err.message : 'Failed to save note.');
      });
  };

  const scheduleSave = () => {
    pendingSaveRef.current = {
      noteId: activeTabId,
      title: editorTitleRef.current,
      body: editorBodyRef.current,
    };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const { noteId, title, body } = pendingSaveRef.current;
      persistNote.current(noteId, title, body);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEditorTitle(v);
    editorTitleRef.current = v;
    scheduleSave();
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setEditorBody(v);
    editorBodyRef.current = v;
    scheduleSave();
  };

  const handleAddTag = (tagName: string) => {
    if (!activeNote || activeNote.id.startsWith('placeholder')) return;
    const currentTags = activeNote.tags ?? [];
    if (currentTags.includes(tagName)) return;
    const newTags = [...currentTags, tagName];
    const noteId = parseInt(activeNote.id, 10);
    if (Number.isNaN(noteId)) return;
    setTagSaving(true);
    updateNote(noteId, {
      content: { title: editorTitleRef.current || 'Untitled Note', body: editorBodyRef.current },
      tags: newTags,
    })
      .then((updated) => {
        const updatedTags = updated.tags ?? [];
        setFolders((prev) =>
          prev.map((folder) => ({
            ...folder,
            notes: folder.notes.map((n) =>
              n.id === activeNote.id ? { ...n, tags: updatedTags } : n
            ),
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to add tag:', err);
        setError(err instanceof Error ? err.message : 'Failed to add tag.');
      })
      .finally(() => setTagSaving(false));
  };

  const handleRemoveTag = (tagName: string) => {
    if (!activeNote || activeNote.id.startsWith('placeholder')) return;
    const currentTags = activeNote.tags ?? [];
    const newTags = currentTags.filter((t) => t !== tagName);
    const noteId = parseInt(activeNote.id, 10);
    if (Number.isNaN(noteId)) return;
    setTagSaving(true);
    updateNote(noteId, {
      content: { title: editorTitleRef.current || 'Untitled Note', body: editorBodyRef.current },
      tags: newTags,
    })
      .then((updated) => {
        const updatedTags = updated.tags ?? [];
        setFolders((prev) =>
          prev.map((folder) => ({
            ...folder,
            notes: folder.notes.map((n) =>
              n.id === activeNote.id ? { ...n, tags: updatedTags } : n
            ),
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to remove tag:', err);
        setError(err instanceof Error ? err.message : 'Failed to remove tag.');
      })
      .finally(() => setTagSaving(false));
  };

  const handleCreateNote = async () => {
    const subject =
      folders.length > 0 ? folders[0].name : 'Uncategorized';
    try {
      setError(null);
      const created = await createNote(
        {
          content: { title: 'Untitled Note', body: '' },
          subject,
          tags: [],
        },
        DEFAULT_USER_ID
      );
      const notesData = await fetchNotes(DEFAULT_USER_ID);
      setAllNotesData(notesData);
      const grouped = groupNotesIntoFolders(notesData);
      setFolders(grouped);
      const newNote = {
        id: created.id.toString(),
        title: extractNoteTitle(created),
        content: extractNoteContent(created),
        tags: created.tags || [],
      };
      const folder = grouped.find((f) => f.name === subject);
      const folderId = folder?.id ?? grouped[0]?.id ?? '1';
      setOpenTabs((tabs) => [
        ...tabs,
        { id: newNote.id, title: newNote.title, folderId },
      ]);
      setActiveTabId(newNote.id);
    } catch (err) {
      console.error('Failed to create note:', err);
      setError(err instanceof Error ? err.message : 'Failed to create note.');
    }
  };

  if (loading) {
    return (
      <div className="notes-page-container">
        <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />
        <div className="notes-content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%' }}>
            <p>Loading notes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-page-container">
      <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />

      <div className="notes-content-wrapper">
        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            margin: '1rem',
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100
          }}>
            {error}
          </div>
        )}

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
            {activeNote ? (
              <>
                {/* Spaced repetition toggle - top right when note is open */}
                {!activeNote.id.startsWith('placeholder') && (
                  <div className="note-spaced-rep-toggle">
                    <Repeat size={16} aria-hidden />
                    <label className="note-spaced-rep-label">
                      <span>Mark for spaced repetition</span>
                      <input
                        type="checkbox"
                        checked={spacedRepNoteIds.has(parseInt(activeNote.id, 10))}
                        disabled={spacedRepToggling}
                        onChange={(e) => handleSpacedRepToggle(e.target.checked)}
                        className="note-spaced-rep-checkbox"
                      />
                      <span className="note-spaced-rep-slider" />
                    </label>
                  </div>
                )}

                {/* Editable title - input for real notes, static for placeholder */}
                {activeNote.id.startsWith('placeholder') ? (
                  <h1 className="note-title-editable">{activeNote.title}</h1>
                ) : (
                  <>
                    <div className="note-editor-header">
                      <input
                        className="note-title-input"
                        value={editorTitle}
                        onChange={handleTitleChange}
                        placeholder="Note title"
                        aria-label="Note title"
                      />
                      {saveStatus !== 'idle' && (
                        <span className={`note-save-status ${saveStatus}`}>
                          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                        </span>
                      )}
                    </div>
                    {/* Tags section: chips + add */}
                    <div className="note-tags-section">
                      <div className="note-tags-row">
                        <Tag size={16} className="note-tags-icon" aria-hidden />
                        {(activeNote.tags ?? []).map((tag, idx) => (
                          <span key={idx} className="note-tag-chip">
                            {tag}
                            <button
                              type="button"
                              className="note-tag-remove"
                              onClick={() => handleRemoveTag(tag)}
                              disabled={tagSaving}
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        <div className="note-tag-add">
                          <select
                            className="note-tag-select"
                            value=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) {
                                handleAddTag(v);
                                e.target.value = '';
                              }
                            }}
                            disabled={tagSaving}
                            aria-label="Add tag"
                          >
                            <option value="">Add tag...</option>
                            {availableTagNames
                              .filter((name) => !(activeNote.tags ?? []).includes(name))
                              .map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <textarea
                      className="note-body-textarea"
                      value={editorBody}
                      onChange={handleBodyChange}
                      placeholder="Start writing your note..."
                      aria-label="Note content"
                      spellCheck
                    />
                  </>
                )}

                {/* Read-only view for placeholder note */}
                {activeNote.id.startsWith('placeholder') && (
                  <>
                    {activeNote.tags && activeNote.tags.length > 0 && (
                      <div className="note-tags-row">
                        <Tag size={16} style={{ color: '#6b7280' }} />
                        {activeNote.tags.map((tag, idx) => (
                          <span key={idx} className="note-tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="note-body">
                      {activeNote.content ? (
                        activeNote.content.split('\n').map((line, idx) => {
                          if (line.startsWith('## ')) {
                            return <h2 key={idx}>{line.substring(3)}</h2>;
                          } else if (line.startsWith('### ')) {
                            return <h3 key={idx}>{line.substring(4)}</h3>;
                          } else if (line.startsWith('# ')) {
                            return <h2 key={idx}>{line.substring(2)}</h2>;
                          } else if (line.startsWith('- ')) {
                            return <li key={idx} style={{ marginLeft: '1.5rem' }}>{line.substring(2)}</li>;
                          } else if (line.trim() === '') {
                            return <br key={idx} />;
                          } else {
                            return <p key={idx}>{line}</p>;
                          }
                        })
                      ) : (
                        <p style={{ color: '#6b7280' }}>This note has no content yet.</p>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '50vh',
                color: '#6b7280'
              }}>
                <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Select a note to view its content</p>
              </div>
            )}

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

              {/* AI summary + export */}
              <div style={{ padding: 16, borderTop: '1px solid #eee', marginTop: 12 }}>
                <button
                  disabled={isGenerating || !activeNote || activeNote.id.startsWith('placeholder')}
                  onClick={async () => {
                    if (!activeNote) return;
                    setIsGenerating(true);
                    try {
                      const res = await fetch(
                        `/api/users/${DEFAULT_USER_ID}/generate-ai-note`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ note_id: activeNote.id }),
                        }
                      );
                      if (res.ok) {
                        const data = await res.json();
                        setAISummary(data.summary || '');
                        setAIQuestions(data.questions || data.exam_questions || '');
                      } else {
                        alert('Failed to generate summary');
                      }
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  {isGenerating ? 'Generating...' : 'Generate Summary Notes'}
                </button>

                {(aiSummary || aiQuestions) && (
                  <div style={{ marginTop: 12 }}>
                    <h3>Summary</h3>
                    <textarea
                      value={aiSummary}
                      onChange={(e) => setAISummary(e.target.value)}
                      rows={6}
                      style={{ width: '100%' }}
                    />

                    <h3>Exam Questions</h3>
                    <textarea
                      value={aiQuestions}
                      onChange={(e) => setAIQuestions(e.target.value)}
                      rows={4}
                      style={{ width: '100%' }}
                    />

                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={() =>
                          window.open(
                            `/api/notes/${activeNote?.id}/export?format=pdf`,
                            '_blank'
                          )
                        }
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `/api/notes/${activeNote?.id}/export?format=docx`,
                            '_blank'
                          )
                        }
                        style={{ marginLeft: 8 }}
                      >
                        Export DOCX
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Notes;
