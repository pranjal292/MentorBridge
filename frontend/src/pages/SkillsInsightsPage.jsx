import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ResumeAnalysisPage from './ResumeAnalysisPage';
import RoadmapPage from './RoadmapPage';

export default function SkillsInsightsPage() {
    const { apiFetch, user } = useAuth();
    const [heatmapData, setHeatmapData] = useState(null);
    const [skillgapData, setSkillgapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('heatmap');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const promises = [apiFetch('/ai/heatmap')];
            if (user.role === 'STUDENT') {
                promises.push(apiFetch('/ai/skillgap'));
            }
            const results = await Promise.all(promises);
            setHeatmapData(results[0]);
            if (results[1]) setSkillgapData(results[1]);
            if (results[0]?.categories?.length > 0) {
                setSelectedCategory(results[0].categories[0].name);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function getDemandColor(demand) {
        if (demand >= 90) return '#ef4444';
        if (demand >= 80) return '#f97316';
        if (demand >= 70) return '#eab308';
        if (demand >= 60) return '#22c55e';
        return '#6366f1';
    }

    function getDemandLabel(demand) {
        if (demand >= 90) return '🔥 Very High';
        if (demand >= 80) return '🔶 High';
        if (demand >= 70) return '🟡 Moderate';
        if (demand >= 60) return '🟢 Growing';
        return '🔵 Stable';
    }

    function getPriorityColor(priority) {
        if (priority === 'high') return 'var(--accent-danger)';
        if (priority === 'medium') return 'var(--accent-warning)';
        return 'var(--accent-success)';
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Analyzing industry trends & your skills...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>Skills & Industry Insights 📊</h1>
                <p>Real-time industry demand and personalized skill gap analysis</p>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            {/* Tab Switcher */}
            <div className="insights-tabs">
                <button
                    className={`insights-tab ${activeTab === 'heatmap' ? 'active' : ''}`}
                    onClick={() => setActiveTab('heatmap')}
                >
                    🌡️ Industry Heatmap
                </button>
                {user.role === 'STUDENT' && (
                    <button
                        className={`insights-tab ${activeTab === 'skillgap' ? 'active' : ''}`}
                        onClick={() => setActiveTab('skillgap')}
                    >
                        📈 Skill Gap Analysis
                    </button>
                )}
                {user?.role === 'STUDENT' && (
                    <button
                        className={`insights-tab ${activeTab === 'resume' ? 'active' : ''}`}
                        onClick={() => setActiveTab('resume')}
                    >
                        📄 Resume Analysis
                    </button>
                )}
                <button
                    className={`insights-tab ${activeTab === 'roadmap' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roadmap')}
                >
                    🗺️ Roadmap
                </button>
            </div>

            {/* ═══ INDUSTRY HEATMAP TAB ═══ */}
            {activeTab === 'heatmap' && heatmapData && (
                <div className="insights-content">
                    {/* Top Trends Bar */}
                    <div className="trends-bar">
                        <div className="trends-section">
                            <span className="trends-label">🔥 Trending</span>
                            <div className="trends-pills">
                                {heatmapData.topTrending?.map(skill => (
                                    <span key={skill} className="trend-pill trending">{skill}</span>
                                ))}
                            </div>
                        </div>
                        <div className="trends-section">
                            <span className="trends-label">🚀 Emerging</span>
                            <div className="trends-pills">
                                {heatmapData.emergingSkills?.map(skill => (
                                    <span key={skill} className="trend-pill emerging">{skill}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Category Selector */}
                    <div className="heatmap-categories">
                        {heatmapData.categories.map(cat => (
                            <button
                                key={cat.name}
                                className={`heatmap-cat-btn ${selectedCategory === cat.name ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.name)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Heatmap Grid */}
                    {heatmapData.categories
                        .filter(cat => cat.name === selectedCategory)
                        .map(cat => (
                            <div key={cat.name} className="heatmap-grid">
                                {cat.skills.map(skill => (
                                    <div key={skill.name} className="heatmap-cell glass-card">
                                        <div className="heatmap-cell-header">
                                            <h3>{skill.name}</h3>
                                            <span className="demand-badge" style={{ color: getDemandColor(skill.demand) }}>
                                                {getDemandLabel(skill.demand)}
                                            </span>
                                        </div>
                                        <div className="heatmap-bar-wrap">
                                            <div
                                                className="heatmap-bar"
                                                style={{
                                                    width: `${skill.demand}%`,
                                                    background: `linear-gradient(90deg, ${getDemandColor(skill.demand)}88, ${getDemandColor(skill.demand)})`
                                                }}
                                            ></div>
                                            <span className="heatmap-bar-label">{skill.demand}/100</span>
                                        </div>
                                        <div className="heatmap-meta">
                                            <span className="heatmap-stat">
                                                <span className="stat-icon">📈</span> {skill.growth}
                                            </span>
                                            <span className="heatmap-stat">
                                                <span className="stat-icon">💰</span> {skill.avgSalary}
                                            </span>
                                            <span className="heatmap-stat">
                                                <span className="stat-icon">💼</span> {skill.openings}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                    {/* Full Overview Heatmap */}
                    <div className="section-header" style={{ marginTop: '2rem' }}>
                        <h2>Full Demand Overview</h2>
                    </div>
                    <div className="heatmap-overview glass-card">
                        {heatmapData.categories.map(cat => (
                            <div key={cat.name} className="heatmap-overview-row">
                                <span className="heatmap-overview-label">{cat.name}</span>
                                <div className="heatmap-overview-cells">
                                    {cat.skills.map(skill => (
                                        <div
                                            key={skill.name}
                                            className="heatmap-dot"
                                            style={{ backgroundColor: getDemandColor(skill.demand), opacity: 0.2 + (skill.demand / 125) }}
                                            title={`${skill.name}: ${skill.demand}/100`}
                                        >
                                            <span className="heatmap-dot-label">{skill.name}</span>
                                            <span className="heatmap-dot-value">{skill.demand}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ SKILL GAP TAB ═══ */}
            {activeTab === 'skillgap' && skillgapData && (
                <div className="insights-content">
                    {/* Readiness Score */}
                    <div className="readiness-card glass-card">
                        <div className="readiness-ring">
                            <svg viewBox="0 0 120 120" className="readiness-svg">
                                <circle cx="60" cy="60" r="52" className="readiness-track" />
                                <circle
                                    cx="60" cy="60" r="52"
                                    className="readiness-fill"
                                    style={{
                                        strokeDasharray: `${(skillgapData.overallReadiness / 100) * 327} 327`
                                    }}
                                />
                            </svg>
                            <div className="readiness-value">
                                <span className="readiness-number">{skillgapData.overallReadiness}</span>
                                <span className="readiness-label">Readiness</span>
                            </div>
                        </div>
                        <div className="readiness-info">
                            <h3>Career Readiness Score</h3>
                            <p>Based on your current skills vs. industry demand</p>
                            <div className="strong-areas">
                                <span className="strong-label">💪 Strong Areas:</span>
                                {skillgapData.strongAreas?.map(area => (
                                    <span key={area} className="tag success">{area}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Current Skills */}
                    <div className="section-header">
                        <h2>✅ Your Current Skills</h2>
                    </div>
                    <div className="skillgap-grid">
                        {skillgapData.currentSkills.map(skill => (
                            <div key={skill.name} className="skill-card glass-card">
                                <div className="skill-card-header">
                                    <h4>{skill.name}</h4>
                                </div>
                                <div className="skill-bars">
                                    <div className="skill-bar-row">
                                        <span className="skill-bar-label">Your Level</span>
                                        <div className="skill-bar-track">
                                            <div className="skill-bar-fill level" style={{ width: `${skill.level}%` }}></div>
                                        </div>
                                        <span className="skill-bar-value">{skill.level}%</span>
                                    </div>
                                    <div className="skill-bar-row">
                                        <span className="skill-bar-label">Demand</span>
                                        <div className="skill-bar-track">
                                            <div className="skill-bar-fill demand" style={{ width: `${skill.marketDemand}%` }}></div>
                                        </div>
                                        <span className="skill-bar-value">{skill.marketDemand}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Missing Skills */}
                    <div className="section-header" style={{ marginTop: '2rem' }}>
                        <h2>🎯 Skills to Learn</h2>
                    </div>
                    <div className="missing-skills-list">
                        {skillgapData.missingSkills.map((skill, i) => (
                            <div key={skill.name} className="missing-skill glass-card" style={{ animationDelay: `${i * 80}ms` }}>
                                <div className="missing-skill-header">
                                    <div className="missing-skill-rank">#{i + 1}</div>
                                    <div className="missing-skill-info">
                                        <h4>{skill.name}</h4>
                                        <p>{skill.reason}</p>
                                    </div>
                                    <span
                                        className="priority-badge"
                                        style={{ color: getPriorityColor(skill.priority), borderColor: getPriorityColor(skill.priority) }}
                                    >
                                        {skill.priority.toUpperCase()}
                                    </span>
                                </div>
                                <div className="missing-skill-stats">
                                    <div className="missing-stat">
                                        <span className="missing-stat-label">Market Demand</span>
                                        <div className="missing-stat-bar-track">
                                            <div
                                                className="missing-stat-bar-fill"
                                                style={{ width: `${skill.marketDemand}%`, background: `linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))` }}
                                            ></div>
                                        </div>
                                        <span className="missing-stat-value">{skill.marketDemand}%</span>
                                    </div>
                                    <span className="time-badge">⏱️ {skill.timeToLearn}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recommendations */}
                    <div className="section-header" style={{ marginTop: '2rem' }}>
                        <h2>💡 Recommendations</h2>
                    </div>
                    <div className="recommendations-list">
                        {skillgapData.recommendations?.map((rec, i) => (
                            <div key={i} className="recommendation glass-card">
                                <span className="rec-number">{i + 1}</span>
                                <p>{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ RESUME ANALYSIS TAB ═══ */}
            {activeTab === 'resume' && <ResumeAnalysisPage />}

            {/* ═══ ROADMAP TAB ═══ */}
            {activeTab === 'roadmap' && <RoadmapPage />}
        </div>
    );
}
