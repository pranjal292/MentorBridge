import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const API = '/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [globalSocket, setGlobalSocket] = useState(null);

    useEffect(() => {
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            const socket = io();
            socket.emit('join-user-room', user.id);
            setGlobalSocket(socket);

            return () => {
                socket.disconnect();
                setGlobalSocket(null);
            };
        }
    }, [user?.id]);

    async function fetchProfile() {
        try {
            const res = await fetch(`${API}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                logout();
            }
        } catch {
            logout();
        } finally {
            setLoading(false);
        }
    }

    async function login(email, password) {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser({ ...data.user, profileComplete: data.user.profileComplete });
        return data.user;
    }

    async function signup(email, password, name, role) {
        const res = await fetch(`${API}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser({ ...data.user, profileComplete: false });
        return data.user;
    }

    function logout() {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }

    async function apiFetch(endpoint, options = {}) {
        const res = await fetch(`${API}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...options.headers
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }

    function updateUser(updates) {
        setUser(prev => ({ ...prev, ...updates }));
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, logout, apiFetch, updateUser, globalSocket }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
