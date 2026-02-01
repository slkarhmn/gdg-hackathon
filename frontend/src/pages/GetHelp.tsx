import React, { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
    Send,
    MessageCircle,
    Search,
    ChevronRight,
    RefreshCw,
    Loader2,
    AlertCircle,
    LogOut
} from 'lucide-react';
import './GetHelp.css';
import { useAuth } from '../auth/AuthContext';

// Backend API base URL
const API_BASE = 'http://localhost:5000/api';

interface Chat {
    id: string;
    topic?: string;
    chatType: string;
    createdDateTime: string;
    lastUpdatedDateTime: string;
}

interface Message {
    id: string;
    sender: 'user' | 'other';
    senderName: string;
    content: string;
    timestamp: string;
}

type Page = 'dashboard' | 'notes' | 'calendar' | 'analytics' | 'files' | 'grades' | 'todo' | 'help';

interface GetHelpProps {
    onNavigate: (page: Page) => void;
}

const GetHelp: React.FC<GetHelpProps> = ({ onNavigate }) => {
    // ✅ FIXED: Use AuthContext instead of localStorage directly
    const { getAccessToken, logout, isAuthenticated } = useAuth();
    
    const [mainSidebarTab, setMainSidebarTab] = useState('help');
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [chats, setChats] = useState<Chat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionError, setPermissionError] = useState(false);

    // Fetch chats when component mounts
    useEffect(() => {
        if (isAuthenticated) {
            fetchChats();
        }
    }, [isAuthenticated]);

    // Fetch messages when a chat is selected
    useEffect(() => {
        if (selectedChatId) {
            fetchMessages(selectedChatId);
        }
    }, [selectedChatId]);

    const fetchChats = async () => {
        try {
            setIsLoadingChats(true);
            setError(null);
            setPermissionError(false);

            // ✅ FIXED: Get fresh token from MSAL
            const token = await getAccessToken();
            if (!token) {
                setError('Not authenticated. Please sign in with Microsoft.');
                setIsLoadingChats(false);
                return;
            }

            console.log('🔵 Fetching chats with MSAL token...');

            const response = await fetch(`${API_BASE}/teams/chats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('🔵 Chats response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Chats error:', errorText);
                
                // Check if it's a 403 Forbidden error (permissions issue)
                if (response.status === 403) {
                    setPermissionError(true);
                    throw new Error('Permission denied. You need to sign out and sign in again to grant chat access permissions.');
                }
                
                throw new Error(`Failed to load chats (${response.status})`);
            }

            const data = await response.json();
            console.log('✅ Chats loaded:', data.chats?.length || 0, 'chats');
            
            setChats(data.chats || []);
        } catch (err: any) {
            console.error('❌ Error fetching chats:', err);
            setError(err.message || 'Failed to load chats');
        } finally {
            setIsLoadingChats(false);
        }
    };

    const fetchMessages = async (chatId: string) => {
        try {
            setIsLoadingMessages(true);
            setError(null);

            // ✅ FIXED: Get fresh token from MSAL
            const token = await getAccessToken();
            if (!token) return;

            const response = await fetch(`${API_BASE}/teams/chats/${chatId}/messages?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            const teamsMessages = data.messages || [];

            // Convert to our format
            const formattedMessages: Message[] = teamsMessages.reverse().map((msg: any) => ({
                id: msg.id,
                sender: msg.from?.user?.displayName === 'You' ? 'user' : 'other',
                senderName: msg.from?.user?.displayName || 'Unknown',
                content: stripHtml(msg.body.content),
                timestamp: formatTimestamp(msg.createdDateTime),
            }));

            setMessages(formattedMessages);
        } catch (err: any) {
            console.error('Error fetching messages:', err);
            setError('Failed to load messages.');
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedChatId) return;

        try {
            setIsSending(true);
            setError(null);

            // ✅ FIXED: Get fresh token from MSAL
            const token = await getAccessToken();
            if (!token) {
                setError('Not authenticated.');
                return;
            }

            const response = await fetch(`${API_BASE}/teams/chats/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: selectedChatId,
                    message: messageInput
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            setMessageInput('');

            // Refresh messages
            setTimeout(() => {
                fetchMessages(selectedChatId);
            }, 500);

        } catch (err: any) {
            console.error('Error sending message:', err);
            setError('Failed to send message: ' + err.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMessage = () => {
        sendMessage();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleForceRelogin = () => {
        // Clear tokens and sign out via MSAL
        logout();
    };

    const stripHtml = (html: string): string => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const formatTimestamp = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    const getChatDisplayName = (chat: Chat): string => {
        if (chat.topic) return chat.topic;
        if (chat.chatType === 'oneOnOne') return 'Direct Message';
        return 'Group Chat';
    };

    const getChatPreview = (chat: Chat): string => {
        return `Last updated: ${formatTimestamp(chat.lastUpdatedDateTime)}`;
    };

    const filteredChats = chats.filter(chat =>
        getChatDisplayName(chat).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedChat = chats.find(c => c.id === selectedChatId);

    return (
        <div className="get-help-container">
            <Sidebar activeTab={mainSidebarTab} onTabChange={setMainSidebarTab} onNavigate={onNavigate} />
            
            <div className="get-help-content">
                <div className="get-help-header">
                    <div className="header-left">
                        <MessageCircle size={24} />
                        <h1>Get Help - Teams Chat</h1>
                    </div>
                    <div className="header-actions">
                        <button 
                            className="refresh-button"
                            onClick={fetchChats}
                            disabled={isLoadingChats}
                        >
                            {isLoadingChats ? (
                                <Loader2 size={18} className="spinning" />
                            ) : (
                                <RefreshCw size={18} />
                            )}
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Permission Error Banner */}
                {permissionError && (
                    <div className="error-banner" style={{ 
                        backgroundColor: '#fee2e2', 
                        border: '1px solid #fca5a5',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                    }}>
                        <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, marginBottom: '8px', color: '#dc2626', fontSize: '16px', fontWeight: '600' }}>
                                Missing Chat Permissions
                            </h3>
                            <p style={{ margin: 0, marginBottom: '12px', color: '#991b1b', fontSize: '14px' }}>
                                Your account doesn't have permission to access Teams chats. Please sign out and sign in again.
                            </p>
                            <button 
                                onClick={handleForceRelogin}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                <LogOut size={16} />
                                Sign Out and Re-login
                            </button>
                        </div>
                    </div>
                )}

                {/* Regular Error Banner */}
                {error && !permissionError && (
                    <div className="error-banner">
                        <p>{error}</p>
                    </div>
                )}

                <div className="get-help-main">
                    {/* Left Panel - Chats List */}
                    <div className="chats-panel">
                        <div className="panel-header">
                            <h2>Your Chats</h2>
                            <span className="chat-count">{filteredChats.length}</span>
                        </div>

                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {isLoadingChats ? (
                            <div className="loading-state">
                                <Loader2 size={32} className="spinning" />
                                <p>Loading chats...</p>
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="empty-state">
                                <MessageCircle size={48} />
                                <p>No chats found</p>
                                <small>Start a conversation in Microsoft Teams</small>
                            </div>
                        ) : (
                            <div className="chats-list">
                                {filteredChats.map(chat => (
                                    <div
                                        key={chat.id}
                                        className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`}
                                        onClick={() => setSelectedChatId(chat.id)}
                                    >
                                        <div className="chat-avatar">
                                            <MessageCircle size={20} />
                                        </div>
                                        <div className="chat-info">
                                            <div className="chat-name">{getChatDisplayName(chat)}</div>
                                            <div className="chat-preview">{getChatPreview(chat)}</div>
                                        </div>
                                        <ChevronRight size={18} className="chat-arrow" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Messages */}
                    <div className="messages-panel">
                        {!selectedChatId ? (
                            <div className="no-chat-selected">
                                <MessageCircle size={64} />
                                <h3>Select a chat to start messaging</h3>
                                <p>Choose from your existing conversations</p>
                            </div>
                        ) : (
                            <>
                                <div className="chat-header">
                                    <div className="chat-header-info">
                                        <h3>{selectedChat ? getChatDisplayName(selectedChat) : 'Chat'}</h3>
                                        <span className="chat-type">{selectedChat?.chatType}</span>
                                    </div>
                                </div>

                                <div className="messages-area">
                                    {isLoadingMessages ? (
                                        <div className="loading-state">
                                            <Loader2 size={32} className="spinning" />
                                            <p>Loading messages...</p>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="empty-messages">
                                            <p>No messages yet. Start the conversation!</p>
                                        </div>
                                    ) : (
                                        messages.map(message => (
                                            <div
                                                key={message.id}
                                                className={`message ${message.sender === 'user' ? 'message-user' : 'message-other'}`}
                                            >
                                                <div className="message-content">
                                                    {message.sender === 'other' && (
                                                        <div className="message-sender">{message.senderName}</div>
                                                    )}
                                                    <div className="message-text">{message.content}</div>
                                                    <div className="message-time">{message.timestamp}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="message-input-container">
                                    <input
                                        type="text"
                                        placeholder="Type your message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        disabled={isSending}
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || isSending}
                                        className="send-button"
                                    >
                                        {isSending ? (
                                            <Loader2 size={20} className="spinning" />
                                        ) : (
                                            <Send size={20} />
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GetHelp;