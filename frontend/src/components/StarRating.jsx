import { useState } from 'react';

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// ── Display mode (read-only SVG stars) ──────────────────
export function StarDisplay({ avg = 0, count = 0, size = 18 }) {
    return (
        <div className="star-display">
            <div className="stars-row">
                {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} width={size} height={size} viewBox="0 0 24 24"
                        fill={s <= Math.round(avg) ? '#f59e0b' : 'none'}
                        stroke="#f59e0b" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        style={{ pointerEvents: 'none' }}
                    >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                ))}
            </div>
            {count > 0
                ? <span className="star-meta">{avg.toFixed(1)} <span className="star-count">({count} review{count !== 1 ? 's' : ''})</span></span>
                : <span className="star-meta star-none">No reviews yet</span>
            }
        </div>
    );
}

// ── Full review form (button-based stars — reliable clicks) ──
export function ReviewForm({ connectionId, revieweeId, revieweeName, apiFetch, existingReview, onDone }) {
    const [hovered, setHovered] = useState(0);
    const [selected, setSelected] = useState(existingReview?.rating || 0);
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selected) { setError('Please select a star rating.'); return; }
        setSubmitting(true);
        setError('');
        try {
            await apiFetch('/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    reviewee_id: revieweeId,
                    connection_id: connectionId,
                    rating: selected,
                    comment
                })
            });
            setDone(true);
            if (onDone) onDone({ rating: selected, comment });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (done) {
        return (
            <div className="review-form-done">
                <span className="review-done-icon">✅</span>
                <p>Review submitted for <strong>{revieweeName}</strong>!</p>
            </div>
        );
    }

    const active = hovered || selected;

    return (
        <form className="review-form" onSubmit={handleSubmit}>
            <h4 className="review-form-title">
                {existingReview ? 'Update your review' : `Leave a review for ${revieweeName}`}
            </h4>

            {/* Button-based stars — guaranteed click events */}
            <div className="star-input-row">
                {[1, 2, 3, 4, 5].map(s => (
                    <button
                        key={s}
                        type="button"
                        className={`star-btn ${s <= active ? 'filled' : ''}`}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setSelected(s)}
                        aria-label={`${s} star${s !== 1 ? 's' : ''}`}
                    >
                        ★
                    </button>
                ))}
                {selected > 0 && (
                    <span className="star-label">{STAR_LABELS[selected]}</span>
                )}
            </div>

            <textarea
                className="review-textarea"
                placeholder="Share your experience (optional)..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
            />

            {error && <p className="review-error">{error}</p>}

            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !selected}>
                {submitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
            </button>
        </form>
    );
}

// ── Single review card ───────────────────────────────────
export function ReviewCard({ review }) {
    const date = new Date(review.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return (
        <div className="review-card">
            <div className="review-card-header">
                <div className="review-card-avatar">
                    {(review.reviewer_name || '?')[0].toUpperCase()}
                </div>
                <div className="review-card-meta">
                    <span className="review-card-name">{review.reviewer_name}</span>
                    <span className="review-card-role">{review.reviewer_role}</span>
                </div>
                <div className="review-card-stars">
                    {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} style={{ color: s <= review.rating ? '#f59e0b' : '#4b5563', fontSize: '14px' }}>★</span>
                    ))}
                </div>
                <span className="review-card-date">{date}</span>
            </div>
            {review.comment && <p className="review-card-comment">"{review.comment}"</p>}
        </div>
    );
}
