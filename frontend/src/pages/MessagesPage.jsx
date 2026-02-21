import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function MessagesPage() {
    const { apiFetch, user } = useAuth();
    const [connections, setConnections] = useState([]);
    const [activeConnection, setActiveConnection] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [lightbox, setLightbox] = useState(null); // { type: 'image'|'video', src }
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') { setLightbox(null); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        loadConnections();
    }, []);

    useEffect(() => {
        if (activeConnection) {
            loadMessages(activeConnection.id);
            const interval = setInterval(() => loadMessages(activeConnection.id), 5000);
            return () => clearInterval(interval);
        }
    }, [activeConnection]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function loadConnections() {
        try {
            const data = await apiFetch('/connections');
            const accepted = data.filter(c => c.status === 'ACCEPTED');
            setConnections(accepted);
            if (accepted.length > 0 && !activeConnection) {
                setActiveConnection(accepted[0]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadMessages(connectionId) {
        try {
            const data = await apiFetch(`/messages/${connectionId}`);
            setMessages(data);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleSend(e) {
        e.preventDefault();
        const hasText = newMessage.trim();
        const hasMedia = mediaPreview;
        if ((!hasText && !hasMedia) || !activeConnection) return;

        setSending(true);
        try {
            if (hasMedia) {
                // Send media encoded as prefixed content
                const prefix = mediaPreview.type === 'video' ? '[VIDEO:' : '[IMAGE:';
                const content = `${prefix}${mediaPreview.dataUrl}]`;
                await apiFetch(`/messages/${activeConnection.id}`, {
                    method: 'POST',
                    body: JSON.stringify({ content })
                });
                setMediaPreview(null);
            }
            if (hasText) {
                await apiFetch(`/messages/${activeConnection.id}`, {
                    method: 'POST',
                    body: JSON.stringify({ content: newMessage.trim() })
                });
                setNewMessage('');
            }
            await loadMessages(activeConnection.id);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isImage && !isVideo) {
            alert('Only images and videos are supported.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Max 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setMediaPreview({
                type: isVideo ? 'video' : 'image',
                dataUrl: ev.target.result,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    const getOtherName = (conn) => {
        return user.role === 'STUDENT' ? conn.mentor_name : conn.student_name;
    };

    const getOtherMeta = (conn) => {
        return user.role === 'STUDENT'
            ? `${conn.mentor_title || ''} at ${conn.mentor_company || ''}`
            : `Skills: ${conn.student_skills || 'N/A'}`;
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Parse message content: returns { type: 'text'|'image'|'video', value }
    const parseContent = (content) => {
        if (content.startsWith('[IMAGE:') && content.endsWith(']')) {
            return { type: 'image', value: content.slice(7, -1) };
        }
        if (content.startsWith('[VIDEO:') && content.endsWith(']')) {
            return { type: 'video', value: content.slice(7, -1) };
        }
        return { type: 'text', value: content };
    };

    if (loading) {
        return (
            <div className="msg-page">
                <div className="loading-spinner"><div className="spinner"></div><p>Loading messages...</p></div>
            </div>
        );
    }

    if (connections.length === 0) {
        return (
            <div className="msg-page">
                <div className="msg-empty-full">
                    <div className="msg-empty-icon">💬</div>
                    <h2>No conversations yet</h2>
                    <p>Connect with a mentor or student to start chatting.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="msg-page">
            <div className={`msg-layout ${showSidebar ? 'sidebar-open' : ''}`}>
                {/* Sidebar */}
                <aside className="msg-sidebar">
                    <div className="msg-sidebar-header">
                        <h2>Chats</h2>
                        <span className="msg-count">{connections.length}</span>
                    </div>

                    <div className="msg-contacts">
                        {connections.map(conn => {
                            const name = getOtherName(conn);
                            const isActive = activeConnection?.id === conn.id;
                            return (
                                <button
                                    key={conn.id}
                                    className={`msg-contact ${isActive ? 'active' : ''}`}
                                    onClick={() => { setActiveConnection(conn); setShowSidebar(false); }}
                                >
                                    <div className="msg-contact-avatar">
                                        {getInitials(name)}
                                        <span className="msg-online-dot"></span>
                                    </div>
                                    <div className="msg-contact-info">
                                        <span className="msg-contact-name">{name}</span>
                                        <span className="msg-contact-meta">{getOtherMeta(conn)}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Chat Area */}
                <main className="msg-chat">
                    {/* Chat Header */}
                    <div className="msg-chat-header">
                        <button className="msg-menu-btn" onClick={() => setShowSidebar(!showSidebar)}>
                            ☰
                        </button>
                        {activeConnection && (
                            <>
                                <div className="msg-chat-header-info">
                                    <div className="msg-header-avatar">
                                        {getInitials(getOtherName(activeConnection))}
                                    </div>
                                    <div>
                                        <div className="msg-header-name">{getOtherName(activeConnection)}</div>
                                        <div className="msg-header-status">
                                            <span className="msg-status-dot"></span>
                                            Online
                                        </div>
                                    </div>
                                </div>
                                {/* Video Call button */}
                                <button
                                    className="msg-video-btn"
                                    onClick={() => {
                                        const targetUserId = user.role === 'STUDENT' ? activeConnection.mentor_id : activeConnection.student_id;
                                        window.dispatchEvent(new CustomEvent('start-global-call', {
                                            detail: {
                                                connection: activeConnection,
                                                targetUserId,
                                                callerName: user.name
                                            }
                                        }));
                                    }}
                                    title="Start live video call"
                                    aria-label="Start live video call"
                                >
                                    <span className="msg-video-btn-ring" />
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
                                    </svg>
                                    <span className="msg-video-btn-label">Live</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="msg-messages">
                        {messages.length === 0 ? (
                            <div className="msg-empty-chat">
                                <div className="msg-empty-icon">👋</div>
                                <h3>Start the conversation</h3>
                                <p>Say hello and break the ice!</p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, i) => {
                                    const isSent = msg.sender_id === user.id;
                                    const showAvatar = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
                                    const parsed = parseContent(msg.content);
                                    return (
                                        <div key={msg.id} className={`msg-row ${isSent ? 'sent' : 'received'}`}>
                                            {!isSent && showAvatar && (
                                                <div className="msg-bubble-avatar">
                                                    {getInitials(msg.sender_name)}
                                                </div>
                                            )}
                                            {!isSent && !showAvatar && <div className="msg-bubble-avatar-spacer"></div>}
                                            <div className={`msg-bubble ${isSent ? 'sent' : 'received'} ${parsed.type !== 'text' ? 'media-bubble' : ''}`}>
                                                {parsed.type === 'image' && (
                                                    <img
                                                        src={parsed.value}
                                                        alt="Shared image"
                                                        className="msg-media-img"
                                                        onClick={() => setLightbox({ type: 'image', src: parsed.value })}
                                                    />
                                                )}
                                                {parsed.type === 'video' && (
                                                    <video
                                                        src={parsed.value}
                                                        controls
                                                        className="msg-media-video"
                                                        onClick={e => { e.preventDefault(); setLightbox({ type: 'video', src: parsed.value }); }}
                                                    />
                                                )}
                                                {parsed.type === 'text' && <p>{parsed.value}</p>}
                                                <span className="msg-time">{formatTime(msg.created_at)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Media Preview */}
                    {mediaPreview && (
                        <div className="msg-media-preview">
                            <div className="msg-media-preview-inner">
                                {mediaPreview.type === 'image'
                                    ? <img src={mediaPreview.dataUrl} alt="Preview" className="msg-media-preview-thumb" />
                                    : <video src={mediaPreview.dataUrl} className="msg-media-preview-thumb" controls />
                                }
                                <span className="msg-media-preview-name">{mediaPreview.name}</span>
                                <button
                                    className="msg-media-remove"
                                    onClick={() => setMediaPreview(null)}
                                    title="Remove"
                                >✕</button>
                            </div>
                        </div>
                    )}

                    {/* Input Bar */}
                    <form onSubmit={handleSend} className="msg-input-bar">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />

                        {/* Attach button */}
                        <button
                            type="button"
                            className="msg-attach-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Send photo or video"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </button>

                        <input
                            type="text"
                            className="msg-input"
                            placeholder={mediaPreview ? 'Add a caption (optional)...' : 'Type a message...'}
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            disabled={!activeConnection}
                        />

                        <button
                            type="submit"
                            className="msg-send-btn"
                            disabled={sending || (!newMessage.trim() && !mediaPreview)}
                        >
                            {sending
                                ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
                                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            }
                        </button>
                    </form>
                </main>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
                    <button className="lightbox-close" onClick={() => setLightbox(null)} title="Close">✕</button>
                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        {lightbox.type === 'image'
                            ? <img src={lightbox.src} alt="Full screen" className="lightbox-media" />
                            : <video src={lightbox.src} controls autoPlay className="lightbox-media" />
                        }
                    </div>
                </div>
            )}
        </div>
    );
}
