const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt, queryOne, queryAll, runSql } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mentorbridge_super_secret_key_2026';

// POST /api/auth/signup
router.post('/signup', (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!['STUDENT', 'MENTOR'].includes(role)) {
            return res.status(400).json({ error: 'Role must be STUDENT or MENTOR' });
        }

        const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const encryptedName = encrypt(name);

        runSql(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, encryptedName, role]
        );

        // Query by email to get the reliable user ID (more robust than last_insert_rowid)
        const newUser = queryOne('SELECT id FROM users WHERE email = ?', [email]);
        const userId = newUser.id;

        if (role === 'STUDENT') {
            runSql('INSERT INTO student_profiles (user_id) VALUES (?)', [userId]);
        } else {
            runSql('INSERT INTO mentor_profiles (user_id) VALUES (?)', [userId]);
        }

        const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: { id: userId, email, name, role }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        let profileComplete = false;
        if (user.role === 'STUDENT') {
            const profile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [user.id]);
            profileComplete = profile && profile.skills && String(profile.skills).length > 0;
        } else {
            const profile = queryOne('SELECT * FROM mentor_profiles WHERE user_id = ?', [user.id]);
            profileComplete = profile && profile.title && String(profile.title).length > 0;
        }

        res.json({
            token,
            user: { id: user.id, email: user.email, name: decrypt(user.name), role: user.role, profileComplete }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
