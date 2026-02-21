import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StarDisplay, ReviewForm, ReviewCard } from '../components/StarRating';

export default function MentorDashboard() {
    const { apiFetch } = useAuth();
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(null);
    const [studentRatings, setStudentRatings] = useState({});
    const [showReviewFor, setShowReviewFor] = useState(null);

    useEffect(() => { loadConnections(); }, []);

    async function loadConnections() {
        try {
            const data = await apiFetch('/connections');
            setConnections(data);

            const uniqueStudentIds = [...new Set(data.map(c => c.student_id))];
            if (uniqueStudentIds.length > 0) {
                const ratingResults = await Promise.allSettled(
                    uniqueStudentIds.map(id => apiFetch(`/reviews/${id}`))
                );
                const ratings = {};
                ratingResults.forEach((result, i) => {
                    if (result.status === 'fulfilled') ratings[uniqueStudentIds[i]] = result.value;
                });
                setStudentRatings(ratings);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStatus(connectionId, status) {
        try {
            await apiFetch(`/connections/${connectionId}`, {
                method: 'PUT', body: JSON.stringify({ status })
            });
            loadConnections();
        } catch (err) { console.error(err); }
    }

    async function handleDisconnect(connectionId) {
        setDisconnecting(connectionId);
        try {
            await apiFetch(`/connections/${connectionId}`, { method: 'DELETE' });
            loadConnections();
        } catch (err) { console.error(err); }
        finally { setDisconnecting(null); }
    }

    const pending = connections.filter(c => c.status === 'PENDING');
    const accepted = connections.filter(c => c.status === 'ACCEPTED');
    const rejected = connections.filter(c => c.status === 'REJECTED');

    if (loading) return (
        <div className="page">
            <div className="loading-spinner"><div className="spinner"></div><p>Loading dashboard...</p></div>
        </div>
    );

    /* ── Connection Card ── */
    function ConnCard({ conn, actions }) {
        const sRating = studentRatings[conn.student_id];
        return (
            <div className="glass-card request-card">
                <div className="request-info">
                    <div className="request-student-header">
                        <h4>🎓 {conn.student_name}</h4>
                        {sRating && sRating.totalReviews > 0 && (
                            <StarDisplay avg={sRating.avgRating} count={sRating.totalReviews} size={14} />
                        )}
                    </div>
                    <p><strong>Skills:</strong> {conn.student_skills || 'Not specified'}</p>
                    <p><strong>Goals:</strong> {conn.student_goals || 'Not specified'}</p>
                    {conn.message && <p><em>"{conn.message}"</em></p>}
                </div>
                <div className="request-actions">{actions}</div>

                {showReviewFor === conn.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                        <ReviewForm
                            connectionId={conn.id}
                            revieweeId={conn.student_id}
                            revieweeName={conn.student_name}
                            apiFetch={apiFetch}
                            onDone={() => { setShowReviewFor(null); loadConnections(); }}
                        />
                    </div>
                )}

                {/* Reviews about this student */}
                {sRating && sRating.reviews.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-glass)' }}>
                        <p className="request-reviews-label">💬 Reviews:</p>
                        {sRating.reviews.slice(0, 2).map(r => <ReviewCard key={r.id} review={r} />)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>Mentor Dashboard 💼</h1>
                <p>Manage your mentorship requests and connections.</p>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="glass-card stat-card">
                    <div className="stat-value">{pending.length}</div>
                    <div className="stat-label">Pending</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">{accepted.length}</div>
                    <div className="stat-label">Active Mentees</div>
                </div>
                <div className="glass-card stat-card">
                    <div className="stat-value">{connections.length}</div>
                    <div className="stat-label">Total Requests</div>
                </div>
            </div>

            {/* ── PENDING (only if any) ── */}
            {pending.length > 0 && (
                <div className="md-section">
                    <div className="md-section-header">
                        <h2>📬 Pending Requests</h2>
                        <span className="tab-count" style={{ fontSize: 'var(--font-size-sm)', padding: '2px 10px' }}>{pending.length}</span>
                    </div>
                    <div className="md-cards">
                        {pending.map(conn => (
                            <ConnCard key={conn.id} conn={conn} actions={
                                <>
                                    <button className="btn btn-success btn-sm" onClick={() => handleUpdateStatus(conn.id, 'ACCEPTED')}>✅ Accept</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(conn.id, 'REJECTED')}>❌ Reject</button>
                                </>
                            } />
                        ))}
                    </div>
                </div>
            )}

            {/* ── ACCEPTED ── */}
            {accepted.length > 0 && (
                <div className="md-section">
                    <div className="md-section-header">
                        <h2>🤝 Active Mentees</h2>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{accepted.length} connected</span>
                    </div>
                    <div className="md-cards">
                        {accepted.map(conn => (
                            <ConnCard key={conn.id} conn={conn} actions={
                                <>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setShowReviewFor(showReviewFor === conn.id ? null : conn.id)}
                                    >
                                        {showReviewFor === conn.id ? 'Cancel' : '⭐ Review'}
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDisconnect(conn.id)}
                                        disabled={disconnecting === conn.id}
                                    >
                                        {disconnecting === conn.id ? 'Removing...' : '🔌 Disconnect'}
                                    </button>
                                </>
                            } />
                        ))}
                    </div>
                </div>
            )}

            {/* ── REJECTED ── */}
            {rejected.length > 0 && (
                <div className="md-section">
                    <div className="md-section-header">
                        <h2>❌ Rejected</h2>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{rejected.length}</span>
                    </div>
                    <div className="md-cards">
                        {rejected.map(conn => (
                            <ConnCard key={conn.id} conn={conn} actions={null} />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {connections.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No requests yet</h3>
                    <p>New mentorship requests will appear here.</p>
                </div>
            )}
        </div>
    );
}
