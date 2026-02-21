import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QUIZ_QUESTIONS = [
    {
        id: 1,
        question: "How do you prefer to spend your time building software?",
        options: [
            "Designing beautiful, interactive user interfaces",
            "Building complex logic and processing data behind the scenes",
            "Investigating how systems works and finding vulnerabilities",
            "Managing servers, deployments, and automation pipelines"
        ]
    },
    {
        id: 2,
        question: "Which of these sounds most exciting to you?",
        options: [
            "Creating an app used by millions of people",
            "Solving a difficult algorithm or architectural problem",
            "Preventing a major cyber attack on a company",
            "Training an AI to understand and generate human-like text"
        ]
    },
    {
        id: 3,
        question: "When you encounter a new tool, what's your first instinct?",
        options: [
            "Check how it looks and how easy it is to use",
            "Look at the API documentation and source code",
            "Try to find a way to make it do something it wasn't intended for",
            "Automate the installation and setup process"
        ]
    },
    {
        id: 4,
        question: "Which field of mathematics appeals to you more?",
        options: [
            "Geometry and Visual Design ratios",
            "Discrete Math and Logic",
            "Probability and Statistics",
            "Cryptography and Number Theory"
        ]
    },
    {
        id: 5,
        question: "What kind of project would you rather work on?",
        options: [
            "A creative portfolio or social media site",
            "A high-performance trading engine or database",
            "A tool to detect and block malicious network traffic",
            "A recommendation system like Netflix or Amazon"
        ]
    },
    {
        id: 6,
        question: "How do you feel about working with hardware?",
        options: [
            "I prefer staying in the high-level software world",
            "I'm curious about how software talks to hardware",
            "I love working with low-level C/C++ and microcontrollers",
            "I want to manage the physical infrastructure that runs the cloud"
        ]
    },
    {
        id: 7,
        question: "What's your ultimate goal in tech?",
        options: [
            "To build products that people love interacting with",
            "To solve the world's most complex technical challenges",
            "To make the digital world a safer place",
            "To push the boundaries of what machines can do"
        ]
    }
];

export default function QuizPage() {
    const { apiFetch, updateUser } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: Start, 1-7: Questions, 8: Analyzing, 9: Result
    const [answers, setAnswers] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnswer = (option) => {
        const newAnswers = [...answers, { question: QUIZ_QUESTIONS[step - 1].question, answer: option }];
        setAnswers(newAnswers);
        if (step < QUIZ_QUESTIONS.length) {
            setStep(step + 1);
        } else {
            analyzeQuiz(newAnswers);
        }
    };

    const analyzeQuiz = async (finalAnswers) => {
        setStep(8); // Analyzing
        setLoading(true);
        try {
            const data = await apiFetch('/ai/quiz-analyze', {
                method: 'POST',
                body: JSON.stringify({ answers: finalAnswers })
            });
            setResult(data);
            setStep(9); // Result
        } catch (err) {
            setError(err.message);
            setStep(0);
        } finally {
            setLoading(false);
        }
    };

    const applyToProfile = async () => {
        setLoading(true);
        try {
            await apiFetch('/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    skills: result.skills,
                    interests: result.interests,
                    goals: result.goals
                })
            });
            updateUser({ profileComplete: true });
            navigate('/my-profile');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 0) {
        return (
            <div className="page quiz-page">
                <div className="glass-card quiz-card centered-content">
                    <div className="quiz-icon">🎯</div>
                    <h1>Skill Discovery Quiz</h1>
                    <p>Answer 7 quick questions to discover your tech personality and automatically populate your profile!</p>
                    <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>Start Quiz</button>
                    <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>Cancel</button>
                </div>
            </div>
        );
    }

    if (step <= QUIZ_QUESTIONS.length) {
        const q = QUIZ_QUESTIONS[step - 1];
        const progress = (step / QUIZ_QUESTIONS.length) * 100;

        return (
            <div className="page quiz-page">
                <div className="quiz-progress-container">
                    <div className="quiz-progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="glass-card quiz-card">
                    <div className="quiz-step-indicator">Question {step} of {QUIZ_QUESTIONS.length}</div>
                    <h2 className="quiz-question-text">{q.question}</h2>
                    <div className="quiz-options">
                        {q.options.map((opt, i) => (
                            <button key={i} className="quiz-option-btn animated-hover" onClick={() => handleAnswer(opt)}>
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 8) {
        return (
            <div className="page">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>AI is analyzing your tech personality...</p>
                </div>
            </div>
        );
    }

    if (step === 9 && result) {
        return (
            <div className="page quiz-page">
                <div className="glass-card result-card">
                    <div className="result-header">
                        <div className="result-badge">✨ Discovery Complete</div>
                        <h1>Your Suggested Profile</h1>
                        <p>{result.explanation}</p>
                    </div>

                    <div className="result-sections">
                        <div className="result-section">
                            <h4>🛠️ Suggested Skills</h4>
                            <div className="expertise-tags">
                                {result.skills.split(',').map(s => (
                                    <span key={s} className="tag">{s.trim()}</span>
                                ))}
                            </div>
                        </div>

                        <div className="result-section">
                            <h4>🌟 Interests</h4>
                            <p>{result.interests}</p>
                        </div>

                        <div className="result-section">
                            <h4>🎯 Career Goal</h4>
                            <p className="goal-highlight">"{result.goals}"</p>
                        </div>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="result-actions">
                        <button className="btn btn-primary btn-lg" onClick={applyToProfile} disabled={loading}>
                            {loading ? 'Applying...' : 'Apply to My Profile'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/my-profile')}>Discard</button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
