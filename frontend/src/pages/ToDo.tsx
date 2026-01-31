import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
    Plus,
    Star,
    Sun,
    Calendar,
    CheckCircle2,
    Circle,
    MoreHorizontal,
    Trash2,
    CalendarDays,
    Repeat,
    Bell,
    MessageSquare,
    ChevronRight,
    Search,
    SortAsc,
    List as ListIcon,
    BookOpen,
    Home,
    Target
} from 'lucide-react';
import './ToDo.css';

interface Task {
    id: string;
    title: string;
    completed: boolean;
    important: boolean;
    myDay: boolean;
    dueDate?: string;
    reminder?: string;
    repeat?: string;
    notes?: string;
    steps?: SubTask[];
    listId: string;
}

interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

interface TaskList {
    id: string;
    name: string;
    icon: string;
    color: string;
    taskCount: number;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo';

interface ToDoProps {
    onNavigate: (page: Page) => void;
}

const ToDo: React.FC<ToDoProps> = ({ onNavigate }) => {
    const [mainSidebarTab, setMainSidebarTab] = useState('todo');
    const [selectedList, setSelectedList] = useState<string>('my-day');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [lists] = useState<TaskList[]>([
        { id: 'my-day', name: 'My Day', icon: 'sun', color: '#6B9080', taskCount: 3 },
        { id: 'important', name: 'Important', icon: 'star', color: '#E76F51', taskCount: 2 },
        { id: 'planned', name: 'Planned', icon: 'calendar', color: '#A4C3B2', taskCount: 5 },
        { id: 'assignments', name: 'Assignments', icon: 'book', color: '#F4A261', taskCount: 4 },
        { id: 'personal', name: 'Personal', icon: 'home', color: '#6B9080', taskCount: 2 },
        { id: 'study-goals', name: 'Study Goals', icon: 'target', color: '#CCE3DE', taskCount: 3 },
    ]);

    // Helper function to render icons
    const renderIcon = (iconName: string, size: number = 20, color?: string) => {
        const iconProps = { size, strokeWidth: 2, style: color ? { color } : undefined };
        switch (iconName) {
            case 'sun': return <Sun {...iconProps} />;
            case 'star': return <Star {...iconProps} />;
            case 'calendar': return <Calendar {...iconProps} />;
            case 'book': return <BookOpen {...iconProps} />;
            case 'home': return <Home {...iconProps} />;
            case 'target': return <Target {...iconProps} />;
            default: return <ListIcon {...iconProps} />;
        }
    };

    const [tasks, setTasks] = useState<Task[]>([
        {
            id: '1',
            title: 'Complete HCI Assignment 3',
            completed: false,
            important: true,
            myDay: true,
            dueDate: '2026-02-05',
            listId: 'assignments',
            notes: 'Focus on user research methods and create wireframes',
            steps: [
                { id: '1-1', title: 'Research user personas', completed: true },
                { id: '1-2', title: 'Create wireframes', completed: false },
                { id: '1-3', title: 'Write report', completed: false },
            ]
        },
        {
            id: '2',
            title: 'Review Data Structures notes',
            completed: false,
            important: false,
            myDay: true,
            dueDate: '2026-02-02',
            listId: 'study-goals',
        },
        {
            id: '3',
            title: 'Prepare for Database midterm',
            completed: false,
            important: true,
            myDay: true,
            dueDate: '2026-02-10',
            listId: 'study-goals',
            reminder: '2026-02-09T09:00',
        },
        {
            id: '4',
            title: 'Submit project proposal',
            completed: false,
            important: false,
            myDay: false,
            dueDate: '2026-02-08',
            listId: 'assignments',
        },
        {
            id: '5',
            title: 'Buy groceries',
            completed: false,
            important: false,
            myDay: false,
            listId: 'personal',
        },
        {
            id: '6',
            title: 'Call dentist',
            completed: true,
            important: false,
            myDay: false,
            dueDate: '2026-01-30',
            listId: 'personal',
        },
    ]);

    const handleTabChange = (tab: string) => {
        setMainSidebarTab(tab);
        onNavigate(tab as Page);
    };

    const toggleTaskComplete = (taskId: string) => {
        setTasks(tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        ));
    };

    const toggleTaskImportant = (taskId: string) => {
        setTasks(tasks.map(task =>
            task.id === taskId ? { ...task, important: !task.important } : task
        ));
    };

    const addTask = () => {
        if (newTaskTitle.trim()) {
            const newTask: Task = {
                id: Date.now().toString(),
                title: newTaskTitle,
                completed: false,
                important: false,
                myDay: selectedList === 'my-day',
                listId: selectedList === 'my-day' || selectedList === 'important' || selectedList === 'planned'
                    ? 'assignments'
                    : selectedList,
            };
            setTasks([...tasks, newTask]);
            setNewTaskTitle('');
            setShowAddTask(false);
        }
    };

    const deleteTask = (taskId: string) => {
        setTasks(tasks.filter(task => task.id !== taskId));
        if (selectedTask?.id === taskId) {
            setSelectedTask(null);
        }
    };

    const getFilteredTasks = () => {
        let filtered = tasks;

        if (selectedList === 'my-day') {
            filtered = tasks.filter(task => task.myDay && !task.completed);
        } else if (selectedList === 'important') {
            filtered = tasks.filter(task => task.important && !task.completed);
        } else if (selectedList === 'planned') {
            filtered = tasks.filter(task => task.dueDate && !task.completed);
        } else {
            filtered = tasks.filter(task => task.listId === selectedList);
        }

        if (searchQuery) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    };

    const getCompletedTasks = () => {
        return tasks.filter(task => {
            if (selectedList === 'my-day') return task.myDay && task.completed;
            if (selectedList === 'important') return task.important && task.completed;
            if (selectedList === 'planned') return task.dueDate && task.completed;
            return task.listId === selectedList && task.completed;
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const activeTasks = getFilteredTasks();
    const completedTasks = getCompletedTasks();

    return (
        <div className="todo-page-container">
            <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} />

            <div className="todo-content-wrapper">
                {/* Lists Sidebar */}
                <aside className="todo-sidebar">
                    <div className="todo-sidebar-header">
                        <h2>To Do</h2>
                    </div>

                    <div className="todo-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="lists-section">
                        <div
                            className={`list-item ${selectedList === 'my-day' ? 'active' : ''}`}
                            onClick={() => setSelectedList('my-day')}
                        >
                            <div className="list-icon">{renderIcon('sun', 20)}</div>
                            <span className="list-name">My Day</span>
                            <span className="list-count">
                                {tasks.filter(t => t.myDay && !t.completed).length}
                            </span>
                        </div>

                        <div
                            className={`list-item ${selectedList === 'important' ? 'active' : ''}`}
                            onClick={() => setSelectedList('important')}
                        >
                            <div className="list-icon">{renderIcon('star', 20)}</div>
                            <span className="list-name">Important</span>
                            <span className="list-count">
                                {tasks.filter(t => t.important && !t.completed).length}
                            </span>
                        </div>

                        <div
                            className={`list-item ${selectedList === 'planned' ? 'active' : ''}`}
                            onClick={() => setSelectedList('planned')}
                        >
                            <div className="list-icon">{renderIcon('calendar', 20)}</div>
                            <span className="list-name">Planned</span>
                            <span className="list-count">
                                {tasks.filter(t => t.dueDate && !t.completed).length}
                            </span>
                        </div>

                        <div className="lists-divider"></div>

                        {lists.filter(l => !['my-day', 'important', 'planned'].includes(l.id)).map(list => (
                            <div
                                key={list.id}
                                className={`list-item ${selectedList === list.id ? 'active' : ''}`}
                                onClick={() => setSelectedList(list.id)}
                            >
                                <div className="list-icon">{renderIcon(list.icon, 20)}</div>
                                <span className="list-name">{list.name}</span>
                                <span className="list-count">
                                    {tasks.filter(t => t.listId === list.id && !t.completed).length}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button className="new-list-btn">
                        <Plus size={16} />
                        <span>New List</span>
                    </button>
                </aside>

                {/* Main Tasks Area */}
                <main className="tasks-main">
                    <div className="tasks-header">
                        <div className="tasks-header-left">
                            <h1 className="tasks-title">
                                {lists.find(l => l.id === selectedList)?.name ||
                                    (selectedList === 'my-day' ? 'My Day' :
                                        selectedList === 'important' ? 'Important' : 'Planned')}
                            </h1>
                            <span className="tasks-date">
                                {selectedList === 'my-day' && new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                        <div className="tasks-header-actions">
                            <button className="header-action-btn" title="Sort">
                                <SortAsc size={18} />
                            </button>
                            <button className="header-action-btn" title="More options">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="tasks-list">
                        {/* Active Tasks */}
                        {activeTasks.map(task => (
                            <div
                                key={task.id}
                                className={`task-item ${selectedTask?.id === task.id ? 'selected' : ''}`}
                                onClick={() => setSelectedTask(task)}
                            >
                                <button
                                    className="task-checkbox"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTaskComplete(task.id);
                                    }}
                                >
                                    <Circle size={20} />
                                </button>

                                <div className="task-content">
                                    <div className="task-title-row">
                                        <span className="task-title">{task.title}</span>
                                    </div>
                                    {task.dueDate && (
                                        <div className="task-meta">
                                            <CalendarDays size={12} />
                                            <span>{formatDate(task.dueDate)}</span>
                                        </div>
                                    )}
                                    {task.steps && task.steps.length > 0 && (
                                        <div className="task-meta">
                                            <ListIcon size={12} />
                                            <span>
                                                {task.steps.filter(s => s.completed).length} of {task.steps.length}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    className={`task-star ${task.important ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTaskImportant(task.id);
                                    }}
                                >
                                    <Star size={18} fill={task.important ? 'currentColor' : 'none'} />
                                </button>
                            </div>
                        ))}

                        {/* Add Task Button */}
                        {!showAddTask ? (
                            <button
                                className="add-task-btn"
                                onClick={() => setShowAddTask(true)}
                            >
                                <Plus size={18} />
                                <span>Add a task</span>
                            </button>
                        ) : (
                            <div className="add-task-input-container">
                                <input
                                    type="text"
                                    className="add-task-input"
                                    placeholder="Task name"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                                    onBlur={() => {
                                        if (!newTaskTitle.trim()) setShowAddTask(false);
                                    }}
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Completed Tasks */}
                        {completedTasks.length > 0 && (
                            <div className="completed-section">
                                <div className="completed-header">
                                    <CheckCircle2 size={16} />
                                    <span>Completed ({completedTasks.length})</span>
                                </div>
                                {completedTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="task-item completed"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <button
                                            className="task-checkbox checked"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTaskComplete(task.id);
                                            }}
                                        >
                                            <CheckCircle2 size={20} />
                                        </button>

                                        <div className="task-content">
                                            <span className="task-title">{task.title}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Task Detail Panel */}
                {selectedTask && (
                    <aside className="task-detail-panel">
                        <div className="task-detail-header">
                            <button
                                className="task-checkbox-large"
                                onClick={() => toggleTaskComplete(selectedTask.id)}
                            >
                                {selectedTask.completed ? (
                                    <CheckCircle2 size={24} />
                                ) : (
                                    <Circle size={24} />
                                )}
                            </button>
                            <button
                                className="close-detail-btn"
                                onClick={() => setSelectedTask(null)}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="task-detail-content">
                            <h2 className="task-detail-title">{selectedTask.title}</h2>

                            {/* Steps */}
                            {selectedTask.steps && selectedTask.steps.length > 0 && (
                                <div className="task-steps">
                                    <div className="steps-header">
                                        <ListIcon size={16} />
                                        <span>Steps</span>
                                    </div>
                                    {selectedTask.steps.map(step => (
                                        <div key={step.id} className="step-item">
                                            <button className="step-checkbox">
                                                {step.completed ? (
                                                    <CheckCircle2 size={16} />
                                                ) : (
                                                    <Circle size={16} />
                                                )}
                                            </button>
                                            <span className={step.completed ? 'completed' : ''}>
                                                {step.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add to My Day */}
                            <button className="detail-action-btn">
                                <Sun size={18} />
                                <span>{selectedTask.myDay ? 'Remove from My Day' : 'Add to My Day'}</span>
                            </button>

                            {/* Reminder */}
                            <button className="detail-action-btn">
                                <Bell size={18} />
                                <span>Remind me</span>
                            </button>

                            {/* Due Date */}
                            <button className="detail-action-btn">
                                <CalendarDays size={18} />
                                <span>
                                    {selectedTask.dueDate
                                        ? `Due ${formatDate(selectedTask.dueDate)}`
                                        : 'Add due date'}
                                </span>
                            </button>

                            {/* Repeat */}
                            <button className="detail-action-btn">
                                <Repeat size={18} />
                                <span>Repeat</span>
                            </button>

                            {/* Notes */}
                            <div className="task-notes-section">
                                <MessageSquare size={16} />
                                <textarea
                                    className="task-notes-input"
                                    placeholder="Add notes"
                                    defaultValue={selectedTask.notes}
                                />
                            </div>
                        </div>

                        <div className="task-detail-footer">
                            <button
                                className="delete-task-btn"
                                onClick={() => deleteTask(selectedTask.id)}
                            >
                                <Trash2 size={16} />
                                <span>Delete task</span>
                            </button>
                            <div className="task-created-date">
                                Created on {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ToDo;
