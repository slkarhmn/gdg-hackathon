import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
    Send,
    Users,
    MessageCircle,
    Clock,
    Search,
    Filter,
    ChevronRight,
    User,
    CheckCircle2,
    Circle,
    Sparkles,
    X
} from 'lucide-react';
import { useAIChat } from '../contexts/AIChatContext';
import './GetHelp.css';

interface Professor {
    id: string;
    name: string;
    subject: string;
    avatar: string;
    status: 'online' | 'offline' | 'busy';
    responseTime: string;
}

interface Conversation {
    id: string;
    professorId: string;
    professorName: string;
    subject: string;
    lastMessage: string;
    timestamp: string;
    unread: boolean;
}

interface Message {
    id: string;
    sender: 'user' | 'professor';
    content: string;
    timestamp: string;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo' | 'help';

interface GetHelpProps {
    onNavigate: (page: Page) => void;
    viewMode?: 'student' | 'professor';
    onViewModeToggle?: () => void;
}

const GetHelp: React.FC<GetHelpProps> = ({ onNavigate, viewMode = 'student', onViewModeToggle  }) => {
    const [mainSidebarTab, setMainSidebarTab] = useState('help');
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAIChat, setShowAIChat] = useState(false);
    const [aiInput, setAIInput] = useState('');
    const { messages: aiMessages, isLoading: aiLoading, sendMessage: sendAIMessage } = useAIChat();

    const [professors] = useState<Professor[]>([
        {
            id: '1',
            name: 'Dr. Sarah Johnson',
            subject: 'Human Computer Interaction',
            avatar: 'SJ',
            status: 'online',
            responseTime: 'Usually responds in 2 hours'
        },
        {
            id: '2',
            name: 'Prof. Michael Chen',
            subject: 'Data Structures & Algorithms',
            avatar: 'MC',
            status: 'online',
            responseTime: 'Usually responds in 1 hour'
        },
        {
            id: '3',
            name: 'Dr. Emily Rodriguez',
            subject: 'Database Systems',
            avatar: 'ER',
            status: 'busy',
            responseTime: 'Usually responds in 4 hours'
        },
        {
            id: '4',
            name: 'Prof. David Kim',
            subject: 'Operating Systems',
            avatar: 'DK',
            status: 'offline',
            responseTime: 'Usually responds in 6 hours'
        },
        {
            id: '5',
            name: 'Dr. Lisa Anderson',
            subject: 'Web Development',
            avatar: 'LA',
            status: 'online',
            responseTime: 'Usually responds in 3 hours'
        }
    ]);

    const [conversations] = useState<Conversation[]>([
        {
            id: '1',
            professorId: '1',
            professorName: 'Dr. Sarah Johnson',
            subject: 'HCI Assignment Question',
            lastMessage: 'Thank you for the clarification!',
            timestamp: '2 hours ago',
            unread: false
        },
        {
            id: '2',
            professorId: '2',
            professorName: 'Prof. Michael Chen',
            subject: 'Binary Tree Implementation',
            lastMessage: 'Could you explain the time complexity?',
            timestamp: '1 day ago',
            unread: true
        },
        {
            id: '3',
            professorId: '3',
            professorName: 'Dr. Emily Rodriguez',
            subject: 'SQL Query Help',
            lastMessage: 'Thanks for your help!',
            timestamp: '3 days ago',
            unread: false
        }
    ]);

    const [messages] = useState<{ [key: string]: Message[] }>({
        '1': [
            {
                id: '1',
                sender: 'user',
                content: 'Hi Dr. Johnson, I have a question about the user research methods assignment.',
                timestamp: '10:30 AM'
            },
            {
                id: '2',
                sender: 'professor',
                content: 'Hello! I\'d be happy to help. What specific aspect are you struggling with?',
                timestamp: '10:45 AM'
            },
            {
                id: '3',
                sender: 'user',
                content: 'I\'m not sure how to structure the interview questions for the user personas section.',
                timestamp: '10:50 AM'
            },
            {
                id: '4',
                sender: 'professor',
                content: 'Great question! Start by identifying your target user groups, then create open-ended questions that explore their goals, pain points, and behaviors. Focus on "why" and "how" questions rather than yes/no questions.',
                timestamp: '11:00 AM'
            },
            {
                id: '5',
                sender: 'user',
                content: 'Thank you for the clarification!',
                timestamp: '11:15 AM'
            }
        ],
        '2': [
            {
                id: '1',
                sender: 'user',
                content: 'Hi Professor Chen, I need help understanding binary tree traversal.',
                timestamp: 'Yesterday 2:30 PM'
            },
            {
                id: '2',
                sender: 'professor',
                content: 'Sure! Are you working on in-order, pre-order, or post-order traversal?',
                timestamp: 'Yesterday 3:00 PM'
            },
            {
                id: '3',
                sender: 'user',
                content: 'Could you explain the time complexity?',
                timestamp: 'Yesterday 3:15 PM'
            }
        ]
    });

    const handleTabChange = (tab: string) => {
        setMainSidebarTab(tab);
        onNavigate(tab as Page);
    };

    const handleSendMessage = () => {
        if (messageInput.trim() && selectedConversation) {
            // In a real app, this would send the message to Microsoft Teams
            console.log('Sending message:', messageInput);
            setMessageInput('');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return '#6B9080';
            case 'busy': return '#F4A261';
            case 'offline': return '#9ca3af';
            default: return '#9ca3af';
        }
    };

    const filteredProfessors = professors.filter(prof =>
        prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedConv = conversations.find(c => c.id === selectedConversation);
    const currentMessages = selectedConversation ? messages[selectedConversation] || [] : [];

    return (
        <div className="help-page-container">
            <Sidebar activeTab={mainSidebarTab} setActiveTab={handleTabChange} viewMode={viewMode} onViewModeToggle={onViewModeToggle}/>

            {/* AI Help FAB - same unified chat as Notes/Grades */}
            <button
                className="ai-help-fab"
                onClick={() => setShowAIChat(!showAIChat)}
                title="Ask AI for Help"
                style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
                    width: 56, height: 56, borderRadius: '50%', border: 'none',
                    background: 'linear-gradient(135deg, #6B9080 0%, #A4C3B2 100%)',
                    color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
            >
                <Sparkles size={24} />
            </button>

            {showAIChat && (
                <div className="ai-chat-panel" style={{
                    position: 'fixed', bottom: 90, right: 24, zIndex: 999, width: 360, maxHeight: 480,
                    background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                    <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>AI Assistant</h3>
                        <button onClick={() => setShowAIChat(false)} aria-label="Close"><X size={18} /></button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: 12, minHeight: 200 }}>
                        {aiMessages.length === 0 && !aiLoading ? (
                            <p style={{ color: '#6b7280', fontSize: 14 }}>Ask me anything about your courses or assignments.</p>
                        ) : (
                            aiMessages.map((msg, idx) => (
                                <div key={idx} style={{ marginBottom: 8 }}>
                                    <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.text}
                                </div>
                            ))
                        )}
                        {aiLoading && <p style={{ opacity: 0.7 }}>Thinking...</p>}
                    </div>
                    <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            placeholder="Ask a question..."
                            value={aiInput}
                            onChange={(e) => setAIInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && aiInput.trim() && (sendAIMessage(aiInput.trim(), 'help'), setAIInput(''))}
                            disabled={aiLoading}
                            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
                        />
                        <button
                            onClick={() => aiInput.trim() && (sendAIMessage(aiInput.trim(), 'help'), setAIInput(''))}
                            disabled={!aiInput.trim() || aiLoading}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="help-content-wrapper">
                {/* Professors Sidebar */}
                <aside className="help-sidebar">
                    <div className="help-sidebar-header">
                        <h2>Get Help</h2>
                        <p className="help-subtitle">Connect with your professors</p>
                    </div>

                    <div className="help-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search professors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="professors-section">
                        <div className="section-header">
                            <Users size={16} />
                            <span>Available Professors</span>
                        </div>

                        {filteredProfessors.map(professor => (
                            <div
                                key={professor.id}
                                className="professor-item"
                                onClick={() => {
                                    // In a real app, this would start a new conversation
                                    const existingConv = conversations.find(c => c.professorId === professor.id);
                                    if (existingConv) {
                                        setSelectedConversation(existingConv.id);
                                    }
                                }}
                            >
                                <div className="professor-avatar">
                                    <div className="avatar-circle">{professor.avatar}</div>
                                    <div
                                        className="status-indicator"
                                        style={{ backgroundColor: getStatusColor(professor.status) }}
                                    />
                                </div>
                                <div className="professor-info">
                                    <div className="professor-name">{professor.name}</div>
                                    <div className="professor-subject">{professor.subject}</div>
                                    <div className="professor-response">
                                        <Clock size={12} />
                                        <span>{professor.responseTime}</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="professor-arrow" />
                            </div>
                        ))}
                    </div>

                    <div className="conversations-section">
                        <div className="section-header">
                            <MessageCircle size={16} />
                            <span>Recent Conversations</span>
                        </div>

                        {conversations.map(conversation => (
                            <div
                                key={conversation.id}
                                className={`conversation-item ${selectedConversation === conversation.id ? 'active' : ''}`}
                                onClick={() => setSelectedConversation(conversation.id)}
                            >
                                <div className="conversation-indicator">
                                    {conversation.unread ? (
                                        <Circle size={8} fill="#6B9080" color="#6B9080" />
                                    ) : (
                                        <CheckCircle2 size={14} color="#9ca3af" />
                                    )}
                                </div>
                                <div className="conversation-info">
                                    <div className="conversation-title">{conversation.subject}</div>
                                    <div className="conversation-meta">
                                        <span className="conversation-professor">{conversation.professorName}</span>
                                        <span className="conversation-time">{conversation.timestamp}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Chat Area */}
                <main className="help-main">
                    {selectedConversation ? (
                        <>
                            <div className="chat-header">
                                <div className="chat-header-info">
                                    <h2 className="chat-title">{selectedConv?.subject}</h2>
                                    <p className="chat-subtitle">{selectedConv?.professorName}</p>
                                </div>
                                <div className="chat-header-actions">
                                    <button className="chat-action-btn" title="Filter messages">
                                        <Filter size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="messages-container">
                                {currentMessages.map(message => (
                                    <div
                                        key={message.id}
                                        className={`message ${message.sender === 'user' ? 'message-user' : 'message-professor'}`}
                                    >
                                        <div className="message-avatar">
                                            {message.sender === 'user' ? (
                                                <User size={16} />
                                            ) : (
                                                <div className="professor-avatar-small">
                                                    {professors.find(p => p.id === selectedConv?.professorId)?.avatar}
                                                </div>
                                            )}
                                        </div>
                                        <div className="message-content">
                                            <div className="message-text">{message.content}</div>
                                            <div className="message-timestamp">{message.timestamp}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="message-input-container">
                                <input
                                    type="text"
                                    className="message-input"
                                    placeholder="Type your message..."
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button
                                    className="send-btn"
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim()}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <MessageCircle size={64} className="empty-icon" />
                            <h3>Select a conversation</h3>
                            <p>Choose a professor or recent conversation to start chatting</p>
                        </div>
                    )}
                </main>

                {/* Info Panel */}
                {selectedConversation && (
                    <aside className="info-panel">
                        <div className="info-header">
                            <h3>Conversation Details</h3>
                        </div>

                        <div className="info-content">
                            <div className="info-section">
                                <div className="info-label">Professor</div>
                                <div className="professor-card">
                                    <div className="professor-avatar-large">
                                        {professors.find(p => p.id === selectedConv?.professorId)?.avatar}
                                    </div>
                                    <div className="professor-details">
                                        <div className="professor-name-large">{selectedConv?.professorName}</div>
                                        <div className="professor-subject-large">
                                            {professors.find(p => p.id === selectedConv?.professorId)?.subject}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <div className="info-label">Status</div>
                                <div className="status-card">
                                    <div
                                        className="status-dot"
                                        style={{
                                            backgroundColor: getStatusColor(
                                                professors.find(p => p.id === selectedConv?.professorId)?.status || 'offline'
                                            )
                                        }}
                                    />
                                    <span className="status-text">
                                        {professors.find(p => p.id === selectedConv?.professorId)?.status === 'online'
                                            ? 'Online'
                                            : professors.find(p => p.id === selectedConv?.professorId)?.status === 'busy'
                                                ? 'Busy'
                                                : 'Offline'}
                                    </span>
                                </div>
                            </div>

                            <div className="info-section">
                                <div className="info-label">Response Time</div>
                                <div className="response-time-card">
                                    <Clock size={16} />
                                    <span>{professors.find(p => p.id === selectedConv?.professorId)?.responseTime}</span>
                                </div>
                            </div>

                            <div className="info-section">
                                <div className="info-label">Integration</div>
                                <div className="integration-badge">
                                    <MessageCircle size={16} />
                                    <span>Microsoft Teams</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default GetHelp;
