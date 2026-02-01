import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
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
  Download,
  Upload,
  X,
  Video,
  Music,
  Image as ImageIcon,
  Archive,
  File,
  Trash2,
  ExternalLink
} from 'lucide-react';
import type { ResourceData } from '../api/resources';
import type { CourseData } from '../api/courses';
import {
  uploadResource,
  getResources,
  deleteResource,
  batchDeleteResources,
  getResourceFileUrl,
  formatResourceDate
} from '../api/resources';
import {
  getCourses,
  createCourse,
  deleteCourse
} from '../api/courses';
import { DEFAULT_USER_ID } from '../api/config';
import './ProfessorDashboard.css';

// Extended course with UI state
interface CourseWithUI extends CourseData {
  isExpanded: boolean;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo' | 'help' | 'professor';

interface ProfessorDashboardProps {
  onNavigate: (page: Page) => void;
  graphService: any;
  userProfile: any;
  viewMode?: 'student' | 'professor';
  onViewModeToggle?: () => void;
}

const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({ onNavigate, graphService: _graphService, userProfile: _userProfile, viewMode = 'student', onViewModeToggle  }) => {
  const [mainSidebarTab, setMainSidebarTab] = useState('professor');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [quizPrompt, setQuizPrompt] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Resource management state
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [selectedResources, setSelectedResources] = useState<Set<number>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewingResource, setViewingResource] = useState<ResourceData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state - FIXED: course_id should be number, not string
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCourseId, setUploadCourseId] = useState<number | null>(null);
  const [uploadWeekNumber, setUploadWeekNumber] = useState<number | undefined>(undefined);

  // Week expansion state
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [weekResources, setWeekResources] = useState<Map<string, ResourceData[]>>(new Map());
  const [isLoadingWeekResources, setIsLoadingWeekResources] = useState(false);

  // Load resources on mount
  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const data = await getResources(DEFAULT_USER_ID);
      setResources(data);
      // Clear week resources cache when reloading all resources
      setWeekResources(new Map());
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  // Load resources when week is selected
  useEffect(() => {
    if (selectedCourse && selectedWeek) {
      const weekKey = `${selectedCourse}-${selectedWeek}`;
      if (!weekResources.has(weekKey)) {
        setIsLoadingWeekResources(true);
        getResources(DEFAULT_USER_ID, {
          course_id: selectedCourse.toString(),
          week_number: selectedWeek
        }).then(weekResourcesList => {
          setWeekResources(prev => new Map(prev).set(weekKey, weekResourcesList));
          setIsLoadingWeekResources(false);
        }).catch(error => {
          console.error('Failed to load week resources:', error);
          setIsLoadingWeekResources(false);
        });
      }
    }
  }, [selectedCourse, selectedWeek]);

  // Get file type icon component
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={16} />;
      case 'video':
        return <Video size={16} />;
      case 'audio':
        return <Music size={16} />;
      case 'image':
        return <ImageIcon size={16} />;
      case 'archive':
        return <Archive size={16} />;
      default:
        return <File size={16} />;
    }
  };

  // Get small file type icon (for resources list under weeks)
  const getFileIconSmall = (fileType: string, size: number = 18) => {
    switch (fileType) {
      case 'pdf':
        return <FileText size={size} />;
      case 'video':
        return <Video size={size} />;
      case 'audio':
        return <Music size={size} />;
      case 'image':
        return <ImageIcon size={size} />;
      case 'archive':
        return <Archive size={size} />;
      default:
        return <File size={size} />;
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) {
        // Use filename without extension as default title
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  // Handle file upload - FIXED: Convert course_id to string for API
  const handleUpload = async () => {
    if (!uploadFile) return;

    // MANDATORY: Check if course and week are selected
    if (!uploadCourseId) {
      setUploadError('Please select a course');
      return;
    }

    if (!uploadWeekNumber) {
      setUploadError('Please select a week number');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await uploadResource(DEFAULT_USER_ID, uploadFile, {
        title: uploadTitle || uploadFile.name,
        description: uploadDescription || undefined,
        course_id: uploadCourseId.toString(),
        week_number: uploadWeekNumber,
      });

      // Refresh resources list
      await loadResources();

      // Reset form and close modal
      resetUploadForm();
      setShowUploadModal(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadCourseId(null);
    setUploadWeekNumber(undefined);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle resource selection toggle
  const toggleResourceSelection = (resourceId: number) => {
    const newSelection = new Set(selectedResources);
    if (newSelection.has(resourceId)) {
      newSelection.delete(resourceId);
    } else {
      newSelection.add(resourceId);
    }
    setSelectedResources(newSelection);
  };

  // Handle viewing a resource
  const handleViewResource = (resource: ResourceData) => {
    setViewingResource(resource);
  };

  // Open resource in new tab
  const openResourceInNewTab = (resource: ResourceData) => {
    window.open(getResourceFileUrl(resource.id), '_blank');
  };

  // Download resource
  const downloadResource = (resource: ResourceData) => {
    window.open(getResourceFileUrl(resource.id, true), '_blank');
  };

  // Delete selected resources
  const handleDeleteSelected = async () => {
    if (selectedResources.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedResources.size} resource(s)?`)) {
      return;
    }

    try {
      await batchDeleteResources(DEFAULT_USER_ID, Array.from(selectedResources));
      await loadResources();
      setSelectedResources(new Set());
    } catch (error) {
      console.error('Failed to delete resources:', error);
      alert('Failed to delete some resources');
    }
  };

  // Delete single resource
  const handleDeleteResource = async (resourceId: number) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      await deleteResource(resourceId);
      await loadResources();
      selectedResources.delete(resourceId);
      setSelectedResources(new Set(selectedResources));
    } catch (error) {
      console.error('Failed to delete resource:', error);
      alert('Failed to delete resource');
    }
  };

  // Get resources filtered by course and week - FIXED: Use weekResources when available
  const getFilteredResources = () => {
    // If a specific course and week are selected, use the cached week resources
    if (selectedCourse !== null && selectedWeek !== null) {
      const weekKey = `${selectedCourse}-${selectedWeek}`;
      const weekResourcesList = weekResources.get(weekKey);
      
      if (weekResourcesList) {
        // Apply search filter if needed
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return weekResourcesList.filter(r => 
            r.title.toLowerCase().includes(query) ||
            r.original_filename.toLowerCase().includes(query)
          );
        }
        return weekResourcesList;
      }
    }
    
    // Otherwise, filter from the main resources array
    let filtered = resources;
    
    if (selectedCourse !== null) {
      filtered = filtered.filter(r => r.course_id === selectedCourse.toString());
    }
    
    if (selectedWeek) {
      filtered = filtered.filter(r => r.week_number === selectedWeek);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.original_filename.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  // Courses state - loaded from API
  const [courses, setCourses] = useState<CourseWithUI[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  
  // Course creation modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseSemester, setNewCourseSemester] = useState('');
  const [newCourseDescription, setNewCourseDescription] = useState('');
  const [newCourseStudentCount, setNewCourseStudentCount] = useState<number>(0);
  const [newCourseTotalWeeks, setNewCourseTotalWeeks] = useState<number>(12);

  // Load courses from API
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const data = await getCourses(DEFAULT_USER_ID);
      setCourses(data.map(course => ({ ...course, isExpanded: false })));
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Create a new course
  const handleCreateCourse = async () => {
    if (!newCourseName || !newCourseCode) return;

    setIsCreatingCourse(true);
    setCourseError(null);

    try {
      await createCourse(DEFAULT_USER_ID, {
        name: newCourseName,
        code: newCourseCode,
        semester: newCourseSemester || undefined,
        description: newCourseDescription || undefined,
        student_count: newCourseStudentCount,
        total_weeks: newCourseTotalWeeks,
      });

      // Refresh courses list
      await loadCourses();

      // Reset form and close modal
      resetCourseForm();
      setShowCourseModal(false);
    } catch (error) {
      setCourseError(error instanceof Error ? error.message : 'Failed to create course');
    } finally {
      setIsCreatingCourse(false);
    }
  };

  // Reset course creation form
  const resetCourseForm = () => {
    setNewCourseName('');
    setNewCourseCode('');
    setNewCourseSemester('');
    setNewCourseDescription('');
    setNewCourseStudentCount(0);
    setNewCourseTotalWeeks(12);
    setCourseError(null);
  };

  // Delete a course
  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm('Are you sure you want to delete this course? All resources in this course will also be deleted.')) {
      return;
    }

    try {
      await deleteCourse(courseId);
      await loadCourses();
      await loadResources();
      if (selectedCourse === courseId) {
        setSelectedCourse(null);
      }
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course');
    }
  };

  const handleTabChange = (tab: string) => {
    setMainSidebarTab(tab);
    onNavigate(tab as Page);
  };

  const toggleCourse = (courseId: number) => {
    const course = courses.find(c => c.id === courseId);
    const isCurrentlyExpanded = course?.isExpanded || false;
    
    setCourses(courses.map(c =>
      c.id === courseId
        ? { ...c, isExpanded: !c.isExpanded }
        : c
    ));
    
    // If course is being expanded, select it. If collapsing, deselect it.
    if (!isCurrentlyExpanded) {
      setSelectedCourse(courseId);
      setSelectedWeek(null); // Clear week selection when selecting a new course
    } else {
      setSelectedCourse(null);
      setSelectedWeek(null);
    }
  };

  // Toggle week expansion and load resources if needed - FIXED: Fetch from API
  const handleWeekToggle = async (courseId: number, weekNumber: number) => {
    const weekKey = `${courseId}-${weekNumber}`;
    
    // Toggle expansion state
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekKey)) {
        next.delete(weekKey);
      } else {
        next.add(weekKey);
      }
      return next;
    });
    
    // Load resources from API if not already cached
    if (!weekResources.has(weekKey)) {
      setIsLoadingWeekResources(true);
      try {
        const weekResourcesList = await getResources(DEFAULT_USER_ID, {
          course_id: courseId.toString(),
          week_number: weekNumber
        });
        setWeekResources(prev => new Map(prev).set(weekKey, weekResourcesList));
      } catch (error) {
        console.error('Failed to load week resources:', error);
        // Fall back to filtering local resources
        const weekResourcesList = resources.filter(r => 
          r.course_id !== null && r.course_id === courseId.toString() && r.week_number === weekNumber
        );
        setWeekResources(prev => new Map(prev).set(weekKey, weekResourcesList));
      } finally {
        setIsLoadingWeekResources(false);
      }
    }
  };

  const generateQuiz = async () => {
    if (selectedResources.size === 0 || !recipientEmail) return;

    setIsGenerating(true);

    try {
        // Call Azure OpenAI directly
        const azureOpenAIEndpoint = 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-MODEL/chat/completions?api-version=2024-02-15-preview';
        const azureOpenAIKey = 'YOUR_AZURE_OPENAI_KEY'; // Store securely!

        const course = selectedCourse ? courses.find(c => c.id === selectedCourse) : null;
        
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
        setSelectedResources(new Set());
        setQuizPrompt('');
        setRecipientEmail('');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate quiz. Please try again.');
    } finally {
        setIsGenerating(false);
    }
  };

  const getSelectedLectureCount = () => selectedResources.size;

  return (
    <div className="professor-container">
      <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} viewMode={viewMode} onViewModeToggle={onViewModeToggle}/>

      <div className="professor-content-wrapper">
        {/* Courses Sidebar */}
        <aside className="courses-sidebar">
          <div className="courses-sidebar-header">
            <h2>My Courses</h2>
            <button 
              className="add-course-btn" 
              title="Add Course"
              onClick={() => setShowCourseModal(true)}
            >
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
            {isLoadingCourses ? (
              <div className="loading-courses">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="no-courses">
                <p>No courses yet</p>
                <button 
                  className="add-first-course-btn"
                  onClick={() => setShowCourseModal(true)}
                >
                  <Plus size={16} />
                  Add Your First Course
                </button>
              </div>
            ) : (
              courses.map(course => (
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
                      <span>{course.student_count}</span>
                    </div>
                  </div>

                  {course.isExpanded && (
                    <div className="weeks-list">
                      {Array.from({ length: course.total_weeks }, (_, i) => i + 1).map(weekNum => {
                        const weekKey = `${course.id}-${weekNum}`;
                        const isWeekExpanded = expandedWeeks.has(weekKey);
                        // Use cached resources if available, otherwise filter from local state for count
                        const weekResourcesList = weekResources.get(weekKey) || 
                          resources.filter(r => r.course_id === course.id.toString() && r.week_number === weekNum);
                        
                        return (
                          <div key={weekNum} className="week-item">
                            <div
                              className={`week-header ${selectedWeek === weekNum && selectedCourse === course.id ? 'active' : ''}`}
                              onClick={() => {
                                // 1. Toggle expansion in sidebar
                                handleWeekToggle(course.id, weekNum);
                                // 2. Select the course and week for the main view
                                setSelectedCourse(course.id);
                                setSelectedWeek(weekNum);
                              }}
                            >
                              <div className="week-header-left">
                                {isWeekExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <Calendar size={16} />
                                <span>Week {weekNum}</span>
                              </div>
                              {weekResourcesList.length > 0 && (
                                <span className="week-resource-count">{weekResourcesList.length}</span>
                              )}
                            </div>
                            
                            {/* Expandable Resources List */}
                            {isWeekExpanded && (
                              <div className="resources-list">
                                {weekResourcesList.length > 0 ? (
                                  weekResourcesList.map(resource => (
                                    <div 
                                      key={resource.id} 
                                      className={`resource-list-item ${selectedResources.has(resource.id) ? 'selected' : ''}`}
                                    >
                                      <div className="resource-list-checkbox">
                                        <input
                                          type="checkbox"
                                          checked={selectedResources.has(resource.id)}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            toggleResourceSelection(resource.id);
                                          }}
                                        />
                                      </div>
                                      
                                      <div className={`resource-icon-small ${resource.file_type}`}>
                                        {getFileIconSmall(resource.file_type)}
                                      </div>
                                      
                                      <div 
                                        className="resource-list-info"
                                        onClick={() => handleViewResource(resource)}
                                      >
                                        <div className="resource-list-title">{resource.title}</div>
                                        <div className="resource-list-meta">
                                          {resource.file_type.toUpperCase()} • {resource.file_size_formatted}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="empty-week-resources">
                                    No resources uploaded for this week
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Upload Resource Button */}
                      <div className="week-upload-section">
                        <button
                          className="upload-resource-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadCourseId(course.id);
                            setShowUploadModal(true);
                          }}
                        >
                          <Upload size={16} />
                          Upload Resource
                        </button>
                      </div>
                      
                      {/* Course actions */}
                      <div className="course-actions">
                        <button
                          className="delete-course-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course.id);
                          }}
                        >
                          <Trash2 size={14} />
                          Delete Course
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="professor-main">
          <div className="professor-header">
            <div className="professor-header-left">
              <h1>Course Materials</h1>
              <p>Manage lecture notes and generate AI-powered assessments</p>
            </div>
          </div>

          {/* Resource Selection Bar */}
          {selectedResources.size > 0 && (
            <div className="selection-bar">
              <div className="selection-info">
                <div className="selection-count">
                  {selectedResources.size} resource{selectedResources.size !== 1 ? 's' : ''} selected
                </div>
                <button
                  className="clear-selection-btn"
                  onClick={() => setSelectedResources(new Set())}
                >
                  Clear Selection
                </button>
              </div>
              <div className="selection-actions">
                <button
                  className="delete-selected-btn"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 size={18} />
                  <span>Delete Selected</span>
                </button>
                <button
                  className="generate-quiz-btn"
                  onClick={() => setShowAIPanel(true)}
                >
                  <Sparkles size={18} />
                  <span>Generate Quiz with AI</span>
                </button>
              </div>
            </div>
          )}

          <div className="professor-content">
            {isLoadingWeekResources ? (
              <div className="loading-week-resources">
                <div className="spinner" />
                <p>Loading resources...</p>
              </div>
            ) : getFilteredResources().length > 0 ? (
              <div className="resources-section">
                <div className="resources-header">
                  <h3>
                    {selectedCourse
                      ? `Resources for ${courses.find((c) => c.id === selectedCourse)?.name || "Course"}`
                      : "All Resources"}
                    {selectedWeek && ` - Week ${selectedWeek}`}
                  </h3>
                  <span className="resource-count">
                    {getFilteredResources().length} files
                  </span>
                </div>

                {/* Resource Grid */}
                <div className="resources-grid">
                  {getFilteredResources().map((resource) => (
                    <div
                      key={resource.id}
                      className={`resource-card ${
                        selectedResources.has(resource.id) ? "selected" : ""
                      }`}
                    >
                      <div className="resource-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedResources.has(resource.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleResourceSelection(resource.id);
                          }}
                        />
                      </div>

                      <div
                        className="resource-content"
                        onClick={() => handleViewResource(resource)}
                      >
                        <div className={`resource-icon ${resource.file_type}`}>
                          {getFileIcon(resource.file_type)}
                        </div>

                        <div className="resource-info">
                          <div className="resource-title">{resource.title}</div>
                          <div className="resource-meta">
                            <span className="resource-type">
                              {resource.file_type.toUpperCase()}
                            </span>
                            <span className="resource-size">
                              {resource.file_size_formatted}
                            </span>
                            <span className="resource-date">
                              {formatResourceDate(resource.created_at)}
                            </span>
                          </div>
                          {resource.course_name && (
                            <div className="resource-course">
                              {resource.course_name}
                              {resource.week_number &&
                                ` • Week ${resource.week_number}`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="resource-actions">
                        <button
                          className="resource-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openResourceInNewTab(resource);
                          }}
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          className="resource-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadResource(resource);
                          }}
                        >
                          <Download size={16} />
                        </button>
                        <button
                          className="resource-action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteResource(resource.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Upload Button */}
                <div className="bottom-upload-section">
                  <button
                    className="upload-resource-btn"
                    onClick={() => {
                      setUploadCourseId(selectedCourse);
                      setUploadWeekNumber(selectedWeek || undefined);
                      setShowUploadModal(true);
                    }}
                  >
                    <Upload size={18} />
                    <span>Upload New Resource</span>
                  </button>
                </div>
              </div>
            ) : selectedWeek && selectedCourse ? (
              <div className="empty-state week-empty">
                <div className="empty-icon">
                  <Upload size={40} />
                </div>
                <h3>Week {selectedWeek} is Empty</h3>
                <p>There are no resources uploaded for this week yet.</p>
                <button
                  className="upload-resource-btn"
                  onClick={() => {
                    setUploadCourseId(selectedCourse);
                    setUploadWeekNumber(selectedWeek);
                    setShowUploadModal(true);
                  }}
                >
                  <Upload size={18} />
                  Upload to Week {selectedWeek}
                </button>
              </div>
            ) : (
              <div className="empty-state global-empty">
                <div className="empty-icon">
                  <FileText size={40} />
                </div>
                <h3>No Resources Found</h3>
                <p>
                  {searchQuery
                    ? `No resources match "${searchQuery}"`
                    : "Upload your first resource to get started."}
                </p>
                <button
                  className="upload-resource-btn"
                  onClick={() => {
                    setUploadCourseId(selectedCourse);
                    setUploadWeekNumber(undefined);
                    setShowUploadModal(true);
                  }}
                >
                  <Upload size={18} />
                  Upload Resource
                </button>
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
                    disabled={isGenerating || !recipientEmail || selectedResources.size === 0}
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

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => {
            setShowUploadModal(false);
            resetUploadForm();
          }}>
            <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
              <div className="upload-modal-header">
                <div className="upload-modal-title">
                  <Upload size={24} />
                  <h2>Upload Resource</h2>
                </div>
                <button
                  className="close-modal-btn"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="upload-modal-content">
                {/* File Drop Zone */}
                <div 
                  className={`file-drop-zone ${uploadFile ? 'has-file' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      setUploadFile(file);
                      if (!uploadTitle) {
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                        setUploadTitle(nameWithoutExt);
                      }
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.xls,.xlsx,.mp4,.webm,.avi,.mov,.mkv,.wmv,.mp3,.wav,.ogg,.m4a,.flac,.aac,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.rar,.7z,.tar,.gz"
                    hidden
                  />
                  
                  {uploadFile ? (
                    <div className="file-preview">
                      <div className="file-icon-large">
                        {getFileIcon(uploadFile.name.split('.').pop()?.toLowerCase() || '')}
                      </div>
                      <div className="file-details">
                        <div className="file-name">{uploadFile.name}</div>
                        <div className="file-size">
                          {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                      <button
                        className="remove-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={48} className="drop-icon" />
                      <div className="drop-text">
                        <span className="drop-primary">Click to upload or drag and drop</span>
                        <span className="drop-secondary">
                          PDF, Documents, Videos, Audio, Images (max 500MB)
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Metadata Form */}
                <div className="upload-form">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter resource title"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Add a description..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Course *</label>
                      <select
                        className="form-select"
                        value={uploadCourseId ?? ''}
                        onChange={(e) => setUploadCourseId(e.target.value ? Number(e.target.value) : null)}
                        required
                      >
                        <option value="">Select a course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Week Number *</label>
                      <select
                        className="form-select"
                        value={uploadWeekNumber || ''}
                        onChange={(e) => setUploadWeekNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                        disabled={!uploadCourseId}
                        required
                      >
                        <option value="">Select week</option>
                        {uploadCourseId && courses.find(c => c.id === uploadCourseId) && 
                          Array.from({ length: courses.find(c => c.id === uploadCourseId)?.total_weeks || 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Week {i + 1}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                </div>

                {uploadError && (
                  <div className="upload-error">
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="upload-modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button
                    className="upload-submit-btn"
                    onClick={handleUpload}
                    disabled={!uploadFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <div className="spinner" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        <span>Upload Resource</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resource Viewer Modal */}
        {viewingResource && (
          <div className="modal-overlay" onClick={() => setViewingResource(null)}>
            <div className="resource-viewer-modal" onClick={(e) => e.stopPropagation()}>
              <div className="viewer-header">
                <div className="viewer-title">
                  {getFileIcon(viewingResource.file_type)}
                  <h2>{viewingResource.title}</h2>
                </div>
                <div className="viewer-actions">
                  <button
                    className="viewer-action-btn"
                    onClick={() => openResourceInNewTab(viewingResource)}
                    title="Open in new tab"
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button
                    className="viewer-action-btn"
                    onClick={() => downloadResource(viewingResource)}
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    className="close-viewer-btn"
                    onClick={() => setViewingResource(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="viewer-content">
                {viewingResource.file_type === 'pdf' ? (
                  <iframe
                    src={getResourceFileUrl(viewingResource.id)}
                    className="pdf-viewer"
                    title={viewingResource.title}
                  />
                ) : viewingResource.file_type === 'video' ? (
                  <video
                    src={getResourceFileUrl(viewingResource.id)}
                    controls
                    className="video-viewer"
                  >
                    Your browser does not support video playback.
                  </video>
                ) : viewingResource.file_type === 'audio' ? (
                  <div className="audio-viewer-container">
                    <div className="audio-icon">
                      <Music size={64} />
                    </div>
                    <div className="audio-title">{viewingResource.original_filename}</div>
                    <audio
                      src={getResourceFileUrl(viewingResource.id)}
                      controls
                      className="audio-viewer"
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : viewingResource.file_type === 'image' ? (
                  <img
                    src={getResourceFileUrl(viewingResource.id)}
                    alt={viewingResource.title}
                    className="image-viewer"
                  />
                ) : (
                  <div className="unsupported-viewer">
                    <div className="unsupported-icon">
                      {getFileIcon(viewingResource.file_type)}
                    </div>
                    <h3>{viewingResource.original_filename}</h3>
                    <p>This file type cannot be previewed. Use the buttons above to open or download it.</p>
                    <div className="file-meta">
                      <span>{viewingResource.file_size_formatted}</span>
                      <span>•</span>
                      <span>{viewingResource.mime_type}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="viewer-footer">
                <div className="viewer-meta">
                  <span><strong>File:</strong> {viewingResource.original_filename}</span>
                  <span><strong>Size:</strong> {viewingResource.file_size_formatted}</span>
                  <span><strong>Uploaded:</strong> {formatResourceDate(viewingResource.created_at)}</span>
                  {viewingResource.course_name && (
                    <span><strong>Course:</strong> {viewingResource.course_name}</span>
                  )}
                  {viewingResource.week_number && (
                    <span><strong>Week:</strong> {viewingResource.week_number}</span>
                  )}
                </div>
                {viewingResource.description && (
                  <div className="viewer-description">
                    <strong>Description:</strong> {viewingResource.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Course Creation Modal */}
        {showCourseModal && (
          <div className="modal-overlay" onClick={() => {
            setShowCourseModal(false);
            resetCourseForm();
          }}>
            <div className="course-modal" onClick={(e) => e.stopPropagation()}>
              <div className="course-modal-header">
                <div className="course-modal-title">
                  <BookOpen size={24} />
                  <h2>Add New Course</h2>
                </div>
                <button
                  className="close-modal-btn"
                  onClick={() => {
                    setShowCourseModal(false);
                    resetCourseForm();
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="course-modal-content">
                <div className="course-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Course Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., Human Computer Interaction"
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Course Code *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., CS 401"
                        value={newCourseCode}
                        onChange={(e) => setNewCourseCode(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Semester</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., Spring 2026"
                        value={newCourseSemester}
                        onChange={(e) => setNewCourseSemester(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Number of Students</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        value={newCourseStudentCount}
                        onChange={(e) => setNewCourseStudentCount(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Total Weeks</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="12"
                      min="1"
                      max="52"
                      value={newCourseTotalWeeks}
                      onChange={(e) => setNewCourseTotalWeeks(parseInt(e.target.value) || 12)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Add a course description..."
                      value={newCourseDescription}
                      onChange={(e) => setNewCourseDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                {courseError && (
                  <div className="course-error">
                    <span>{courseError}</span>
                  </div>
                )}

                <div className="course-modal-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowCourseModal(false);
                      resetCourseForm();
                    }}
                    disabled={isCreatingCourse}
                  >
                    Cancel
                  </button>
                  <button
                    className="create-course-btn"
                    onClick={handleCreateCourse}
                    disabled={!newCourseName || !newCourseCode || isCreatingCourse}
                  >
                    {isCreatingCourse ? (
                      <>
                        <div className="spinner" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        <span>Create Course</span>
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