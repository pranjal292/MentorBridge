import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        if (!role) {
            setError('Please select a role');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await signup(email, password, name, role);
            navigate('/setup');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="logo">🌉 MentorBridge</div>
                        <p>Create your account and start your journey.</p>
                    </div>

                    {error && <div className="alert alert-error">⚠️ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>I am a...</label>
                            <div className="role-selector">
                                <button
                                    type="button"
                                    className={`role-option ${role === 'STUDENT' ? 'selected' : ''}`}
                                    onClick={() => setRole('STUDENT')}
                                >
                                    <span className="role-icon">🎓</span>
                                    <span className="role-name">Student</span>
                                </button>
                                <button
                                    type="button"
                                    className={`role-option ${role === 'MENTOR' ? 'selected' : ''}`}
                                    onClick={() => setRole('MENTOR')}
                                >
                                    <span className="role-icon">💼</span>
                                    <span className="role-name">Mentor</span>
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                className="form-input"
                                placeholder="John Doe"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="signup-email">Email</label>
                            <input
                                id="signup-email"
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="signup-password">Password</label>
                            <input
                                id="signup-password"
                                type="password"
                                className="form-input"
                                placeholder="Min 6 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
