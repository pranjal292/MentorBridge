const express = require('express');
const auth = require('../middleware/auth');
const { encrypt, decrypt, queryOne, queryAll, runSql } = require('../db');

const router = express.Router();

// GET /api/profile - Get current user's profile
router.get('/', auth, (req, res) => {
    try {
        const user = queryOne('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.name = decrypt(user.name);

        let profile = {};
        if (user.role === 'STUDENT') {
            profile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [user.id]) || {};
            if (profile.skills) profile.skills = decrypt(profile.skills);
            if (profile.interests) profile.interests = decrypt(profile.interests);
            if (profile.goals) profile.goals = decrypt(profile.goals);
            if (profile.bio) profile.bio = decrypt(profile.bio);
            if (profile.certificates) profile.certificates = decrypt(profile.certificates);
            if (profile.qualifications) profile.qualifications = decrypt(profile.qualifications);
            if (profile.experience) profile.experience = decrypt(profile.experience);
        } else {
            profile = queryOne('SELECT * FROM mentor_profiles WHERE user_id = ?', [user.id]) || {};
            if (profile.title) profile.title = decrypt(profile.title);
            if (profile.company) profile.company = decrypt(profile.company);
            if (profile.expertise) profile.expertise = decrypt(profile.expertise);
            if (profile.bio) profile.bio = decrypt(profile.bio);
            if (profile.meeting_link) profile.meeting_link = decrypt(profile.meeting_link);
            if (profile.certificates) profile.certificates = decrypt(profile.certificates);
            if (profile.qualifications) profile.qualifications = decrypt(profile.qualifications);
            if (profile.experience) profile.experience = decrypt(profile.experience);
        }

        res.json({ ...user, profile });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/profile - Update current user's profile
router.put('/', auth, (req, res) => {
    try {
        const user = queryOne('SELECT id, role FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (req.body.name) {
            runSql('UPDATE users SET name = ? WHERE id = ?', [encrypt(req.body.name), user.id]);
        }

        if (user.role === 'STUDENT') {
            const { skills, interests, goals, bio, certificates, qualifications, experience } = req.body;
            if (skills !== undefined) runSql('UPDATE student_profiles SET skills = ? WHERE user_id = ?', [encrypt(skills), user.id]);
            if (interests !== undefined) runSql('UPDATE student_profiles SET interests = ? WHERE user_id = ?', [encrypt(interests), user.id]);
            if (goals !== undefined) runSql('UPDATE student_profiles SET goals = ? WHERE user_id = ?', [encrypt(goals), user.id]);
            if (bio !== undefined) runSql('UPDATE student_profiles SET bio = ? WHERE user_id = ?', [encrypt(bio), user.id]);
            if (certificates !== undefined) runSql('UPDATE student_profiles SET certificates = ? WHERE user_id = ?', [encrypt(certificates), user.id]);
            if (qualifications !== undefined) runSql('UPDATE student_profiles SET qualifications = ? WHERE user_id = ?', [encrypt(qualifications), user.id]);
            if (experience !== undefined) runSql('UPDATE student_profiles SET experience = ? WHERE user_id = ?', [encrypt(experience), user.id]);
        } else {
            const { title, company, expertise, bio, meeting_link, years_exp, certificates, qualifications, experience } = req.body;
            if (title !== undefined) runSql('UPDATE mentor_profiles SET title = ? WHERE user_id = ?', [encrypt(title), user.id]);
            if (company !== undefined) runSql('UPDATE mentor_profiles SET company = ? WHERE user_id = ?', [encrypt(company), user.id]);
            if (expertise !== undefined) runSql('UPDATE mentor_profiles SET expertise = ? WHERE user_id = ?', [encrypt(expertise), user.id]);
            if (bio !== undefined) runSql('UPDATE mentor_profiles SET bio = ? WHERE user_id = ?', [encrypt(bio), user.id]);
            if (meeting_link !== undefined) runSql('UPDATE mentor_profiles SET meeting_link = ? WHERE user_id = ?', [encrypt(meeting_link), user.id]);
            if (years_exp !== undefined) runSql('UPDATE mentor_profiles SET years_exp = ? WHERE user_id = ?', [years_exp, user.id]);
            if (certificates !== undefined) runSql('UPDATE mentor_profiles SET certificates = ? WHERE user_id = ?', [encrypt(certificates), user.id]);
            if (qualifications !== undefined) runSql('UPDATE mentor_profiles SET qualifications = ? WHERE user_id = ?', [encrypt(qualifications), user.id]);
            if (experience !== undefined) runSql('UPDATE mentor_profiles SET experience = ? WHERE user_id = ?', [encrypt(experience), user.id]);
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/profile/mentors - List all mentors
router.get('/mentors', auth, (req, res) => {
    try {
        const mentors = queryAll(`
      SELECT u.id, u.name, u.email, mp.title, mp.company, mp.expertise, mp.bio, mp.meeting_link, mp.years_exp
      FROM users u
      JOIN mentor_profiles mp ON u.id = mp.user_id
      WHERE u.role = 'MENTOR'
    `);

        const decryptedMentors = mentors.map(m => ({
            ...m,
            name: decrypt(m.name),
            title: decrypt(m.title),
            company: decrypt(m.company),
            expertise: decrypt(m.expertise),
            bio: decrypt(m.bio),
            meeting_link: decrypt(m.meeting_link)
        }));

        res.json(decryptedMentors);
    } catch (err) {
        console.error('Get mentors error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/profile/mentors/:id - Get mentor by ID
router.get('/mentors/:id', auth, (req, res) => {
    try {
        const mentor = queryOne(`
      SELECT u.id, u.name, u.email, mp.title, mp.company, mp.expertise, mp.bio, mp.meeting_link, mp.years_exp
      FROM users u
      JOIN mentor_profiles mp ON u.id = mp.user_id
      WHERE u.id = ? AND u.role = 'MENTOR'
    `, [parseInt(req.params.id)]);

        if (!mentor) return res.status(404).json({ error: 'Mentor not found' });

        mentor.name = decrypt(mentor.name);
        mentor.title = decrypt(mentor.title);
        mentor.company = decrypt(mentor.company);
        mentor.expertise = decrypt(mentor.expertise);
        mentor.bio = decrypt(mentor.bio);
        mentor.meeting_link = decrypt(mentor.meeting_link);

        res.json(mentor);
    } catch (err) {
        console.error('Get mentor error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
