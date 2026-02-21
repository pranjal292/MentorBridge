import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { id: 'articles', label: '📰 Articles', icon: '📰' },
    { id: 'courses', label: '🎓 Courses', icon: '🎓' },
    { id: 'jobs', label: '💼 Job Market', icon: '💼' },
    { id: 'digest', label: '📋 Digest', icon: '📋' },
];

const LEVEL_COLORS = { Beginner: '#10b981', Intermediate: '#f59e0b', Advanced: '#ef4444' };

export default function ContentDashboard() {
    const { apiFetch } = useAuth();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('articles');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => { loadContent(); }, []);

    async function loadContent() {
        setLoading(true);
        setError('');
        try {
            const data = await apiFetch('/ai/industry-content', { method: 'POST' });
            setContent(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleCopy() {
        if (content?.weeklyDigest) {
            navigator.clipboard.writeText(content.weeklyDigest);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    if (loading) return (
        <div className="page">
            <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Curating industry content for you...</p>
            </div>
        </div>
    );

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <div className="cd-header-row">
                    <div>
                        <h1>Industry Content 🗞️</h1>
                        <p>Curated articles, courses &amp; job insights personalized to your profile</p>
                    </div>
                    <button className="btn btn-secondary" onClick={loadContent} disabled={loading}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            {/* Tabs */}
            <div className="cd-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`cd-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="cd-tab-icon">{tab.icon}</span>
                        <span>{tab.label.split(' ').slice(1).join(' ')}</span>
                    </button>
                ))}
            </div>

            {/* ═══ ARTICLES ═══ */}
            {activeTab === 'articles' && content?.articles && (
                <div className="cd-content">
                    <div className="cd-articles-list">
                        {content.articles.map((article, i) => (
                            <div key={i} className="cd-article glass-card" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="cd-article-top">
                                    <div className="cd-article-badges">
                                        <span className="cd-source-badge">{article.source}</span>
                                        <span className="cd-tag">{article.tag}</span>
                                    </div>
                                    <div className="cd-article-time">
                                        <span className="cd-time-chip">⏱ {article.readTime}</span>
                                        <span className="cd-ago">{article.publishedAgo}</span>
                                    </div>
                                </div>
                                <h3 className="cd-article-title">{article.title}</h3>
                                <p className="cd-article-summary">{article.summary}</p>
                                <a
                                    href={article.url || `https://news.google.com/search?q=${encodeURIComponent(article.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cd-read-more"
                                >
                                    Read article →
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ COURSES ═══ */}
            {activeTab === 'courses' && content?.courses && (
                <div className="cd-content">
                    <div className="cd-courses-grid">
                        {content.courses.map((course, i) => (
                            <div key={i} className="cd-course glass-card" style={{ animationDelay: `${i * 80}ms` }}>
                                <div className="cd-course-header">
                                    <span className="cd-platform-badge">{course.platform}</span>
                                    <span className="cd-level-badge" style={{ color: LEVEL_COLORS[course.level] || '#6366f1', borderColor: LEVEL_COLORS[course.level] || '#6366f1' }}>
                                        {course.level}
                                    </span>
                                </div>
                                <h3 className="cd-course-title">{course.title}</h3>
                                <div className="cd-course-meta">
                                    <div className="cd-course-stats">
                                        <span className="cd-course-stat">⏱ {course.duration}</span>
                                        <span className="cd-course-stat">⭐ {course.rating}</span>
                                    </div>
                                    <span className="cd-tag">{course.tag}</span>
                                </div>
                                <a
                                    href={course.url || `https://www.google.com/search?q=${encodeURIComponent(course.title + ' ' + course.platform)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm cd-enroll-btn"
                                >
                                    Enroll Free →
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ JOB MARKET ═══ */}
            {activeTab === 'jobs' && content?.jobInsights && (
                <div className="cd-content">
                    <div className="cd-jobs-grid">
                        {content.jobInsights.map((job, i) => (
                            <div key={i} className="cd-job glass-card" style={{ animationDelay: `${i * 80}ms` }}>
                                <div className="cd-job-header">
                                    <div className="cd-job-icon">
                                        {job.role.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="cd-job-title">{job.role}</h3>
                                        <span className="cd-job-growth">{job.growth}</span>
                                    </div>
                                </div>
                                <div className="cd-job-stats">
                                    <div className="cd-job-stat">
                                        <span className="cd-job-stat-label">Avg Salary</span>
                                        <span className="cd-job-stat-value">{job.avgSalary}</span>
                                    </div>
                                    <div className="cd-job-stat">
                                        <span className="cd-job-stat-label">Open Roles</span>
                                        <span className="cd-job-stat-value">{job.openings}</span>
                                    </div>
                                </div>
                                <div className="expertise-tags">
                                    {job.skills.map(skill => (
                                        <span key={skill} className="tag">{skill}</span>
                                    ))}
                                </div>
                                <a
                                    href={job.url || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(job.role)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cd-read-more"
                                    style={{ marginTop: '0.25rem' }}
                                >
                                    View Jobs →
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ DIGEST ═══ */}
            {activeTab === 'digest' && content?.weeklyDigest && (
                <div className="cd-content">
                    <div className="cd-digest glass-card">
                        <div className="cd-digest-header">
                            <div>
                                <h2>📋 Weekly Industry Digest</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>AI-curated highlights for your field</p>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                                {copied ? '✅ Copied!' : '📋 Copy'}
                            </button>
                        </div>
                        <div className="cd-digest-body">
                            {content.weeklyDigest.split('\n').filter(p => p.trim()).map((para, i) => (
                                <p key={i} className="cd-digest-para">{para}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
