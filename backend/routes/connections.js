const express = require('express');
const auth = require('../middleware/auth');
const { encrypt, decrypt, queryOne, queryAll, runSql } = require('../db');

const router = express.Router();

// POST /api/connections
router.post('/', auth, (req, res) => {
    try {
        if (req.user.role !== 'STUDENT') {
            return res.status(403).json({ error: 'Only students can send requests' });
        }

        const { mentor_id, message } = req.body;
        if (!mentor_id) return res.status(400).json({ error: 'Mentor ID is required' });

        const mentor = queryOne('SELECT id FROM users WHERE id = ? AND role = ?', [mentor_id, 'MENTOR']);
        if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

        const existing = queryOne('SELECT id, status FROM connections WHERE student_id = ? AND mentor_id = ?', [req.user.id, mentor_id]);
        if (existing) {
            return res.status(409).json({ error: `Connection already exists with status: ${existing.status}`, status: existing.status });
        }

        const result = runSql(
            'INSERT INTO connections (student_id, mentor_id, status, message) VALUES (?, ?, ?, ?)',
            [req.user.id, mentor_id, 'PENDING', message ? encrypt(message) : '']
        );

        res.status(201).json({ id: result.lastInsertRowid, status: 'PENDING', message: 'Connection request sent' });
    } catch (err) {
        console.error('Create connection error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/connections
router.get('/', auth, (req, res) => {
    try {
        let connections;

        if (req.user.role === 'STUDENT') {
            connections = queryAll(`
        SELECT c.id, c.status, c.message, c.created_at,
               u.id as mentor_id, u.name as mentor_name,
               mp.title as mentor_title, mp.company as mentor_company, mp.expertise as mentor_expertise
        FROM connections c
        JOIN users u ON c.mentor_id = u.id
        JOIN mentor_profiles mp ON u.id = mp.user_id
        WHERE c.student_id = ?
        ORDER BY c.created_at DESC
      `, [req.user.id]);

            connections = connections.map(c => ({
                ...c,
                mentor_name: decrypt(c.mentor_name),
                mentor_title: decrypt(c.mentor_title),
                mentor_company: decrypt(c.mentor_company),
                mentor_expertise: decrypt(c.mentor_expertise),
                message: decrypt(c.message)
            }));
        } else {
            connections = queryAll(`
        SELECT c.id, c.status, c.message, c.created_at,
               u.id as student_id, u.name as student_name,
               sp.skills as student_skills, sp.goals as student_goals
        FROM connections c
        JOIN users u ON c.student_id = u.id
        JOIN student_profiles sp ON u.id = sp.user_id
        WHERE c.mentor_id = ?
        ORDER BY c.created_at DESC
      `, [req.user.id]);

            connections = connections.map(c => ({
                ...c,
                student_name: decrypt(c.student_name),
                student_skills: decrypt(c.student_skills),
                student_goals: decrypt(c.student_goals),
                message: decrypt(c.message)
            }));
        }

        res.json(connections);
    } catch (err) {
        console.error('Get connections error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/connections/:id
router.put('/:id', auth, (req, res) => {
    try {
        if (req.user.role !== 'MENTOR') {
            return res.status(403).json({ error: 'Only mentors can accept/reject requests' });
        }

        const { status } = req.body;
        if (!['ACCEPTED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Status must be ACCEPTED or REJECTED' });
        }

        const connection = queryOne('SELECT * FROM connections WHERE id = ? AND mentor_id = ?', [parseInt(req.params.id), req.user.id]);
        if (!connection) return res.status(404).json({ error: 'Connection not found' });

        runSql('UPDATE connections SET status = ? WHERE id = ?', [status, parseInt(req.params.id)]);

        res.json({ message: `Connection ${status.toLowerCase()}`, status });
    } catch (err) {
        console.error('Update connection error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/connections/:id - Disconnect (either party)
router.delete('/:id', auth, (req, res) => {
    try {
        const connId = parseInt(req.params.id);
        const connection = queryOne('SELECT * FROM connections WHERE id = ?', [connId]);
        if (!connection) return res.status(404).json({ error: 'Connection not found' });

        // Allow either student or mentor to disconnect
        if (connection.student_id !== req.user.id && connection.mentor_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to disconnect this connection' });
        }

        runSql('DELETE FROM connections WHERE id = ?', [connId]);
        res.json({ message: 'Connection removed successfully' });
    } catch (err) {
        console.error('Delete connection error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
