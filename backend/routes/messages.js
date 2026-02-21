const express = require('express');
const auth = require('../middleware/auth');
const { encrypt, decrypt, queryOne, queryAll, runSql } = require('../db');

const router = express.Router();

// GET /api/messages/unread/count - Get unread message count
router.get('/unread/count', auth, (req, res) => {
    try {
        // Find all connections for this user
        const connections = queryAll(
            'SELECT id FROM connections WHERE (student_id = ? OR mentor_id = ?) AND status = ?',
            [req.user.id, req.user.id, 'ACCEPTED']
        );

        if (connections.length === 0) return res.json({ unread: 0 });

        const connIds = connections.map(c => c.id);
        const placeholders = connIds.map(() => '?').join(',');

        const result = queryAll(
            `SELECT COUNT(*) as count FROM messages
             WHERE connection_id IN (${placeholders})
             AND sender_id != ?
             AND read_at IS NULL`,
            [...connIds, req.user.id]
        );

        res.json({ unread: result[0]?.count || 0 });
    } catch (err) {
        console.error('Unread count error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/messages/:connectionId
router.get('/:connectionId', auth, (req, res) => {
    try {
        const connection = queryOne(
            'SELECT * FROM connections WHERE id = ? AND (student_id = ? OR mentor_id = ?) AND status = ?',
            [parseInt(req.params.connectionId), req.user.id, req.user.id, 'ACCEPTED']
        );

        if (!connection) {
            return res.status(403).json({ error: 'Access denied or connection not accepted' });
        }

        const messages = queryAll(`
      SELECT m.id, m.content, m.created_at, m.sender_id, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.connection_id = ?
      ORDER BY m.created_at ASC
    `, [parseInt(req.params.connectionId)]);

        const decryptedMessages = messages.map(m => ({
            ...m,
            content: (m.content.startsWith('[IMAGE:') || m.content.startsWith('[VIDEO:'))
                ? m.content
                : decrypt(m.content),
            sender_name: decrypt(m.sender_name)
        }));

        // Mark messages from the OTHER user as read
        runSql(
            `UPDATE messages SET read_at = CURRENT_TIMESTAMP
             WHERE connection_id = ? AND sender_id != ? AND read_at IS NULL`,
            [parseInt(req.params.connectionId), req.user.id]
        );

        res.json(decryptedMessages);
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/messages/:connectionId
router.post('/:connectionId', auth, (req, res) => {
    try {
        const connection = queryOne(
            'SELECT * FROM connections WHERE id = ? AND (student_id = ? OR mentor_id = ?) AND status = ?',
            [parseInt(req.params.connectionId), req.user.id, req.user.id, 'ACCEPTED']
        );

        if (!connection) {
            return res.status(403).json({ error: 'Access denied or connection not accepted' });
        }

        const { content } = req.body;
        if (!content || (!content.trim() && !content.startsWith('[IMAGE:') && !content.startsWith('[VIDEO:'))) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Skip encryption for media messages (base64 data URLs are too large)
        const isMedia = content.startsWith('[IMAGE:') || content.startsWith('[VIDEO:');
        const storedContent = isMedia ? content : encrypt(content);

        const result = runSql(
            'INSERT INTO messages (connection_id, sender_id, content) VALUES (?, ?, ?)',
            [parseInt(req.params.connectionId), req.user.id, storedContent]
        );

        res.status(201).json({
            id: result.lastInsertRowid,
            content,
            sender_id: req.user.id,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
