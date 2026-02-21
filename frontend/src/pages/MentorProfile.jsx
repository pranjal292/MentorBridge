import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StarDisplay, ReviewForm, ReviewCard } from '../components/StarRating';

export default function MentorProfile() {
    const { id } = useParams();
    const { apiFetch, user } = useAuth();
    const navigate = useNavigate();
    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [connectionId, setConnectionId] = useState(null);
    const [requesting, setRequesting] = useState(false);
    const [reviewData, setReviewData] = useState({ reviews: [], avgRating: 0, totalReviews: 0 });
    const [myReview, setMyReview] = useState(null);

    useEffect(() => { loadAll(); }, [id]);

    async function loadAll() {
        try {
            const [mentorData, connections, revData] = await Promise.all([
                apiFetch(`/profile/mentors/${id}`),
                user.role === 'STUDENT' ? apiFetch('/connections') : Promise.resolve([]),
                apiFetch(`/reviews/${id}`)
            ]);
            setMentor(mentorData);
            setReviewData(revData);

            const conn = connections.find(c => c.mentor_id === parseInt(id));
            if (conn) {
                setConnectionStatus(conn.status);
                setConnectionId(conn.id);
            }

            // Find if I already reviewed
            const mine = revData.reviews.find(r => r.reviewer_name === user.name);
            if (mine) setMyReview(mine);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleRequest() {
        setRequesting(true);
        try {
            await apiFetch('/connections', {
                method: 'POST',
                body: JSON.stringify({ mentor_id: parseInt(id), message: 'I would love to learn from your experience!' })
            });
            setConnectionStatus('PENDING');
        } catch (err) {
            if (err.message.includes('already exists')) setConnectionStatus('PENDING');
        } finally {
            setRequesting(false);
        }
    }

    if (loading) return (
        <div className="page">
            <div className="loading-spinner"><div className="spinner"></div><p>Loading profile...</p></div>
        </div>
    );

    if (!mentor) return (
        <div className="page">
            <div className="empty-state">
                <h3>Mentor not found</h3>
                <Link to="/" className="btn btn-primary">Back to Dashboard</Link>
            </div>
        </div>
    );

    const expertiseTags = (mentor.expertise || '').split(',').map(t => t.trim()).filter(Boolean);
    const initial = (mentor.name || '?')[0].toUpperCase();
    const canReview = user.role === 'STUDENT' && connectionStatus === 'ACCEPTED' && connectionId;

    return (
        <div className="page">
            <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
                ← Back
            </button>

            <div className="profile-detail">
                {/* Hero */}
                <div className="glass-card profile-hero">
                    <div className="profile-avatar-lg">{initial}</div>
                    <h1>{mentor.name}</h1>
                    <div className="profile-title">{mentor.title}</div>
                    <div className="profile-company">at {mentor.company} · {mentor.years_exp} years experience</div>

                    {/* Star rating display */}
                    <div style={{ margin: '0.75rem 0' }}>
                        <StarDisplay avg={reviewData.avgRating} count={reviewData.totalReviews} />
                    </div>

                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {user.role === 'STUDENT' && !connectionStatus && (
                            <button className="btn btn-primary" onClick={handleRequest} disabled={requesting}>
                                {requesting ? 'Sending...' : '🤝 Request Mentorship'}
                            </button>
                        )}
                        {connectionStatus === 'PENDING' && <span className="status-badge pending">⏳ Request Pending</span>}
                        {connectionStatus === 'ACCEPTED' && (
                            <>
                                <span className="status-badge accepted">✅ Connected</span>
                                {mentor.meeting_link && (
                                    <a href={mentor.meeting_link} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
                                        📹 Meeting Link
                                    </a>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* About */}
                <div className="glass-card profile-section">
                    <h3>💡 About</h3>
                    <p>{mentor.bio}</p>
                </div>

                {/* Expertise */}
                <div className="glass-card profile-section">
                    <h3>🛠️ Expertise</h3>
                    <div className="expertise-tags">
                        {expertiseTags.map((tag, i) => <span key={i} className="tag">{tag}</span>)}
                    </div>
                </div>

                {/* Review form for connected student */}
                {canReview && (
                    <div className="glass-card profile-section">
                        <h3>⭐ {myReview ? 'Your Review' : 'Leave a Review'}</h3>
                        <ReviewForm
                            connectionId={connectionId}
                            revieweeId={parseInt(id)}
                            revieweeName={mentor.name}
                            apiFetch={apiFetch}
                            existingReview={myReview}
                            onDone={(r) => {
                                setMyReview(r);
                                loadAll();
                            }}
                        />
                    </div>
                )}

                {/* All reviews */}
                {reviewData.reviews.length > 0 && (
                    <div className="glass-card profile-section">
                        <h3>💬 Reviews ({reviewData.totalReviews})</h3>
                        <div className="reviews-list">
                            {reviewData.reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                        </div>
                    </div>
                )}

                {/* Meeting link */}
                {mentor.meeting_link && (
                    <div className="glass-card profile-section">
                        <h3>📅 Connect</h3>
                        <p>
                            {connectionStatus === 'ACCEPTED'
                                ? <a href={mentor.meeting_link} target="_blank" rel="noopener">Join Meeting →</a>
                                : 'Meeting link available after connection is accepted.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
