import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Send,
  Calendar,
  Users,
  BookOpen,
  Search,
  Plus,
  Filter,
  Download
} from 'lucide-react';
import './ProfessorDashboard.css';

interface LectureNote {
  id: string;
  title: string;
  fileName: string;
  uploadDate: string;
  size: string;
}

interface Week {
  weekNumber: number;
  title: string;
  lectures: LectureNote[];
  isExpanded: boolean;
}

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  studentCount: number;
  weeks: Week[];
  isExpanded: boolean;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo' | 'help' | 'professor';

interface ProfessorDashboardProps {
  onNavigate: (page: Page) => void;
  graphService: any;
  userProfile: any;
}

const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({ onNavigate, graphService, userProfile }) => {
  const [mainSidebarTab, setMainSidebarTab] = useState('professor');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedLectures, setSelectedLectures] = useState<Set<string>>(new Set());
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [quizPrompt, setQuizPrompt] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [courses, setCourses] = useState<Course[]>([
    {
      id: '1',
      name: 'Human Computer Interaction',
      code: 'CS 401',
      semester: 'Spring 2026',
      studentCount: 45,
      isExpanded: false,
      weeks: Array.from({ length: 12 }, (_, i) => ({
        weekNumber: i + 1,
        title: `Week ${i + 1}`,
        isExpanded: false,
        lectures: [
          {
            id: `1-${i + 1}-1`,
            title: `Lecture ${i * 2 + 1}: Introduction to Topic`,
            fileName: `lecture_${i * 2 + 1}.pdf`,
            uploadDate: '2026-01-15',
            size: '2.4 MB'
          },
          {
            id: `1-${i + 1}-2`,
            title: `Lecture ${i * 2 + 2}: Advanced Concepts`,
            fileName: `lecture_${i * 2 + 2}.pdf`,
            uploadDate: '2026-01-17',
            size: '3.1 MB'
          }
        ]
      }))
    },
    {
      id: '2',
      name: 'Data Structures & Algorithms',
      code: 'CS 301',
      semester: 'Spring 2026',
      studentCount: 62,
      isExpanded: false,
      weeks: Array.from({ length: 12 }, (_, i) => ({
        weekNumber: i + 1,
        title: `Week ${i + 1}`,
        isExpanded: false,
        lectures: [
          {
            id: `2-${i + 1}-1`,
            title: `Lecture ${i * 2 + 1}: Core Algorithms`,
            fileName: `ds_lecture_${i * 2 + 1}.pdf`,
            uploadDate: '2026-01-16',
            size: '1.8 MB'
          },
          {
            id: `2-${i + 1}-2`,
            title: `Lecture ${i * 2 + 2}: Implementation`,
            fileName: `ds_lecture_${i * 2 + 2}.pdf`,
            uploadDate: '2026-01-18',
            size: '2.2 MB'
          }
        ]
      }))
    },
    {
      id: '3',
      name: 'Database Systems',
      code: 'CS 402',
      semester: 'Spring 2026',
      studentCount: 38,
      isExpanded: false,
      weeks: Array.from({ length: 12 }, (_, i) => ({
        weekNumber: i + 1,
        title: `Week ${i + 1}`,
        isExpanded: false,
        lectures: [
          {
            id: `3-${i + 1}-1`,
            title: `Lecture ${i * 2 + 1}: Database Concepts`,
            fileName: `db_lecture_${i * 2 + 1}.pdf`,
            uploadDate: '2026-01-14',
            size: '2.9 MB'
          }
        ]
      }))
    }
  ]);

  const handleTabChange = (tab: string) => {
    setMainSidebarTab(tab);
    onNavigate(tab as Page);
  };

  const toggleCourse = (courseId: string) => {
    setCourses(courses.map(course =>
      course.id === courseId
        ? { ...course, isExpanded: !course.isExpanded }
        : course
    ));
    setSelectedCourse(courseId);
  };

  const toggleWeek = (courseId: string, weekNumber: number) => {
    setCourses(courses.map(course =>
      course.id === courseId
        ? {
            ...course,
            weeks: course.weeks.map(week =>
              week.weekNumber === weekNumber
                ? { ...week, isExpanded: !week.isExpanded }
                : week
            )
          }
        : course
    ));
  };

  const toggleLectureSelection = (lectureId: string) => {
    const newSelection = new Set(selectedLectures);
    if (newSelection.has(lectureId)) {
      newSelection.delete(lectureId);
    } else {
      newSelection.add(lectureId);
    }
    setSelectedLectures(newSelection);
  };

  const selectAllWeekLectures = (courseId: string, weekNumber: number) => {
    const course = courses.find(c => c.id === courseId);
    const week = course?.weeks.find(w => w.weekNumber === weekNumber);
    
    if (week) {
      const newSelection = new Set(selectedLectures);
      week.lectures.forEach(lecture => newSelection.add(lecture.id));
      setSelectedLectures(newSelection);
      setSelectedWeek(weekNumber);
    }
  };

  const generateQuiz = async () => {
    if (selectedLectures.size === 0 || !recipientEmail) return;

    setIsGenerating(true);

    try {
        // Call Azure OpenAI directly
        const azureOpenAIEndpoint = 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-MODEL/chat/completions?api-version=2024-02-15-preview';
        const azureOpenAIKey = 'YOUR_AZURE_OPENAI_KEY'; // Store securely!

        const selectedLecturesList = Array.from(selectedLectures);
        const course = courses.find(c => c.id === selectedCourse);
        
        // Generate quiz with Azure OpenAI
        const aiResponse = await fetch(azureOpenAIEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': azureOpenAIKey,
        },
        body: JSON.stringify({
            messages: [
            {
                role: 'system',
                content: 'You are a university professor creating quiz questions. Generate clear, academic-level questions with multiple choice answers.'
            },
            {
                role: 'user',
                content: `Generate 10 quiz questions for Week ${selectedWeek} of ${course?.name}. 
                
                ${quizPrompt || 'Focus on key concepts and include 4 answer choices per question.'}
                
                Format each question as:
                Q[number]: [Question]
                A) [Option]
                B) [Option]
                C) [Option]
                D) [Option]
                Correct Answer: [Letter]`
            }
            ],
            max_tokens: 2000,
            temperature: 0.7
        })
        });

        const aiData = await aiResponse.json();
        const quizContent = aiData.choices[0].message.content;

        // Send email via Power Automate
        const flowUrl = 'YOUR_POWER_AUTOMATE_EMAIL_FLOW_URL';
        
        await fetch(flowUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipientEmail: recipientEmail,
            subject: `Quiz - Week ${selectedWeek} - ${course?.name}`,
            quizContent: quizContent,
            courseName: course?.name,
            weekNumber: selectedWeek
        })
        });

        alert('Quiz generated and sent successfully!');
        setShowAIPanel(false);
        setSelectedLectures(new Set());
        setQuizPrompt('');
        setRecipientEmail('');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate quiz. Please try again.');
    } finally {
        setIsGenerating(false);
    }
    };

  const getSelectedLectureCount = () => selectedLectures.size;

  return (
    <div className="professor-container">
      <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />

      <div className="professor-content-wrapper">
        {/* Courses Sidebar */}
        <aside className="courses-sidebar">
          <div className="courses-sidebar-header">
            <h2>My Courses</h2>
            <button className="add-course-btn" title="Add Course">
              <Plus size={18} />
            </button>
          </div>

          <div className="courses-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="courses-list">
            {courses.map(course => (
              <div key={course.id} className="course-item">
                <div
                  className={`course-header ${selectedCourse === course.id ? 'active' : ''}`}
                  onClick={() => toggleCourse(course.id)}
                >
                  <div className="course-header-left">
                    {course.isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <BookOpen size={18} />
                    <div className="course-info">
                      <div className="course-name">{course.name}</div>
                      <div className="course-code">{course.code}</div>
                    </div>
                  </div>
                  <div className="student-count">
                    <Users size={14} />
                    <span>{course.studentCount}</span>
                  </div>
                </div>

                {course.isExpanded && (
                  <div className="weeks-list">
                    {course.weeks.map(week => (
                      <div key={week.weekNumber} className="week-item">
                        <div
                          className="week-header"
                          onClick={() => toggleWeek(course.id, week.weekNumber)}
                        >
                          <div className="week-header-left">
                            {week.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Calendar size={16} />
                            <span>Week {week.weekNumber}</span>
                          </div>
                          <button
                            className="select-week-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllWeekLectures(course.id, week.weekNumber);
                            }}
                            title="Select all lectures"
                          >
                            Select All
                          </button>
                        </div>

                        {week.isExpanded && (
                          <div className="lectures-list">
                            {week.lectures.map(lecture => (
                              <div
                                key={lecture.id}
                                className={`lecture-item ${selectedLectures.has(lecture.id) ? 'selected' : ''}`}
                                onClick={() => toggleLectureSelection(lecture.id)}
                              >
                                <div className="lecture-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={selectedLectures.has(lecture.id)}
                                    onChange={() => {}}
                                  />
                                </div>
                                <FileText size={14} />
                                <div className="lecture-info">
                                  <div className="lecture-title">{lecture.title}</div>
                                  <div className="lecture-meta">
                                    {lecture.size} • {lecture.uploadDate}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="professor-main">
          <div className="professor-header">
            <div className="professor-header-left">
              <h1>Course Materials</h1>
              <p>Manage lecture notes and generate AI-powered assessments</p>
            </div>
            <div className="professor-header-actions">
              <button className="header-action-btn">
                <Filter size={18} />
                <span>Filter</span>
              </button>
              <button className="header-action-btn">
                <Download size={18} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {getSelectedLectureCount() > 0 && (
            <div className="selection-bar">
              <div className="selection-info">
                <div className="selection-count">
                  {getSelectedLectureCount()} lecture{getSelectedLectureCount() !== 1 ? 's' : ''} selected
                </div>
                <button
                  className="clear-selection-btn"
                  onClick={() => setSelectedLectures(new Set())}
                >
                  Clear Selection
                </button>
              </div>
              <button
                className="generate-quiz-btn"
                onClick={() => setShowAIPanel(true)}
              >
                <Sparkles size={18} />
                <span>Generate Quiz with AI</span>
              </button>
            </div>
          )}

          <div className="professor-content">
            {selectedCourse ? (
              <div className="course-overview">
                <div className="overview-cards">
                  <div className="overview-card">
                    <div className="overview-icon">
                      <BookOpen size={24} />
                    </div>
                    <div className="overview-stats">
                      <div className="overview-value">
                        {courses.find(c => c.id === selectedCourse)?.weeks.reduce(
                          (sum, week) => sum + week.lectures.length, 0
                        )}
                      </div>
                      <div className="overview-label">Total Lectures</div>
                    </div>
                  </div>

                  <div className="overview-card">
                    <div className="overview-icon">
                      <Users size={24} />
                    </div>
                    <div className="overview-stats">
                      <div className="overview-value">
                        {courses.find(c => c.id === selectedCourse)?.studentCount}
                      </div>
                      <div className="overview-label">Enrolled Students</div>
                    </div>
                  </div>

                  <div className="overview-card">
                    <div className="overview-icon">
                      <Calendar size={24} />
                    </div>
                    <div className="overview-stats">
                      <div className="overview-value">12</div>
                      <div className="overview-label">Weeks</div>
                    </div>
                  </div>
                </div>

                <div className="instructions-card">
                  <h3>AI Quiz Generation</h3>
                  <ol>
                    <li>Select lectures from the sidebar by clicking on them</li>
                    <li>You can select multiple lectures or use "Select All" for an entire week</li>
                    <li>Click "Generate Quiz with AI" to create assessment questions</li>
                    <li>Customize the quiz prompt and enter recipient email address</li>
                    <li>The quiz will be generated and sent via Outlook email</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <FolderOpen size={64} />
                <h3>Select a course to get started</h3>
                <p>Choose a course from the sidebar to view lecture materials and generate quizzes</p>
              </div>
            )}
          </div>
        </main>

        {/* AI Quiz Generation Panel */}
        {showAIPanel && (
          <div className="ai-panel-overlay" onClick={() => setShowAIPanel(false)}>
            <div className="ai-panel" onClick={(e) => e.stopPropagation()}>
              <div className="ai-panel-header">
                <div className="ai-panel-title">
                  <Sparkles size={24} />
                  <h2>Generate Quiz with AI</h2>
                </div>
                <button
                  className="close-panel-btn"
                  onClick={() => setShowAIPanel(false)}
                >
                  ×
                </button>
              </div>

              <div className="ai-panel-content">
                <div className="selected-lectures-info">
                  <h3>Selected Lectures</h3>
                  <div className="selected-count">
                    {getSelectedLectureCount()} lecture{getSelectedLectureCount() !== 1 ? 's' : ''} selected
                    {selectedWeek && ` from Week ${selectedWeek}`}
                  </div>
                </div>

                <div className="form-group">
                  <label>Recipient Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="student@university.edu"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Custom Instructions (Optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="E.g., Generate 10 multiple choice questions focusing on key concepts..."
                    value={quizPrompt}
                    onChange={(e) => setQuizPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="ai-info-box">
                  <div className="info-icon">i</div>
                  <div className="info-text">
                    The AI will analyze the selected lecture materials and generate relevant quiz questions.
                    The quiz will be sent to the specified email address via Outlook.
                  </div>
                </div>

                <div className="ai-panel-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => setShowAIPanel(false)}
                    disabled={isGenerating}
                  >
                    Cancel
                  </button>
                  <button
                    className="generate-btn"
                    onClick={generateQuiz}
                    disabled={isGenerating || !recipientEmail || selectedLectures.size === 0}
                  >
                    {isGenerating ? (
                      <>
                        <div className="spinner" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Generate & Send Quiz</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessorDashboard;