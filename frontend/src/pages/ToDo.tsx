import React, { useState, useEffect } from 'react';
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
    Target,
    RefreshCw,
    Cloud,
    CloudOff
} from 'lucide-react';
import './ToDo.css';
import { GraphService, type MicrosoftTask, type MicrosoftTaskList } from '../auth/graphService';

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
    microsoftId?: string; // ID from Microsoft To Do
    isSynced: boolean; // Whether this task is synced with Microsoft
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
    microsoftId?: string; // ID from Microsoft To Do
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo';

interface ToDoProps {
    onNavigate: (page: Page) => void;
    graphService?: GraphService | null;
    viewMode?: 'student' | 'professor';
    onViewModeToggle?: () => void;
}

const ToDo: React.FC<ToDoProps> = ({ onNavigate, graphService, viewMode = 'student', onViewModeToggle }) => {
    const [mainSidebarTab, setMainSidebarTab] = useState('todo');
    const [selectedList, setSelectedList] = useState<string>('my-day');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'offline' | 'syncing'>('offline');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const [lists, setLists] = useState<TaskList[]>([
        { id: 'my-day', name: 'My Day', icon: 'sun', color: '#6B9080', taskCount: 0 },
        { id: 'important', name: 'Important', icon: 'star', color: '#E76F51', taskCount: 0 },
        { id: 'planned', name: 'Planned', icon: 'calendar', color: '#A4C3B2', taskCount: 0 },
    ]);

    const [tasks, setTasks] = useState<Task[]>([]);

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

    // Transform Microsoft Task to our Task format
    const transformMicrosoftTask = (
        msTask: MicrosoftTask,
        listId: string
    ): Task => {
        return {
            id: `ms-${msTask.id}`,
            microsoftId: msTask.id,
            title: msTask.title,
            completed: msTask.status === 'completed',
            important: msTask.importance === 'high',
            myDay: false, // Microsoft To Do doesn't have this concept
            listId: listId,
            dueDate: msTask.dueDateTime?.dateTime,
            reminder: msTask.reminderDateTime?.dateTime,
            notes: msTask.body?.content,
            isSynced: true,
        };
    };

    // Transform our Task to Microsoft Task format
    const transformToMicrosoftTask = (task: Task): Partial<MicrosoftTask> => {
        const msTask: any = {
            title: task.title,
            status: task.completed ? 'completed' : 'notStarted',
            importance: task.important ? 'high' : 'normal',
            isReminderOn: !!task.reminder,
        };

        if (task.dueDate) {
            msTask.dueDateTime = {
                dateTime: task.dueDate,
                timeZone: 'UTC',
            };
        }

        if (task.reminder) {
            msTask.reminderDateTime = {
                dateTime: task.reminder,
                timeZone: 'UTC',
            };
        }

        if (task.notes) {
            msTask.body = {
                content: task.notes,
                contentType: 'text',
            };
        }

        return msTask;
    };

    // Sync tasks from Microsoft To Do
    const syncFromMicrosoft = async () => {
        if (!graphService) {
            setSyncStatus('offline');
            return;
        }

        try {
            setIsSyncing(true);
            setSyncStatus('syncing');

            // Get all task lists from Microsoft
            const msLists = await graphService.getTaskLists();

            // Update our lists
            const updatedLists: TaskList[] = [
                { id: 'my-day', name: 'My Day', icon: 'sun', color: '#6B9080', taskCount: 0 },
                { id: 'important', name: 'Important', icon: 'star', color: '#E76F51', taskCount: 0 },
                { id: 'planned', name: 'Planned', icon: 'calendar', color: '#A4C3B2', taskCount: 0 },
            ];

            // Add Microsoft lists
            const listIconMap: { [key: string]: string } = {
                'tasks': 'target',
                'assignments': 'book',
                'personal': 'home',
            };

            msLists.forEach((msList: MicrosoftTaskList) => {
                const listName = msList.displayName.toLowerCase();
                const icon = listIconMap[listName] || 'target';
                
                updatedLists.push({
                    id: `ms-${msList.id}`,
                    microsoftId: msList.id,
                    name: msList.displayName,
                    icon,
                    color: '#6B9080',
                    taskCount: 0,
                });
            });

            // Get all tasks from all Microsoft lists
            const allMsTasks: Task[] = [];
            for (const list of updatedLists) {
                if (list.microsoftId) {
                    const msTasks = await graphService.getTasks(list.microsoftId);
                    const transformedTasks = msTasks.map((msTask: MicrosoftTask) =>
                        transformMicrosoftTask(msTask, list.id)
                    );
                    allMsTasks.push(...transformedTasks);
                }
            }

            // Update task counts
            updatedLists.forEach((list) => {
                if (list.id === 'my-day') {
                    list.taskCount = allMsTasks.filter((t) => t.myDay && !t.completed).length;
                } else if (list.id === 'important') {
                    list.taskCount = allMsTasks.filter((t) => t.important && !t.completed).length;
                } else if (list.id === 'planned') {
                    list.taskCount = allMsTasks.filter((t) => t.dueDate && !t.completed).length;
                } else {
                    list.taskCount = allMsTasks.filter((t) => t.listId === list.id && !t.completed).length;
                }
            });

            setLists(updatedLists);
            setTasks(allMsTasks);
            setSyncStatus('synced');
            setLastSyncTime(new Date());
        } catch (error) {
            console.error('Failed to sync from Microsoft:', error);
            setSyncStatus('offline');
        } finally {
            setIsSyncing(false);
        }
    };

    // Initial sync on mount
    useEffect(() => {
        if (graphService) {
            syncFromMicrosoft();
        }
    }, [graphService]);

    const handleTabChange = (tab: string) => {
        setMainSidebarTab(tab);
        onNavigate(tab as Page);
    };

    const toggleTaskComplete = async (taskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const newCompleted = !task.completed;

        // Update locally first for responsiveness
        setTasks(tasks.map((t) =>
            t.id === taskId ? { ...t, completed: newCompleted } : t
        ));

        // Sync to Microsoft if this is a synced task
        if (graphService && task.microsoftId && task.isSynced) {
            try {
                const listMsId = lists.find((l) => l.id === task.listId)?.microsoftId;
                if (listMsId) {
                    await graphService.updateTask(listMsId, task.microsoftId, {
                        status: newCompleted ? 'completed' : 'notStarted',
                    });
                }
            } catch (error) {
                console.error('Failed to sync task completion:', error);
                // Revert on error
                setTasks(tasks.map((t) =>
                    t.id === taskId ? { ...t, completed: !newCompleted } : t
                ));
            }
        }
    };

    const toggleTaskImportant = async (taskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const newImportant = !task.important;

        setTasks(tasks.map((t) =>
            t.id === taskId ? { ...t, important: newImportant } : t
        ));

        if (graphService && task.microsoftId && task.isSynced) {
            try {
                const listMsId = lists.find((l) => l.id === task.listId)?.microsoftId;
                if (listMsId) {
                    await graphService.updateTask(listMsId, task.microsoftId, {
                        importance: newImportant ? 'high' : 'normal',
                    });
                }
            } catch (error) {
                console.error('Failed to sync task importance:', error);
                setTasks(tasks.map((t) =>
                    t.id === taskId ? { ...t, important: !newImportant } : t
                ));
            }
        }
    };

    const addTask = async () => {
        if (!newTaskTitle.trim()) return;

        const currentList = lists.find((l) => l.id === selectedList);
        const isMicrosoftList = currentList?.microsoftId != null;

        const newTask: Task = {
            id: `temp-${Date.now()}`,
            title: newTaskTitle,
            completed: false,
            important: false,
            myDay: selectedList === 'my-day',
            listId: selectedList === 'my-day' || selectedList === 'important' || selectedList === 'planned'
                ? lists.find((l) => l.microsoftId)?.id || 'assignments'
                : selectedList,
            isSynced: false,
        };

        setTasks([...tasks, newTask]);
        setNewTaskTitle('');
        setShowAddTask(false);

        // Sync to Microsoft if applicable
        if (graphService && isMicrosoftList && currentList?.microsoftId) {
            try {
                const msTask = await graphService.createTask(
                    currentList.microsoftId,
                    transformToMicrosoftTask(newTask) as any
                );

                // Update the task with Microsoft ID
                setTasks((prevTasks) =>
                    prevTasks.map((t) =>
                        t.id === newTask.id
                            ? { ...t, id: `ms-${msTask.id}`, microsoftId: msTask.id, isSynced: true }
                            : t
                    )
                );
            } catch (error) {
                console.error('Failed to create task in Microsoft:', error);
            }
        }
    };

    const deleteTask = async (taskId: string) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        setTasks(tasks.filter((t) => t.id !== taskId));
        if (selectedTask?.id === taskId) {
            setSelectedTask(null);
        }

        if (graphService && task.microsoftId && task.isSynced) {
            try {
                const listMsId = lists.find((l) => l.id === task.listId)?.microsoftId;
                if (listMsId) {
                    await graphService.deleteTask(listMsId, task.microsoftId);
                }
            } catch (error) {
                console.error('Failed to delete task from Microsoft:', error);
            }
        }
    };

    const getFilteredTasks = () => {
        let filtered = tasks;

        if (selectedList === 'my-day') {
            filtered = tasks.filter((task) => task.myDay && !task.completed);
        } else if (selectedList === 'important') {
            filtered = tasks.filter((task) => task.important && !task.completed);
        } else if (selectedList === 'planned') {
            filtered = tasks.filter((task) => task.dueDate && !task.completed);
        } else {
            filtered = tasks.filter((task) => task.listId === selectedList);
        }

        if (searchQuery) {
            filtered = filtered.filter((task) =>
                task.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    };

    const getCompletedTasks = () => {
        return tasks.filter((task) => {
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
            <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} viewMode={viewMode} onViewModeToggle={onViewModeToggle}/>

            <div className="todo-content-wrapper">
                {/* Lists Sidebar */}
                <aside className="todo-sidebar">
                    <div className="todo-sidebar-header">
                        <h2>To Do</h2>
                    </div>

                    {/* Sync Status */}
                    <div style={{
                        padding: '12px 16px',
                        margin: '12px 16px',
                        background: syncStatus === 'synced' ? '#E8F5E9' : syncStatus === 'syncing' ? '#FFF9C4' : '#FFEBEE',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                    }}>
                        {syncStatus === 'synced' && <Cloud size={14} />}
                        {syncStatus === 'syncing' && <RefreshCw size={14} className="spinner" />}
                        {syncStatus === 'offline' && <CloudOff size={14} />}
                        <span>
                            {syncStatus === 'synced' && `Synced ${lastSyncTime ? 'at ' + lastSyncTime.toLocaleTimeString() : ''}`}
                            {syncStatus === 'syncing' && 'Syncing...'}
                            {syncStatus === 'offline' && 'Offline mode'}
                        </span>
                        {graphService && (
                            <button
                                onClick={syncFromMicrosoft}
                                disabled={isSyncing}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'none',
                                    border: 'none',
                                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                                    padding: '4px',
                                }}
                            >
                                <RefreshCw size={14} className={isSyncing ? 'spinner' : ''} />
                            </button>
                        )}
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
                        {lists.map((list) => (
                            <div
                                key={list.id}
                                className={`list-item ${selectedList === list.id ? 'active' : ''}`}
                                onClick={() => setSelectedList(list.id)}
                            >
                                <div className="list-icon">{renderIcon(list.icon, 20)}</div>
                                <span className="list-name">{list.name}</span>
                                <span className="list-count">{list.taskCount}</span>
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
                                {lists.find((l) => l.id === selectedList)?.name || 'Tasks'}
                            </h1>
                            {selectedList === 'my-day' && (
                                <span className="tasks-date">
                                    {new Date().toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            )}
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
                        {activeTasks.map((task) => (
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
                                        {task.isSynced && (
                                            <Cloud size={12} style={{ color: '#6B9080', marginLeft: '8px' }} />
                                        )}
                                    </div>
                                    {task.dueDate && (
                                        <div className="task-meta">
                                            <CalendarDays size={12} />
                                            <span>{formatDate(task.dueDate)}</span>
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
                            <button className="add-task-btn" onClick={() => setShowAddTask(true)}>
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
                                {completedTasks.map((task) => (
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
                                {selectedTask.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                            </button>
                            <button className="close-detail-btn" onClick={() => setSelectedTask(null)}>
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="task-detail-content">
                            <h2 className="task-detail-title">{selectedTask.title}</h2>

                            <button className="detail-action-btn">
                                <Sun size={18} />
                                <span>{selectedTask.myDay ? 'Remove from My Day' : 'Add to My Day'}</span>
                            </button>

                            <button className="detail-action-btn">
                                <Bell size={18} />
                                <span>Remind me</span>
                            </button>

                            <button className="detail-action-btn">
                                <CalendarDays size={18} />
                                <span>
                                    {selectedTask.dueDate
                                        ? `Due ${formatDate(selectedTask.dueDate)}`
                                        : 'Add due date'}
                                </span>
                            </button>

                            <button className="detail-action-btn">
                                <Repeat size={18} />
                                <span>Repeat</span>
                            </button>

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
                            <button className="delete-task-btn" onClick={() => deleteTask(selectedTask.id)}>
                                <Trash2 size={16} />
                                <span>Delete task</span>
                            </button>
                            <div className="task-created-date">
                                {selectedTask.isSynced ? 'Synced with Microsoft To Do' : 'Local task'}
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ToDo;