import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MyProfilePage() {
    const { user, apiFetch, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Common fields
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [certificates, setCertificates] = useState('');
    const [qualifications, setQualifications] = useState('');
    const [experience, setExperience] = useState('');

    // Student fields
    const [skills, setSkills] = useState('');
    const [interests, setInterests] = useState('');
    const [goals, setGoals] = useState('');

    // Mentor fields
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [expertise, setExpertise] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [yearsExp, setYearsExp] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const data = await apiFetch('/profile');
            setName(data.name || '');
            setBio(data.profile?.bio || '');
            setCertificates(data.profile?.certificates || '');
            setQualifications(data.profile?.qualifications || '');
            setExperience(data.profile?.experience || '');

            if (data.role === 'STUDENT') {
                setSkills(data.profile?.skills || '');
                setInterests(data.profile?.interests || '');
                setGoals(data.profile?.goals || '');
            } else {
                setTitle(data.profile?.title || '');
                setCompany(data.profile?.company || '');
                setExpertise(data.profile?.expertise || '');
                setMeetingLink(data.profile?.meeting_link || '');
                setYearsExp(data.profile?.years_exp || '');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const body = { name, bio, certificates, qualifications, experience };

            if (user.role === 'STUDENT') {
                Object.assign(body, { skills, interests, goals });
            } else {
                Object.assign(body, { title, company, expertise, meeting_link: meetingLink, years_exp: parseInt(yearsExp) || 0 });
            }

            await apiFetch('/profile', {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            updateUser({ name, profileComplete: true });
            setSuccess('Profile saved successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="page">
                <div className="loading-spinner"><div className="spinner"></div><p>Loading profile...</p></div>
            </div>
        );
    }

    const initial = (name || user?.email || '?')[0].toUpperCase();

    return (
        <div className="page">
            <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
                ← Back
            </button>

            <div className="my-profile-page">
                <div className="glass-card profile-hero" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div className="profile-avatar-lg" style={{ fontSize: '2.5rem', width: '80px', height: '80px', lineHeight: '80px', margin: '0 auto 1rem' }}>{initial}</div>
                    <h1>{name}</h1>
                    <p className="profile-role-badge">{user?.role === 'STUDENT' ? '🎓 Student' : '💼 Mentor'}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{user?.email}</p>
                </div>

                {error && <div className="alert alert-error">⚠️ {error}</div>}
                {success && <div className="alert alert-success">✅ {success}</div>}

                <form onSubmit={handleSave}>
                    {/* Basic Info */}
                    <div className="glass-card profile-section" style={{ marginBottom: '1.5rem' }}>
                        <h3>👤 Basic Information</h3>
                        <div className="form-group">
                            <label htmlFor="profile-name">Full Name</label>
                            <input id="profile-name" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="profile-bio">Bio</label>
                            <textarea id="profile-bio" className="form-textarea" placeholder="Tell others about yourself..." value={bio} onChange={e => setBio(e.target.value)} rows={3} />
                        </div>
                    </div>

                    {/* Role-specific Fields */}
                    <div className="glass-card profile-section" style={{ marginBottom: '1.5rem' }}>
                        {user?.role === 'STUDENT' ? (
                            <>
                                <h3>🎓 Student Details</h3>
                                <div className="form-group">
                                    <label htmlFor="profile-skills">Skills (comma-separated)</label>
                                    <input id="profile-skills" className="form-input" placeholder="e.g., Python, C++, Data Structures" value={skills} onChange={e => setSkills(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-interests">Interests</label>
                                    <input id="profile-interests" className="form-input" placeholder="e.g., Cybersecurity, ML, Web Dev" value={interests} onChange={e => setInterests(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-goals">Career Goals</label>
                                    <input id="profile-goals" className="form-input" placeholder="e.g., Become a Pen Tester" value={goals} onChange={e => setGoals(e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <h3>💼 Professional Details</h3>
                                <div className="form-group">
                                    <label htmlFor="profile-title">Job Title</label>
                                    <input id="profile-title" className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-company">Company</label>
                                    <input id="profile-company" className="form-input" value={company} onChange={e => setCompany(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-expertise">Expertise (comma-separated)</label>
                                    <input id="profile-expertise" className="form-input" value={expertise} onChange={e => setExpertise(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-years">Years of Experience</label>
                                    <input id="profile-years" type="number" className="form-input" value={yearsExp} onChange={e => setYearsExp(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="profile-meeting">Meeting Link</label>
                                    <input id="profile-meeting" className="form-input" placeholder="https://meet.google.com/..." value={meetingLink} onChange={e => setMeetingLink(e.target.value)} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Credentials Section */}
                    <div className="glass-card profile-section" style={{ marginBottom: '1.5rem' }}>
                        <h3>📜 Credentials & Experience</h3>
                        <div className="form-group">
                            <label htmlFor="profile-qualifications">Qualifications</label>
                            <textarea id="profile-qualifications" className="form-textarea" placeholder="e.g., B.Tech in Computer Science from IIT Delhi, M.S. in Cybersecurity from Stanford..." value={qualifications} onChange={e => setQualifications(e.target.value)} rows={3} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="profile-certificates">Certificates</label>
                            <textarea id="profile-certificates" className="form-textarea" placeholder="e.g., AWS Certified Solutions Architect, Google Cloud Professional, OSCP..." value={certificates} onChange={e => setCertificates(e.target.value)} rows={3} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="profile-experience">Experience</label>
                            <textarea id="profile-experience" className="form-textarea" placeholder="e.g., 2 years at TCS as Junior Developer, 3 years at Google as Senior SWE..." value={experience} onChange={e => setExperience(e.target.value)} rows={4} />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Profile'}
                    </button>
                </form>

                <button className="btn-logout-profile" onClick={() => { logout(); navigate('/login'); }}>
                    🚪 Logout
                </button>
            </div>
        </div>
    );
}
