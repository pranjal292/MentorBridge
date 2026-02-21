import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import GlobalCallHandler from './components/GlobalCallHandler';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import StudentDashboard from './pages/StudentDashboard';
import MentorDashboard from './pages/MentorDashboard';
import MentorProfile from './pages/MentorProfile';
import RoadmapPage from './pages/RoadmapPage';
import MessagesPage from './pages/MessagesPage';
import MyProfilePage from './pages/MyProfilePage';
import ContentDashboard from './pages/ContentDashboard';
import SkillsInsightsPage from './pages/SkillsInsightsPage';
import ResumeAnalysisPage from './pages/ResumeAnalysisPage';
import QuizPage from './pages/QuizPage';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-spinner"><div className="spinner"></div><p>Loading...</p></div>;
    if (!user) return <Navigate to="/login" />;
    return children;
}

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
                <p>Loading MentorBridge...</p>
            </div>
        );
    }

    return (
        <>
            {user && (
                <>
                    <Navbar />
                    <GlobalCallHandler />
                </>
            )}
            <Routes>
                <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
                <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupPage />} />
                <Route path="/setup" element={
                    <ProtectedRoute>
                        <ProfileSetupPage />
                    </ProtectedRoute>
                } />
                <Route path="/" element={
                    <ProtectedRoute>
                        {user?.role === 'MENTOR' ? <MentorDashboard /> : <StudentDashboard />}
                    </ProtectedRoute>
                } />
                <Route path="/mentor/:id" element={
                    <ProtectedRoute><MentorProfile /></ProtectedRoute>
                } />
                <Route path="/roadmap" element={
                    <ProtectedRoute><RoadmapPage /></ProtectedRoute>
                } />
                <Route path="/messages" element={
                    <ProtectedRoute><MessagesPage /></ProtectedRoute>
                } />
                <Route path="/my-profile" element={
                    <ProtectedRoute><MyProfilePage /></ProtectedRoute>
                } />
                <Route path="/content" element={
                    <ProtectedRoute><ContentDashboard /></ProtectedRoute>
                } />
                <Route path="/insights" element={
                    <ProtectedRoute><SkillsInsightsPage /></ProtectedRoute>
                } />
                <Route path="/resume" element={
                    <ProtectedRoute><ResumeAnalysisPage /></ProtectedRoute>
                } />
                <Route path="/quiz" element={
                    <ProtectedRoute><QuizPage /></ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </>
    );
}

export default App;
