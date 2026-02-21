import { Link } from 'react-router-dom';
import { StarDisplay } from './StarRating';

export default function MentorCard({ mentor, connectionStatus, onRequestMentorship, onDisconnect, disconnecting }) {
    const initial = (mentor.name || '?')[0].toUpperCase();
    const expertiseTags = (mentor.expertise || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);

    return (
        <div className="glass-card mentor-card">
            {mentor.compatibility && (
                <div className="compatibility-badge">
                    ⚡ {mentor.compatibility}%
                </div>
            )}

            <div className="mentor-card-header">
                <div className="mentor-avatar">{initial}</div>
                <div className="mentor-info">
                    <h3>{mentor.name}</h3>
                    <div className="mentor-title">{mentor.title}</div>
                    <div className="mentor-company">{mentor.company}</div>
                    <StarDisplay avg={mentor.avgRating || 0} count={mentor.totalReviews || 0} size={14} />
                </div>
            </div>

            {mentor.reason && <div className="match-reason">"{mentor.reason}"</div>}

            <div className="expertise-tags">
                {expertiseTags.map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                ))}
            </div>

            <div className="mentor-card-actions">
                <Link to={`/mentor/${mentor.mentor_id || mentor.id}`} className="btn btn-secondary btn-sm">
                    View Profile
                </Link>

                {connectionStatus === 'PENDING' && onDisconnect && (
                    <button className="btn btn-danger btn-sm" onClick={() => onDisconnect(mentor.mentor_id || mentor.id)} disabled={disconnecting}>
                        {disconnecting ? 'Cancelling...' : '⏳ Cancel Request'}
                    </button>
                )}
                {connectionStatus === 'ACCEPTED' && onDisconnect && (
                    <button className="btn btn-danger btn-sm" onClick={() => onDisconnect(mentor.mentor_id || mentor.id)} disabled={disconnecting}>
                        {disconnecting ? 'Disconnecting...' : '🔌 Disconnect'}
                    </button>
                )}
                {connectionStatus === 'REJECTED' && (
                    <span className="status-badge rejected">❌ Rejected</span>
                )}
                {!connectionStatus && onRequestMentorship && (
                    <button className="btn btn-primary btn-sm" onClick={() => onRequestMentorship(mentor.mentor_id || mentor.id)}>
                        Request Mentorship
                    </button>
                )}
            </div>
        </div>
    );
}
