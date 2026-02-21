import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfileSetupPage() {
    const { user, apiFetch, updateUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Student fields
    const [skills, setSkills] = useState('');
    const [interests, setInterests] = useState('');
    const [goals, setGoals] = useState('');
    const [bio, setBio] = useState('');

    // Mentor fields
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [expertise, setExpertise] = useState('');
    const [mentorBio, setMentorBio] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [yearsExp, setYearsExp] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const body = user.role === 'STUDENT'
                ? { skills, interests, goals, bio }
                : { title, company, expertise, bio: mentorBio, meeting_link: meetingLink, years_exp: parseInt(yearsExp) || 0 };

            await apiFetch('/profile', {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            setSuccess('Profile saved! Redirecting...');
            updateUser({ profileComplete: true });
            setTimeout(() => navigate('/'), 1000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page">
            <div className="setup-container">
                <div className="glass-card setup-card">
                    <div className="setup-header">
                        <h1>Complete Your Profile</h1>
                        <p>{user?.role === 'STUDENT'
                            ? 'Tell us about your skills and goals so we can find the perfect mentors for you.'
                            : 'Share your expertise so students can find and connect with you.'}
                        </p>
                    </div>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}
                    {success && <div className="alert alert-success">✅ {success}</div>}

                    <form onSubmit={handleSubmit}>
                        {user?.role === 'STUDENT' ? (
                            <>
                                <div className="form-group">
                                    <label htmlFor="skills">Skills (comma-separated)</label>
                                    <input
                                        id="skills" className="form-input"
                                        placeholder="e.g., C++, Python, Data Structures, Linux"
                                        value={skills} onChange={e => setSkills(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="interests">Interests</label>
                                    <input
                                        id="interests" className="form-input"
                                        placeholder="e.g., Cybersecurity, Machine Learning, Web Dev"
                                        value={interests} onChange={e => setInterests(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="goals">Career Goals</label>
                                    <input
                                        id="goals" className="form-input"
                                        placeholder="e.g., Become a Penetration Tester at a top firm"
                                        value={goals} onChange={e => setGoals(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="bio">Bio (optional)</label>
                                    <textarea
                                        id="bio" className="form-textarea"
                                        placeholder="Tell mentors a bit about yourself..."
                                        value={bio} onChange={e => setBio(e.target.value)}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label htmlFor="title">Job Title</label>
                                    <input
                                        id="title" className="form-input"
                                        placeholder="e.g., Senior Software Engineer"
                                        value={title} onChange={e => setTitle(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="company">Company</label>
                                    <input
                                        id="company" className="form-input"
                                        placeholder="e.g., Google"
                                        value={company} onChange={e => setCompany(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="expertise">Expertise (comma-separated)</label>
                                    <input
                                        id="expertise" className="form-input"
                                        placeholder="e.g., React, System Design, Microservices"
                                        value={expertise} onChange={e => setExpertise(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="years">Years of Experience</label>
                                    <input
                                        id="years" type="number" className="form-input"
                                        placeholder="e.g., 5"
                                        value={yearsExp} onChange={e => setYearsExp(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="mentor-bio">Bio</label>
                                    <textarea
                                        id="mentor-bio" className="form-textarea"
                                        placeholder="Share your experience and mentoring approach..."
                                        value={mentorBio} onChange={e => setMentorBio(e.target.value)} required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="meeting-link">Meeting Link (optional)</label>
                                    <input
                                        id="meeting-link" className="form-input"
                                        placeholder="e.g., https://meet.google.com/..."
                                        value={meetingLink} onChange={e => setMeetingLink(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Profile & Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
