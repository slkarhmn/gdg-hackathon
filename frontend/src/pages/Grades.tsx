import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import './Grades.css';

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

const Grades: React.FC<GradesProps> = ({ onNavigate }) => {
  const [mainSidebarTab, setMainSidebarTab] = useState('analytics');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showGradeCalculator, setShowGradeCalculator] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');

  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'JavaFX GUI Application',
      course: 'Software Development',
      dueDate: '2026-02-10',
      status: 'upcoming',
      weight: 20,
      tags: ['javafx', 'gui', 'programming']
    },
    {
      id: '2',
      title: 'User Research Report',
      course: 'Human Computer Interaction',
      dueDate: '2026-02-05',
      status: 'upcoming',
      weight: 15,
      tags: ['hci', 'research', 'user-testing']
    },
    {
      id: '3',
      title: 'Database Design Project',
      course: 'Database Systems',
      dueDate: '2026-01-28',
      status: 'completed',
      grade: 92,
      weight: 25,
      tags: ['sql', 'database', 'design']
    },
    {
      id: '4',
      title: 'Binary Search Tree Implementation',
      course: 'Data Structures',
      dueDate: '2026-01-25',
      status: 'completed',
      grade: 88,
      weight: 20,
      tags: ['algorithms', 'data-structures', 'java']
    }
  ]);

  const [relatedNotes] = useState<{ [key: string]: Note[] }>({
    '1': [
      { id: 'n1', title: 'JavaFX Basics - Lecture 5', tags: ['javafx', 'gui'], preview: 'Introduction to JavaFX scene graph, layouts, and event handling...' },
      { id: 'n2', title: 'JavaFX Advanced Components', tags: ['javafx', 'programming'], preview: 'TableView, TreeView, and custom controls in JavaFX...' },
      { id: 'n3', title: 'GUI Design Patterns', tags: ['gui', 'design'], preview: 'MVC, MVP, and MVVM patterns for GUI applications...' }
    ],
    '2': [
      { id: 'n4', title: 'User Research Methods', tags: ['hci', 'research'], preview: 'Qualitative and quantitative research methods...' },
      { id: 'n5', title: 'Usability Testing Guide', tags: ['hci', 'user-testing'], preview: 'Planning and conducting usability tests...' }
    ],
    '3': [
      { id: 'n6', title: 'SQL Fundamentals', tags: ['sql', 'database'], preview: 'SELECT, JOIN, and aggregate functions...' },
      { id: 'n7', title: 'Database Normalization', tags: ['database', 'design'], preview: '1NF, 2NF, 3NF, and BCNF explained...' }
    ],
    '4': [
      { id: 'n8', title: 'Binary Trees Overview', tags: ['data-structures'], preview: 'Tree traversal algorithms and properties...' },
      { id: 'n9', title: 'BST Operations', tags: ['algorithms', 'data-structures'], preview: 'Insert, delete, and search operations...' }
    ]
  });

  const [courseGrades] = useState<CourseGrade[]>([
    {
      id: '1',
      courseName: 'Human Computer Interaction',
      currentGrade: 87,
      targetGrade: 90,
      assignments: [
        { name: 'Assignment 1', grade: 85, weight: 15, completed: true },
        { name: 'Assignment 2', grade: 90, weight: 15, completed: true },
        { name: 'Midterm', grade: 88, weight: 30, completed: true },
        { name: 'Final Project', grade: 0, weight: 40, completed: false }
      ]
    },
    {
      id: '2',
      courseName: 'Database Systems',
      currentGrade: 92,
      targetGrade: 95,
      assignments: [
        { name: 'SQL Assignment', grade: 95, weight: 20, completed: true },
        { name: 'Design Project', grade: 92, weight: 25, completed: true },
        { name: 'Final Exam', grade: 0, weight: 55, completed: false }
      ]
    }
  ]);

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
      assignment.course.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || assignment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const upcomingAssignments = assignments.filter(a => a.status === 'upcoming');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  return (
    <div className="grades-page-container">
      <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />

      <div className="grades-content-wrapper">
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
                  </div>
                  <div className="related-notes-list">
                    {relatedNotes[selectedAssignment.id]?.map(note => (
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
                    ))}
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