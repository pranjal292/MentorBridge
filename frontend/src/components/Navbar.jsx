import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const { user, apiFetch } = useAuth();
    const [unread, setUnread] = useState(0);

    // Poll for unread message count every 15 seconds
    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        async function checkUnread() {
            try {
                const data = await apiFetch('/messages/unread/count');
                if (!cancelled) setUnread(data.unread || 0);
            } catch { /* silent */ }
        }

        checkUnread();
        const interval = setInterval(checkUnread, 15000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [user]);

    const contentLink = (
        <NavLink key="content" to="/content" className={({ isActive }) => `pill-item${isActive ? ' active' : ''}`}>
            <svg className="pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"></path>
                <path d="M4 6h2"></path><path d="M4 10h2"></path>
                <path d="M4 14h2"></path><path d="M4 18h2"></path>
                <line x1="10" y1="6" x2="18" y2="6"></line>
                <line x1="10" y1="10" x2="18" y2="10"></line>
                <line x1="10" y1="14" x2="14" y2="14"></line>
            </svg>
            <span className="pill-label">Content</span>
        </NavLink>
    );

    const insightsLink = (
        <NavLink key="insights" to="/insights" className={({ isActive }) => `pill-item${isActive ? ' active' : ''}`}>
            <svg className="pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <span className="pill-label">Insights</span>
        </NavLink>
    );

    const chatLink = (
        <NavLink
            key="chat"
            to="/messages"
            className={({ isActive }) => `pill-item${isActive ? ' active' : ''}`}
            onClick={() => setUnread(0)}
        >
            <div className="pill-icon-wrap">
                <svg className="pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                {unread > 0 && <span className="nav-unread-dot" />}
            </div>
            <span className="pill-label">Chat</span>
        </NavLink>
    );

    return (
        <nav className="bottom-pill">
            <NavLink to="/" end className={({ isActive }) => `pill-item${isActive ? ' active' : ''}`}>
                <svg className="pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="pill-label">Home</span>
            </NavLink>

            {(user?.role === 'MENTOR' || user?.user?.role === 'MENTOR') ? (
                <>{chatLink}{insightsLink}{contentLink}</>
            ) : (
                <>{contentLink}{insightsLink}{chatLink}</>
            )}

            <NavLink to="/my-profile" className={({ isActive }) => `pill-item${isActive ? ' active' : ''}`}>
                <svg className="pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="pill-label">Profile</span>
            </NavLink>
        </nav>
    );
}
