const express = require('express');
const auth = require('../middleware/auth');
const { encrypt, decrypt, queryOne, queryAll, runSql } = require('../db');

const router = express.Router();

// GET /api/reviews/:userId — get all reviews for a user
router.get('/:userId', auth, (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const reviews = queryAll(`
            SELECT r.id, r.rating, r.comment, r.created_at,
                   u.name as reviewer_name, u.role as reviewer_role
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            WHERE r.reviewee_id = ?
            ORDER BY r.created_at DESC
        `, [userId]);

        const decrypted = reviews.map(r => ({
            ...r,
            comment: r.comment ? decrypt(r.comment) : '',
            reviewer_name: decrypt(r.reviewer_name)
        }));

        const avgRating = decrypted.length
            ? Math.round((decrypted.reduce((s, r) => s + r.rating, 0) / decrypted.length) * 10) / 10
            : 0;

        res.json({ reviews: decrypted, avgRating, totalReviews: decrypted.length });
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/reviews — submit a review
router.post('/', auth, (req, res) => {
    try {
        const { reviewee_id, connection_id, rating, comment } = req.body;

        if (!reviewee_id || !connection_id || !rating) {
            return res.status(400).json({ error: 'reviewee_id, connection_id, and rating are required' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Verify the connection exists and is ACCEPTED and involves this user
        const conn = queryOne(
            'SELECT * FROM connections WHERE id = ? AND (student_id = ? OR mentor_id = ?) AND status = ?',
            [parseInt(connection_id), req.user.id, req.user.id, 'ACCEPTED']
        );
        if (!conn) {
            return res.status(403).json({ error: 'Connection not found or not accepted' });
        }

        // Cannot review yourself
        if (parseInt(reviewee_id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot review yourself' });
        }

        // Check for duplicate
        const existing = queryOne(
            'SELECT id FROM reviews WHERE connection_id = ? AND reviewer_id = ?',
            [parseInt(connection_id), req.user.id]
        );
        if (existing) {
            // Update existing review
            runSql(
                'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
                [parseInt(rating), encrypt(comment || ''), existing.id]
            );
            return res.json({ message: 'Review updated', id: existing.id });
        }

        const result = runSql(
            'INSERT INTO reviews (reviewer_id, reviewee_id, connection_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, parseInt(reviewee_id), parseInt(connection_id), parseInt(rating), encrypt(comment || '')]
        );

        res.status(201).json({ message: 'Review submitted', id: result.lastInsertRowid });
    } catch (err) {
        console.error('Submit review error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
