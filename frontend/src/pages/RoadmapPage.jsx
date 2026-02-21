import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RoadmapPage() {
    const { apiFetch } = useAuth();
    const [role, setRole] = useState('');
    const [duration, setDuration] = useState('');
    const [roadmap, setRoadmap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const suggestions = [
        'Penetration Tester', 'Frontend Developer', 'ML Engineer', 'Backend Developer',
        'DevOps Engineer', 'Mobile Developer', 'Data Engineer', 'Firmware Engineer',
        'Cloud Architect', 'Full Stack Developer', 'Cybersecurity Analyst'
    ];

    async function handleGenerate(e) {
        e?.preventDefault();
        if (!role.trim()) return;
        setLoading(true);
        setError('');
        setRoadmap(null);
        try {
            const body = { role: role.trim() };
            if (duration) body.duration = duration;
            const data = await apiFetch('/ai/roadmap', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            setRoadmap(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>Career Roadmap Generator 🗺️</h1>
                <p>Get an AI-powered, step-by-step roadmap for any tech career path.</p>
            </div>

            <div className="roadmap-container">
                <form onSubmit={handleGenerate} className="roadmap-role-input">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Enter a career role (e.g., Cybersecurity Analyst)"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                    />
                    <select
                        className="form-select"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        style={{ maxWidth: '160px' }}
                    >
                        <option value="">Duration</option>
                        <option value="3">3 Months</option>
                        <option value="6">6 Months</option>
                        <option value="9">9 Months</option>
                        <option value="12">12 Months</option>
                        <option value="18">18 Months</option>
                        <option value="24">24 Months</option>
                    </select>
                    <button type="submit" className="btn btn-primary" disabled={loading || !role.trim()}>
                        {loading ? '⏳ Generating...' : '🚀 Generate'}
                    </button>
                </form>

                {!roadmap && !loading && (
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: 'var(--font-size-sm)' }}>
                            Or pick a popular role:
                        </p>
                        <div className="expertise-tags" style={{ justifyContent: 'center' }}>
                            {suggestions.map(s => (
                                <button
                                    key={s}
                                    className="tag"
                                    style={{ cursor: 'pointer', border: '1px solid rgba(99,102,241,0.3)' }}
                                    onClick={() => { setRole(s); }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <div className="alert alert-error">⚠️ {error}</div>}

                {loading && (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>AI is crafting your personalized roadmap...</p>
                    </div>
                )}

                {roadmap && (
                    <>
                        <div className="roadmap-header">
                            <h2>🎯 {roadmap.role}</h2>
                            <div className="duration">Estimated Duration: {roadmap.estimatedDuration}</div>
                        </div>

                        <div className="timeline">
                            {roadmap.phases?.map((phase, i) => (
                                <div key={i} className="timeline-item">
                                    <div className="timeline-dot">{phase.phase || i + 1}</div>
                                    <div className="glass-card timeline-content">
                                        <h3>{phase.title}</h3>
                                        <div className="phase-duration">⏱ {phase.duration}</div>
                                        <p>{phase.description}</p>

                                        <div className="timeline-section">
                                            <h4>🧠 Skills to Learn</h4>
                                            <div className="expertise-tags">
                                                {phase.skills?.map((s, j) => <span key={j} className="tag success">{s}</span>)}
                                            </div>
                                        </div>

                                        <div className="timeline-section">
                                            <h4>🔧 Tools & Technologies</h4>
                                            <div className="expertise-tags">
                                                {phase.tools?.map((t, j) => <span key={j} className="tag">{t}</span>)}
                                            </div>
                                        </div>

                                        <div className="timeline-section">
                                            <h4>💡 Project Ideas</h4>
                                            <ul>
                                                {phase.projects?.map((p, j) => <li key={j}>{p}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
