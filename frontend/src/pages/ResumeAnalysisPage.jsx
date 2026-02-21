import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SECTION_ICONS = {
    contact: '📇',
    summary: '📝',
    experience: '💼',
    skills: '🛠️',
    education: '🎓',
    formatting: '📐'
};

const SECTION_LABELS = {
    contact: 'Contact Info',
    summary: 'Professional Summary',
    experience: 'Work Experience',
    skills: 'Skills Section',
    education: 'Education',
    formatting: 'Formatting & Structure'
};

export default function ResumeAnalysisPage() {
    const { apiFetch } = useAuth();
    const [resumeText, setResumeText] = useState('');
    const [targetRole, setTargetRole] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    async function handleAnalyze(e) {
        e.preventDefault();
        if (resumeText.trim().length < 50) {
            setError('Please paste at least 50 characters of resume content');
            return;
        }
        setLoading(true);
        setError('');
        setAnalysis(null);
        try {
            const data = await apiFetch('/ai/resume-analyze', {
                method: 'POST',
                body: JSON.stringify({ resumeText, targetRole })
            });
            setAnalysis(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function getScoreColor(score) {
        if (score >= 80) return 'var(--accent-success)';
        if (score >= 60) return 'var(--accent-warning)';
        if (score >= 40) return '#f97316';
        return 'var(--accent-danger)';
    }

    function getScoreLabel(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Needs Work';
        return 'Weak';
    }

    function getPriorityColor(priority) {
        if (priority === 'high') return 'var(--accent-danger)';
        if (priority === 'medium') return 'var(--accent-warning)';
        return 'var(--accent-success)';
    }

    function handleCopySummary() {
        navigator.clipboard.writeText(analysis.improvedSummary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>AI Resume Analyzer 📄</h1>
                <p>Get instant, AI-powered feedback to make your resume stand out</p>
            </div>

            {/* Input Section */}
            {!analysis && (
                <div className="resume-input-section">
                    <form onSubmit={handleAnalyze}>
                        <div className="glass-card resume-upload-card">
                            <div className="resume-upload-header">
                                <span className="resume-upload-icon">📋</span>
                                <div>
                                    <h3>Paste Your Resume</h3>
                                    <p>Copy the text from your resume and paste it below</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="target-role">Target Role (optional)</label>
                                <input
                                    id="target-role"
                                    className="form-input"
                                    placeholder="e.g., Frontend Developer, ML Engineer, DevOps..."
                                    value={targetRole}
                                    onChange={e => setTargetRole(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="resume-text">Resume Content</label>
                                <textarea
                                    id="resume-text"
                                    className="form-textarea resume-textarea"
                                    placeholder="Paste your entire resume text here...&#10;&#10;Include all sections: Contact Info, Summary, Experience, Skills, Education, Projects, etc."
                                    value={resumeText}
                                    onChange={e => setResumeText(e.target.value)}
                                    rows={14}
                                />
                                <div className="resume-char-count">
                                    {resumeText.length} characters · {resumeText.split(/\s+/).filter(Boolean).length} words
                                </div>
                            </div>

                            {error && <div className="alert alert-error">⚠️ {error}</div>}

                            <button
                                type="submit"
                                className="btn btn-primary btn-full btn-lg"
                                disabled={loading || resumeText.trim().length < 50}
                            >
                                {loading ? (
                                    <span className="resume-loading">
                                        <span className="spinner" style={{ width: 18, height: 18 }}></span>
                                        Analyzing your resume...
                                    </span>
                                ) : '🔍 Analyze My Resume'}
                            </button>
                        </div>
                    </form>

                    {/* Tips */}
                    <div className="resume-tips glass-card">
                        <h3>💡 Tips for Best Results</h3>
                        <ul>
                            <li>Paste the <strong>full text</strong> of your resume, not just parts</li>
                            <li>Include all sections: Contact, Summary, Experience, Skills, Education</li>
                            <li>Specify a <strong>target role</strong> for role-specific feedback</li>
                            <li>The more content you provide, the more detailed the analysis</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {analysis && (
                <div className="resume-results">
                    {/* Back Button */}
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setAnalysis(null)}
                        style={{ marginBottom: '1.5rem' }}
                    >
                        ← Analyze Another Resume
                    </button>

                    {/* Overall Score Card */}
                    <div className="resume-score-card glass-card">
                        <div className="resume-score-ring">
                            <svg viewBox="0 0 120 120" className="readiness-svg">
                                <circle cx="60" cy="60" r="52" className="readiness-track" />
                                <circle
                                    cx="60" cy="60" r="52"
                                    className="readiness-fill"
                                    style={{
                                        stroke: getScoreColor(analysis.overallScore),
                                        strokeDasharray: `${(analysis.overallScore / 100) * 327} 327`
                                    }}
                                />
                            </svg>
                            <div className="readiness-value">
                                <span className="readiness-number" style={{ color: getScoreColor(analysis.overallScore), background: 'none', WebkitTextFillColor: 'unset' }}>
                                    {analysis.overallScore}
                                </span>
                                <span className="readiness-label">{getScoreLabel(analysis.overallScore)}</span>
                            </div>
                        </div>
                        <div className="resume-score-info">
                            <h2>Resume Score</h2>
                            <p>{analysis.summary}</p>
                            <div className="resume-ats-badge">
                                <span className="ats-label">ATS Compatibility</span>
                                <span className="ats-score" style={{ color: getScoreColor(analysis.atsScore) }}>
                                    {analysis.atsScore}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="resume-sw-grid">
                        <div className="glass-card resume-sw-card strengths">
                            <h3>💪 Strengths</h3>
                            <ul>
                                {analysis.strengths?.map((s, i) => (
                                    <li key={i}><span className="sw-bullet">✅</span>{s}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="glass-card resume-sw-card weaknesses">
                            <h3>⚡ Areas to Improve</h3>
                            <ul>
                                {analysis.weaknesses?.map((w, i) => (
                                    <li key={i}><span className="sw-bullet">🔸</span>{w}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Section Breakdown */}
                    <div className="section-header" style={{ marginTop: '2rem' }}>
                        <h2>📊 Section Breakdown</h2>
                    </div>
                    <div className="resume-sections-grid">
                        {analysis.sections && Object.entries(analysis.sections).map(([key, section]) => (
                            <div key={key} className="glass-card resume-section-card">
                                <div className="resume-section-header">
                                    <span className="resume-section-icon">{SECTION_ICONS[key] || '📄'}</span>
                                    <div className="resume-section-title">
                                        <h4>{SECTION_LABELS[key] || key}</h4>
                                        <span className="resume-section-score" style={{ color: getScoreColor(section.score) }}>
                                            {section.score}/100
                                        </span>
                                    </div>
                                </div>
                                <div className="heatmap-bar-wrap">
                                    <div
                                        className="heatmap-bar"
                                        style={{
                                            width: `${section.score}%`,
                                            background: `linear-gradient(90deg, ${getScoreColor(section.score)}88, ${getScoreColor(section.score)})`
                                        }}
                                    ></div>
                                </div>
                                <p className="resume-section-feedback">{section.feedback}</p>
                            </div>
                        ))}
                    </div>

                    {/* Action Items */}
                    <div className="section-header" style={{ marginTop: '2rem' }}>
                        <h2>🎯 Action Items</h2>
                    </div>
                    <div className="resume-actions-list">
                        {analysis.actionItems?.map((item, i) => (
                            <div key={i} className="glass-card resume-action-item" style={{ animationDelay: `${i * 80}ms` }}>
                                <span
                                    className="priority-badge"
                                    style={{ color: getPriorityColor(item.priority), borderColor: getPriorityColor(item.priority) }}
                                >
                                    {item.priority.toUpperCase()}
                                </span>
                                <p>{item.action}</p>
                            </div>
                        ))}
                    </div>

                    {/* Keywords & ATS */}
                    <div className="resume-bottom-grid">
                        <div className="glass-card">
                            <h3>🔑 Suggested Keywords</h3>
                            <p className="resume-help-text">Add these keywords to improve ATS compatibility</p>
                            <div className="resume-keywords">
                                {analysis.keywordSuggestions?.map(kw => (
                                    <span key={kw} className="tag">{kw}</span>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card">
                            <h3>🤖 ATS Optimization Tips</h3>
                            <p className="resume-help-text">Make your resume ATS-friendly</p>
                            <ul className="resume-ats-tips">
                                {analysis.atsTips?.map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Improved Summary */}
                    {analysis.improvedSummary && (
                        <div className="glass-card resume-improved" style={{ marginTop: '1.5rem' }}>
                            <div className="resume-improved-header">
                                <h3>✨ AI-Generated Professional Summary</h3>
                                <button className="btn btn-secondary btn-sm" onClick={handleCopySummary}>
                                    {copied ? '✅ Copied!' : '📋 Copy'}
                                </button>
                            </div>
                            <blockquote className="resume-improved-text">
                                {analysis.improvedSummary}
                            </blockquote>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
