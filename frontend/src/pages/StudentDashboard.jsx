import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MentorCard from '../components/MentorCard';
import { StarDisplay } from '../components/StarRating';

export default function StudentDashboard() {
    const { apiFetch, user } = useAuth();
    const [matches, setMatches] = useState([]);
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(null);
    const [disconnecting, setDisconnecting] = useState(null);
    const [error, setError] = useState('');
    const [mentorRatings, setMentorRatings] = useState({});

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterExpertise, setFilterExpertise] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [filterMinExp, setFilterMinExp] = useState('');
    const [sortBy, setSortBy] = useState('compatibility');
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [matchesData, connectionsData] = await Promise.all([
                apiFetch('/ai/match'),
                apiFetch('/connections')
            ]);
            setMatches(matchesData);
            setConnections(connectionsData);
            // Fetch ratings for all mentors in accepted connections
            const accepted = connectionsData.filter(c => c.status === 'ACCEPTED');
            if (accepted.length > 0) {
                const ratingResults = await Promise.allSettled(
                    accepted.map(c => apiFetch(`/reviews/${c.mentor_id}`))
                );
                const ratings = {};
                ratingResults.forEach((result, i) => {
                    if (result.status === 'fulfilled') {
                        ratings[accepted[i].mentor_id] = result.value;
                    }
                });
                setMentorRatings(ratings);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRequestMentorship(mentorId) {
        setRequesting(mentorId);
        try {
            await apiFetch('/connections', {
                method: 'POST',
                body: JSON.stringify({ mentor_id: mentorId, message: 'I would love to connect and learn from your experience!' })
            });
            const updatedConnections = await apiFetch('/connections');
            setConnections(updatedConnections);
        } catch (err) {
            if (err.message.includes('already exists')) {
                const updatedConnections = await apiFetch('/connections');
                setConnections(updatedConnections);
            } else {
                setError(err.message);
            }
        } finally {
            setRequesting(null);
        }
    }

    async function handleDisconnect(mentorId) {
        const conn = connections.find(c => c.mentor_id === mentorId);
        if (!conn) return;
        setDisconnecting(mentorId);
        try {
            await apiFetch(`/connections/${conn.id}`, { method: 'DELETE' });
            const updatedConnections = await apiFetch('/connections');
            setConnections(updatedConnections);
        } catch (err) {
            setError(err.message);
        } finally {
            setDisconnecting(null);
        }
    }

    function getConnectionStatus(mentorId) {
        const conn = connections.find(c => c.mentor_id === mentorId);
        return conn?.status || null;
    }

    // Derived: unique expertise areas and companies for filters
    const allExpertise = [...new Set(
        matches.flatMap(m => (m.expertise || '').split(',').map(s => s.trim()).filter(Boolean))
    )].sort();

    const allCompanies = [...new Set(
        matches.map(m => m.company).filter(Boolean)
    )].sort();

    // Filter and sort logic
    const filteredMatches = matches.filter(m => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            (m.name || '').toLowerCase().includes(q) ||
            (m.title || '').toLowerCase().includes(q) ||
            (m.company || '').toLowerCase().includes(q) ||
            (m.expertise || '').toLowerCase().includes(q) ||
            (m.bio || '').toLowerCase().includes(q);

        const matchesExpertise = !filterExpertise ||
            (m.expertise || '').toLowerCase().includes(filterExpertise.toLowerCase());

        const matchesCompany = !filterCompany ||
            (m.company || '').toLowerCase() === filterCompany.toLowerCase();

        const matchesExp = !filterMinExp ||
            (m.years_exp || 0) >= parseInt(filterMinExp);

        return matchesSearch && matchesExpertise && matchesCompany && matchesExp;
    }).sort((a, b) => {
        if (sortBy === 'compatibility') return (b.compatibility || 0) - (a.compatibility || 0);
        if (sortBy === 'experience') return (b.years_exp || 0) - (a.years_exp || 0);
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        return 0;
    });

    const hasActiveFilters = searchQuery || filterExpertise || filterCompany || filterMinExp;

    function clearFilters() {
        setSearchQuery('');
        setFilterExpertise('');
        setFilterCompany('');
        setFilterMinExp('');
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Finding your ideal mentors with AI...</p>
                </div>
            </div>
        );
    }

    const pendingCount = connections.filter(c => c.status === 'PENDING').length;
    const acceptedCount = connections.filter(c => c.status === 'ACCEPTED').length;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Welcome, {user?.name || user?.profile?.name || 'Student'}! 👋</h1>
                <p>Here are your AI-recommended mentors based on your skills and goals.</p>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            {/* Connected Mentors */}
            {connections.filter(c => c.status === 'ACCEPTED').length > 0 && (
                <div className="connected-mentors-section">
                    <div className="section-header">
                        <h2>🤝 Your Mentors</h2>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            {connections.filter(c => c.status === 'ACCEPTED').length} connected
                        </span>
                    </div>
                    <div className="connected-mentors-row">
                        {connections.filter(c => c.status === 'ACCEPTED').map(conn => (
                            <div key={conn.id} className="glass-card connected-mentor-card">
                                <div className="cm-avatar">
                                    {(conn.mentor_name || '?')[0].toUpperCase()}
                                    <span className="cm-online-dot"></span>
                                </div>
                                <div className="cm-info">
                                    <span className="cm-name">{conn.mentor_name}</span>
                                    <span className="cm-title">{conn.mentor_title}{conn.mentor_company ? ` · ${conn.mentor_company}` : ''}</span>
                                    {mentorRatings[conn.mentor_id] && (
                                        <StarDisplay
                                            avg={mentorRatings[conn.mentor_id].avgRating}
                                            count={mentorRatings[conn.mentor_id].totalReviews}
                                            size={13}
                                        />
                                    )}
                                    {conn.mentor_expertise && (
                                        <div className="cm-tags">
                                            {conn.mentor_expertise.split(',').slice(0, 3).map(tag => (
                                                <span key={tag.trim()} className="cm-tag">{tag.trim()}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <a href="/messages" className="cm-msg-btn" title="Message">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Collapsible Search & Filter */}
            <div className="glass-card search-filter-bar">
                <button
                    className="btn btn-secondary filter-toggle-btn"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                    <span>🔍 Search & Filter {hasActiveFilters ? `(${[searchQuery && 'search', filterExpertise && 'expertise', filterCompany && 'company', filterMinExp && 'experience'].filter(Boolean).length} active)` : ''}</span>
                    <span style={{ transition: 'transform 0.3s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>

                {filtersOpen && (
                    <div style={{ marginTop: '1rem' }}>
                        <div className="search-input-wrap">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="form-input search-input"
                                placeholder="Search mentors by name, title, skills..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-row">
                            <select className="form-select filter-select" value={filterExpertise} onChange={e => setFilterExpertise(e.target.value)}>
                                <option value="">All Expertise</option>
                                {allExpertise.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <select className="form-select filter-select" value={filterCompany} onChange={e => setFilterCompany(e.target.value)}>
                                <option value="">All Companies</option>
                                {allCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="form-select filter-select" value={filterMinExp} onChange={e => setFilterMinExp(e.target.value)}>
                                <option value="">Any Experience</option>
                                <option value="3">3+ years</option>
                                <option value="5">5+ years</option>
                                <option value="8">8+ years</option>
                                <option value="10">10+ years</option>
                            </select>
                            <select className="form-select filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="compatibility">Sort: Best Match</option>
                                <option value="experience">Sort: Experience</option>
                                <option value="name">Sort: Name A-Z</option>
                            </select>
                            {hasActiveFilters && (
                                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>✕ Clear</button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="section-header">
                <h2>✨ Recommended for You</h2>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    {filteredMatches.length} of {matches.length} mentors
                </span>
            </div>

            {filteredMatches.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">{hasActiveFilters ? '🔍' : '📝'}</div>
                    <h3>{hasActiveFilters ? 'No mentors match your filters' : 'No mentors found'}</h3>
                    <p>{hasActiveFilters ? 'Try broadening your search or clearing filters.' : 'Please complete your profile to get AI-powered mentor recommendations.'}</p>
                    {hasActiveFilters && <button className="btn btn-primary btn-sm" onClick={clearFilters}>Clear All Filters</button>}
                </div>
            ) : (
                <div className="cards-grid">
                    {filteredMatches.map(mentor => (
                        <MentorCard
                            key={mentor.mentor_id}
                            mentor={mentor}
                            connectionStatus={getConnectionStatus(mentor.mentor_id)}
                            onRequestMentorship={handleRequestMentorship}
                            onDisconnect={handleDisconnect}
                            disconnecting={disconnecting === mentor.mentor_id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
