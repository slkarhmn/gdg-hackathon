import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { 
  BookOpen, 
  FileText, 
  Calendar,
  Tag,
  TrendingUp,
  Award,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';
import './Grades.css';

interface AssignmentGrade {
  id: string;
  title: string;
  subject: string;
  grade: number;
  maxGrade: number;
  date: string;
  topics: string[];
  status: 'graded' | 'pending' | 'upcoming';
}

interface NoteResource {
  id: string;
  title: string;
  topic: string;
  lastReviewed: string;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades';

interface GradesProps {
  onNavigate: (page: Page) => void;
}

const Grades: React.FC<GradesProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('grades');
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>('1');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate(tab as Page);
  };

  const assignments: AssignmentGrade[] = [
    {
      id: '1',
      title: 'JavaFX GUI Development Test',
      subject: 'Object-Oriented Programming',
      grade: 87,
      maxGrade: 100,
      date: 'Jan 28, 2026',
      topics: ['JavaFX', 'GUI Design', 'Event Handling', 'Scene Builder'],
      status: 'graded'
    },
    {
      id: '2',
      title: 'Database Normalization Assignment',
      subject: 'Database Systems',
      grade: 92,
      maxGrade: 100,
      date: 'Jan 25, 2026',
      topics: ['Normalization', 'SQL', 'Entity Relationships', '3NF'],
      status: 'graded'
    },
    {
      id: '3',
      title: 'UX Research Project',
      subject: 'Human Computer Interaction',
      grade: 0,
      maxGrade: 100,
      date: 'Feb 5, 2026',
      topics: ['User Research', 'Personas', 'Usability Testing', 'Prototyping'],
      status: 'upcoming'
    },
    {
      id: '4',
      title: 'Algorithm Analysis Quiz',
      subject: 'Data Structures',
      grade: 0,
      maxGrade: 50,
      date: 'Feb 1, 2026',
      topics: ['Big O Notation', 'Sorting Algorithms', 'Time Complexity'],
      status: 'pending'
    },
    {
      id: '5',
      title: 'Process Scheduling Lab',
      subject: 'Operating Systems',
      grade: 78,
      maxGrade: 100,
      date: 'Jan 20, 2026',
      topics: ['Process Management', 'CPU Scheduling', 'FCFS', 'Round Robin'],
      status: 'graded'
    },
    {
      id: '6',
      title: 'Midterm Examination',
      subject: 'Human Computer Interaction',
      grade: 85,
      maxGrade: 100,
      date: 'Jan 15, 2026',
      topics: ['Design Principles', 'Cognitive Psychology', 'Interface Design'],
      status: 'graded'
    }
  ];

  const noteResources: { [key: string]: NoteResource[] } = {
    '1': [
      { id: 'n1', title: 'JavaFX Basics - Lecture 12', topic: 'JavaFX', lastReviewed: '2 days ago' },
      { id: 'n2', title: 'Scene Builder Tutorial', topic: 'GUI Design', lastReviewed: '4 days ago' },
      { id: 'n3', title: 'Event Handling in JavaFX', topic: 'Event Handling', lastReviewed: '1 week ago' },
      { id: 'n4', title: 'Layout Managers - FXML', topic: 'JavaFX', lastReviewed: '5 days ago' },
      { id: 'n5', title: 'JavaFX Controls Deep Dive', topic: 'GUI Design', lastReviewed: '3 days ago' }
    ],
    '2': [
      { id: 'n6', title: 'Database Normalization Rules', topic: 'Normalization', lastReviewed: '1 week ago' },
      { id: 'n7', title: 'SQL Joins and Relationships', topic: 'SQL', lastReviewed: '6 days ago' },
      { id: 'n8', title: 'Third Normal Form (3NF)', topic: '3NF', lastReviewed: '4 days ago' }
    ],
    '3': [
      { id: 'n9', title: 'User Research Methods', topic: 'User Research', lastReviewed: '2 days ago' },
      { id: 'n10', title: 'Creating User Personas', topic: 'Personas', lastReviewed: '1 day ago' },
      { id: 'n11', title: 'Usability Testing Guide', topic: 'Usability Testing', lastReviewed: '3 days ago' },
      { id: 'n12', title: 'Rapid Prototyping Techniques', topic: 'Prototyping', lastReviewed: 'Today' }
    ],
    '4': [
      { id: 'n13', title: 'Big O Notation Explained', topic: 'Big O Notation', lastReviewed: '1 week ago' },
      { id: 'n14', title: 'Sorting Algorithms Comparison', topic: 'Sorting Algorithms', lastReviewed: '5 days ago' }
    ],
    '5': [
      { id: 'n15', title: 'Process Management Overview', topic: 'Process Management', lastReviewed: '2 weeks ago' },
      { id: 'n16', title: 'CPU Scheduling Algorithms', topic: 'CPU Scheduling', lastReviewed: '10 days ago' }
    ],
    '6': [
      { id: 'n17', title: 'Design Principles - Lecture 3', topic: 'Design Principles', lastReviewed: '3 weeks ago' },
      { id: 'n18', title: 'Cognitive Psychology in HCI', topic: 'Cognitive Psychology', lastReviewed: '2 weeks ago' }
    ]
  };

  const getGradePercentage = (grade: number, max: number) => {
    return Math.round((grade / max) * 100);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'grade-a';
    if (percentage >= 80) return 'grade-b';
    if (percentage >= 70) return 'grade-c';
    if (percentage >= 60) return 'grade-d';
    return 'grade-f';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      graded: { text: 'Graded', class: 'status-graded' },
      pending: { text: 'Pending', class: 'status-pending' },
      upcoming: { text: 'Upcoming', class: 'status-upcoming' }
    };
    return badges[status as keyof typeof badges];
  };

  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);
  const selectedNotes = selectedAssignment ? noteResources[selectedAssignment] || [] : [];

  // Calculate overall stats
  const gradedAssignments = assignments.filter(a => a.status === 'graded');
  const totalPercentage = gradedAssignments.length > 0
    ? Math.round(gradedAssignments.reduce((sum, a) => sum + getGradePercentage(a.grade, a.maxGrade), 0) / gradedAssignments.length)
    : 0;

  return (
    <div className="grades-container">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
      <main className="grades-main">
        <Header userName="Saachi" />

        {/* Stats Overview */}
        <div className="grades-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalPercentage}%</div>
              <div className="stat-label">Overall Average</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon award">
              <Award size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{gradedAssignments.length}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pending">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{assignments.filter(a => a.status !== 'graded').length}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grades-content">
          {/* Left Column - Assignments List */}
          <div className="assignments-column">
            <div className="column-header">
              <h2>Assignments</h2>
              <div className="header-actions">
                <button className="filter-btn">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="search-box">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="assignments-list">
              {assignments.map(assignment => {
                const percentage = getGradePercentage(assignment.grade, assignment.maxGrade);
                const statusBadge = getStatusBadge(assignment.status);
                
                return (
                  <div
                    key={assignment.id}
                    className={`assignment-card ${selectedAssignment === assignment.id ? 'active' : ''}`}
                    onClick={() => setSelectedAssignment(assignment.id)}
                  >
                    <div className="assignment-header">
                      <div className="assignment-title-section">
                        <h3>{assignment.title}</h3>
                        <p className="assignment-subject">{assignment.subject}</p>
                      </div>
                      <div className={`status-badge ${statusBadge.class}`}>
                        {statusBadge.text}
                      </div>
                    </div>

                    <div className="assignment-meta">
                      <div className="meta-item">
                        <Calendar size={14} />
                        <span>{assignment.date}</span>
                      </div>
                      {assignment.status === 'graded' && (
                        <div className={`grade-badge ${getGradeColor(percentage)}`}>
                          {assignment.grade}/{assignment.maxGrade} ({percentage}%)
                        </div>
                      )}
                    </div>

                    <div className="assignment-topics">
                      {assignment.topics.slice(0, 3).map((topic, idx) => (
                        <span key={idx} className="topic-tag">
                          <Tag size={10} />
                          {topic}
                        </span>
                      ))}
                      {assignment.topics.length > 3 && (
                        <span className="topic-tag more">+{assignment.topics.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Assignment Details & Resources */}
          <div className="details-column">
            {selectedAssignmentData ? (
              <>
                <div className="details-header">
                  <div className="details-title-section">
                    <h2>{selectedAssignmentData.title}</h2>
                    <p className="details-subject">{selectedAssignmentData.subject}</p>
                  </div>
                  {selectedAssignmentData.status === 'graded' && (
                    <div className={`details-grade ${getGradeColor(getGradePercentage(selectedAssignmentData.grade, selectedAssignmentData.maxGrade))}`}>
                      <div className="grade-score">{selectedAssignmentData.grade}</div>
                      <div className="grade-max">/ {selectedAssignmentData.maxGrade}</div>
                    </div>
                  )}
                </div>

                <div className="details-info">
                  <div className="info-item">
                    <Calendar size={16} />
                    <span>Due: {selectedAssignmentData.date}</span>
                  </div>
                  <div className="info-item">
                    <BookOpen size={16} />
                    <span>{selectedNotes.length} Related Notes</span>
                  </div>
                </div>

                <div className="topics-section">
                  <h3>Topics Covered</h3>
                  <div className="topics-grid">
                    {selectedAssignmentData.topics.map((topic, idx) => (
                      <div key={idx} className="topic-chip">
                        <Tag size={14} />
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="resources-section">
                  <div className="section-header">
                    <h3>Study Resources</h3>
                    <span className="resource-count">{selectedNotes.length} notes</span>
                  </div>
                  
                  <div className="resources-list">
                    {selectedNotes.map(note => (
                      <div key={note.id} className="resource-item">
                        <div className="resource-icon">
                          <FileText size={18} />
                        </div>
                        <div className="resource-info">
                          <h4>{note.title}</h4>
                          <p className="resource-meta">
                            <Tag size={12} />
                            {note.topic} • Reviewed {note.lastReviewed}
                          </p>
                        </div>
                        <ChevronRight size={18} className="resource-arrow" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <BookOpen size={48} />
                <h3>Select an assignment</h3>
                <p>Choose an assignment to view details and related study resources</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Grades;