import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
  Plus,
  Calendar,
  Clock,
  Tag,
  FileText,
  MessageSquare,
  Send,
  Calculator,
  TrendingUp,
  CheckCircle2,
  Circle,
  ChevronRight,
  Filter,
  Search,
  BookOpen,
  Target,
  Sparkles,
  X
} from 'lucide-react';
import './Grades.css';
import {
  fetchAssignments,
  fetchWeightedGrade,
  fetchNotes,
  createAssignment
} from '../api';
import { DEFAULT_USER_ID } from '../api/config';
import type {
  BackendAssignment,
  BackendNote,
  WeightedGradeResponse
} from '../api';

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: 'upcoming' | 'completed' | 'overdue';
  grade?: number;
  weight: number;
  tags: string[];
}

interface Note {
  id: string;
  title: string;
  tags: string[];
  preview: string;
}

interface CourseGrade {
  id: string;
  courseName: string;
  currentGrade: number;
  targetGrade: number;
  assignments: {
    name: string;
    grade: number;
    weight: number;
    completed: boolean;
  }[];
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo' | 'help';

interface GradesProps {
  onNavigate: (page: Page) => void;
}

// Helper to extract title from note content
function extractNoteTitle(note: BackendNote): string {
  if (note.content?.title) {
    return note.content.title;
  }
  if (note.content?.body) {
    const bodyStr = typeof note.content.body === 'string' ? note.content.body : '';
    const headingMatch = bodyStr.match(/^#\s*(.+)/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
  }
  return note.subject ? `${note.subject} Notes` : `Note ${note.id}`;
}

// Helper to extract preview from note content
function extractNotePreview(note: BackendNote): string {
  if (note.content?.body) {
    const bodyStr = typeof note.content.body === 'string' ? note.content.body : '';
    // Remove markdown headers and get first 100 chars
    const cleanText = bodyStr.replace(/^#+\s*/gm, '').trim();
    return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;
  }
  return 'No preview available';
}

// Helper to determine assignment status
function getAssignmentStatus(assignment: BackendAssignment): 'upcoming' | 'completed' | 'overdue' {
  const now = new Date();
  const dueDate = new Date(assignment.due_date);
  
  if (assignment.grade !== null) {
    return 'completed';
  }
  if (dueDate < now) {
    return 'overdue';
  }
  return 'upcoming';
}

// Helper to transform backend assignment to frontend format
function transformAssignment(a: BackendAssignment): Assignment {
  return {
    id: a.id.toString(),
    title: a.name,
    course: a.tags.length > 0 ? a.tags[0] : 'General',
    dueDate: a.due_date.split('T')[0],
    status: getAssignmentStatus(a),
    grade: a.grade ?? undefined,
    weight: a.weight,
    tags: a.tags
  };
}

const Grades: React.FC<GradesProps> = ({ onNavigate }) => {
  const [mainSidebarTab, setMainSidebarTab] = useState('analytics');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [addAssignmentSubmitting, setAddAssignmentSubmitting] = useState(false);
  const [addAssignmentError, setAddAssignmentError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ title: '', dueDate: '', course: '', weight: '10' });
  const [showGradeCalculator, setShowGradeCalculator] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allNotes, setAllNotes] = useState<BackendNote[]>([]);
  const [weightedGradeData, setWeightedGradeData] = useState<WeightedGradeResponse | null>(null);
  const [targetGrade, setTargetGrade] = useState(90);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [assignmentsData, notesData, weightedGrade] = await Promise.all([
        fetchAssignments(DEFAULT_USER_ID).catch(() => []),
        fetchNotes(DEFAULT_USER_ID).catch(() => []),
        fetchWeightedGrade(DEFAULT_USER_ID).catch(() => null)
      ]);

      const transformedAssignments = assignmentsData.map(transformAssignment);
      setAssignments(transformedAssignments);
      setAllNotes(notesData);
      setWeightedGradeData(weightedGrade);
    } catch (err) {
      console.error('Failed to load grades data:', err);
      setError('Failed to load data. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddAssignmentError(null);
    const title = addForm.title.trim();
    const dueDate = addForm.dueDate;
    const weight = parseFloat(addForm.weight) || 0;
    if (!title || !dueDate) {
      setAddAssignmentError('Title and due date are required.');
      return;
    }
    setAddAssignmentSubmitting(true);
    try {
      const dueIso = new Date(dueDate).toISOString();
      const tags = addForm.course.trim() ? [addForm.course.trim()] : [];
      await createAssignment(
        { name: title, due_date: dueIso, tags, weight },
        DEFAULT_USER_ID
      );
      setAddForm({ title: '', dueDate: '', course: '', weight: '10' });
      setShowAddAssignment(false);
      await loadData();
    } catch (err) {
      setAddAssignmentError(err instanceof Error ? err.message : 'Failed to create assignment.');
    } finally {
      setAddAssignmentSubmitting(false);
    }
  };

  // Find related notes based on matching tags
  const getRelatedNotes = useMemo(() => {
    return (assignment: Assignment): Note[] => {
      if (!assignment.tags || assignment.tags.length === 0) {
        return [];
      }

      const assignmentTagsLower = new Set(assignment.tags.map(t => t.toLowerCase()));
      
      return allNotes
        .filter(note => {
          const noteTags = note.tags || [];
          return noteTags.some(tag => assignmentTagsLower.has(tag.toLowerCase()));
        })
        .map(note => ({
          id: note.id.toString(),
          title: extractNoteTitle(note),
          tags: note.tags || [],
          preview: extractNotePreview(note)
        }));
    };
  }, [allNotes]);

  // Calculate course grades from assignments grouped by first tag (course)
  const courseGrades = useMemo((): CourseGrade[] => {
    // Group assignments by course (first tag)
    const courseMap = new Map<string, BackendAssignment[]>();
    
    assignments.forEach(a => {
      const course = a.course || 'General';
      if (!courseMap.has(course)) {
        courseMap.set(course, []);
      }
      // Find the original backend assignment data
      courseMap.get(course)!.push({
        id: parseInt(a.id),
        user_id: 1,
        canvas_id: null,
        name: a.title,
        due_date: a.dueDate,
        tags: a.tags,
        grade: a.grade ?? null,
        weight: a.weight,
        created_at: ''
      });
    });

    const courses: CourseGrade[] = [];
    
    courseMap.forEach((courseAssignments, courseName) => {
      // Calculate weighted grade for this course
      let totalWeight = 0;
      let weightedSum = 0;
      
      const assignmentDetails = courseAssignments.map(a => {
        const isCompleted = a.grade !== null;
        if (isCompleted && a.weight > 0) {
          weightedSum += (a.grade || 0) * a.weight;
          totalWeight += a.weight;
        }
        return {
          name: a.name,
          grade: a.grade || 0,
          weight: a.weight,
          completed: isCompleted
        };
      });

      const currentGrade = totalWeight > 0 ? weightedSum / totalWeight : 0;

      courses.push({
        id: courseName,
        courseName,
        currentGrade: Math.round(currentGrade * 100) / 100,
        targetGrade,
        assignments: assignmentDetails
      });
    });

    return courses;
  }, [assignments, targetGrade]);

  const handleTabChange = (tab: string) => {
    setMainSidebarTab(tab);
    onNavigate(tab as Page);
  };

  const calculateRequiredGrade = (course: CourseGrade) => {
    const completedWeight = course.assignments
      .filter(a => a.completed)
      .reduce((sum, a) => sum + a.weight, 0);

    const currentPoints = course.assignments
      .filter(a => a.completed)
      .reduce((sum, a) => sum + (a.grade * a.weight / 100), 0);

    const remainingWeight = 100 - completedWeight;

    if (remainingWeight === 0) return null;

    const requiredPoints = course.targetGrade - currentPoints;
    const requiredGrade = (requiredPoints / remainingWeight) * 100;

    return Math.max(0, Math.min(100, requiredGrade));
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || assignment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const upcomingAssignments = assignments.filter(a => a.status === 'upcoming');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  // Get related notes for the selected assignment
  const relatedNotesForSelected = selectedAssignment ? getRelatedNotes(selectedAssignment) : [];

  if (loading) {
    return (
      <div className="grades-page-container">
        <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />
        <div className="grades-content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <p>Loading grades...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grades-page-container">
      <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />

      <div className="grades-content-wrapper">
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

        {/* Add Assignment Modal */}
        {showAddAssignment && (
          <div className="add-assignment-modal-overlay" onClick={() => !addAssignmentSubmitting && setShowAddAssignment(false)}>
            <div className="add-assignment-modal" onClick={e => e.stopPropagation()}>
              <div className="add-assignment-modal-header">
                <h3>Add Assignment</h3>
                <button
                  type="button"
                  className="add-assignment-modal-close"
                  onClick={() => !addAssignmentSubmitting && setShowAddAssignment(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddAssignmentSubmit} className="add-assignment-form">
                {addAssignmentError && (
                  <div className="add-assignment-form-error">{addAssignmentError}</div>
                )}
                <label>
                  Title
                  <input
                    type="text"
                    value={addForm.title}
                    onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Midterm Essay"
                    required
                    autoFocus
                  />
                </label>
                <label>
                  Due Date
                  <input
                    type="date"
                    value={addForm.dueDate}
                    onChange={e => setAddForm(f => ({ ...f, dueDate: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Course / Tag
                  <input
                    type="text"
                    value={addForm.course}
                    onChange={e => setAddForm(f => ({ ...f, course: e.target.value }))}
                    placeholder="e.g. HCI"
                  />
                </label>
                <label>
                  Weight (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={addForm.weight}
                    onChange={e => setAddForm(f => ({ ...f, weight: e.target.value }))}
                  />
                </label>
                <div className="add-assignment-form-actions">
                  <button
                    type="button"
                    className="add-assignment-btn-cancel"
                    onClick={() => setShowAddAssignment(false)}
                    disabled={addAssignmentSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="add-assignment-btn-submit" disabled={addAssignmentSubmitting}>
                    {addAssignmentSubmitting ? 'Adding…' : 'Add Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Assignments Sidebar */}
        <aside className="assignments-sidebar">
          <div className="assignments-sidebar-header">
            <h2>Assignments</h2>
            <button
              className="add-assignment-btn"
              onClick={() => setShowAddAssignment(true)}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="assignments-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({assignments.length})
            </button>
            <button
              className={`filter-tab ${filterStatus === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilterStatus('upcoming')}
            >
              Upcoming ({upcomingAssignments.length})
            </button>
            <button
              className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Completed ({completedAssignments.length})
            </button>
          </div>

          <div className="assignments-list">
            {filteredAssignments.map(assignment => (
              <div
                key={assignment.id}
                className={`assignment-card ${selectedAssignment?.id === assignment.id ? 'selected' : ''}`}
                onClick={() => setSelectedAssignment(assignment)}
              >
                <div className="assignment-card-header">
                  <div className="assignment-status-icon">
                    {assignment.status === 'completed' ? (
                      <CheckCircle2 size={18} color="#6B9080" />
                    ) : (
                      <Circle size={18} color="#9ca3af" />
                    )}
                  </div>
                  <div className="assignment-card-info">
                    <h3 className="assignment-card-title">{assignment.title}</h3>
                    <p className="assignment-card-course">{assignment.course}</p>
                  </div>
                </div>
                <div className="assignment-card-meta">
                  <div className="meta-item">
                    <Calendar size={12} />
                    <span>{new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="meta-item">
                    <Target size={12} />
                    <span>{assignment.weight}%</span>
                  </div>
                  {assignment.grade !== undefined && (
                    <div className="grade-badge">{assignment.grade}%</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            className="calculator-toggle-btn"
            onClick={() => setShowGradeCalculator(!showGradeCalculator)}
          >
            <Calculator size={18} />
            <span>Grade Calculator</span>
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="grades-main">
          {showGradeCalculator ? (
            <div className="grade-calculator">
              <div className="calculator-header">
                <h2>Grade Calculator</h2>
                <button
                  className="close-calculator-btn"
                  onClick={() => setShowGradeCalculator(false)}
                >
                  Close
                </button>
              </div>

              {/* Overall Weighted Grade from API */}
              {weightedGradeData && (
                <div className="overall-grade-card" style={{
                  background: 'linear-gradient(135deg, #6B9080 0%, #A4C3B2 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>Overall Weighted Grade</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
                        Based on {weightedGradeData.total_weight_used || 0}% of total weight
                      </p>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                      {weightedGradeData.weighted_grade !== null 
                        ? `${weightedGradeData.weighted_grade}%` 
                        : 'N/A'}
                    </div>
                  </div>
                  {weightedGradeData.message && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', opacity: 0.8 }}>
                      {weightedGradeData.message}
                    </p>
                  )}
                </div>
              )}

              {/* Target Grade Input */}
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ fontWeight: 500 }}>Target Grade:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(parseInt(e.target.value) || 90)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    width: '80px'
                  }}
                />
                <span>%</span>
              </div>

              <div className="calculator-content">
                {courseGrades.map(course => {
                  const required = calculateRequiredGrade(course);
                  return (
                    <div key={course.id} className="course-calculator-card">
                      <div className="course-calculator-header">
                        <h3>{course.courseName}</h3>
                        <div className="grade-display">
                          <div className="current-grade">
                            <span className="grade-label">Current</span>
                            <span className="grade-value">{course.currentGrade}%</span>
                          </div>
                          <ChevronRight size={20} color="#9ca3af" />
                          <div className="target-grade">
                            <span className="grade-label">Target</span>
                            <span className="grade-value">{course.targetGrade}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="assignments-breakdown">
                        {course.assignments.map((assignment, idx) => (
                          <div key={idx} className="breakdown-item">
                            <div className="breakdown-left">
                              {assignment.completed ? (
                                <CheckCircle2 size={16} color="#6B9080" />
                              ) : (
                                <Circle size={16} color="#9ca3af" />
                              )}
                              <span className="breakdown-name">{assignment.name}</span>
                            </div>
                            <div className="breakdown-right">
                              <span className="breakdown-weight">{assignment.weight}%</span>
                              {assignment.completed && (
                                <span className="breakdown-grade">{assignment.grade}%</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {required !== null && (
                        <div className="required-grade-card">
                          <TrendingUp size={20} />
                          <div className="required-info">
                            <span className="required-label">Required on remaining assignments:</span>
                            <span className="required-value">{required.toFixed(1)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : selectedAssignment ? (
            <>
              <div className="assignment-detail-header">
                <div className="detail-header-left">
                  <h1>{selectedAssignment.title}</h1>
                  <p className="detail-course">{selectedAssignment.course}</p>
                </div>
                <div className="detail-header-right">
                  <div className="detail-meta-item">
                    <Calendar size={16} />
                    <span>Due: {new Date(selectedAssignment.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="detail-meta-item">
                    <Target size={16} />
                    <span>Weight: {selectedAssignment.weight}%</span>
                  </div>
                  {selectedAssignment.grade !== undefined && (
                    <div className="detail-grade-large">{selectedAssignment.grade}%</div>
                  )}
                </div>
              </div>

              <div className="assignment-detail-content">
                <div className="detail-section">
                  <div className="section-title">
                    <Tag size={18} />
                    <h3>Tags</h3>
                  </div>
                  <div className="tags-list">
                    {selectedAssignment.tags.map((tag, idx) => (
                      <span key={idx} className="tag-chip">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    <BookOpen size={18} />
                    <h3>Related Notes</h3>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                      (Notes with matching tags)
                    </span>
                  </div>
                  <div className="related-notes-list">
                    {relatedNotesForSelected.length > 0 ? (
                      relatedNotesForSelected.map(note => (
                        <div key={note.id} className="related-note-card">
                          <div className="note-card-header">
                            <FileText size={16} />
                            <h4>{note.title}</h4>
                          </div>
                          <p className="note-preview">{note.preview}</p>
                          <div className="note-tags">
                            {note.tags.map((tag, idx) => (
                              <span key={idx} className="note-tag">{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '1rem', color: '#6b7280', textAlign: 'center' }}>
                        <p>No notes found with matching tags.</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                          Create notes with tags: {selectedAssignment.tags.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    <Sparkles size={18} />
                    <h3>Ask AI Assistant</h3>
                  </div>
                  <div className="ai-assistant-box">
                    <div className="ai-input-container">
                      <MessageSquare size={18} />
                      <input
                        type="text"
                        className="ai-input"
                        placeholder="Ask a question about this assignment..."
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && aiQuestion.trim()) {
                            console.log('AI Question:', aiQuestion);
                            setAiQuestion('');
                          }
                        }}
                      />
                      <button
                        className="ai-send-btn"
                        onClick={() => {
                          if (aiQuestion.trim()) {
                            console.log('AI Question:', aiQuestion);
                            setAiQuestion('');
                          }
                        }}
                        disabled={!aiQuestion.trim()}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                    <div className="ai-suggestions">
                      <span className="suggestion-label">Suggestions:</span>
                      <button className="suggestion-chip">Explain key concepts</button>
                      <button className="suggestion-chip">Study tips</button>
                      <button className="suggestion-chip">Common mistakes</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <FileText size={64} className="empty-icon" />
              <h3>Select an assignment</h3>
              <p>Choose an assignment to view details, related notes, and use the AI assistant</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Grades;