const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const pool     = require('../db');

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, usn, branch, semester, designation, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.json({ ok: false, msg: 'Please fill in all required fields.' });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.json({ ok: false, msg: 'This email is already registered. Please login instead.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await pool.query(
      `INSERT INTO users (name, email, password, role, usn, branch, semester, designation, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [name, email.toLowerCase(), hashedPassword, role, usn||null, branch||null, semester||null, designation||null, department||null]
    );

    return res.json({ ok: true, msg: 'Account created successfully!' });

  } catch (err) {
    console.error('Signup error:', err.message);
    return res.json({ ok: false, msg: 'Server error. Please try again.' });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.json({ ok: false, msg: 'Please fill in all fields.' });
    }

    // Check if already logged in
    if (req.session.user && req.session.user.email === email.toLowerCase()) {
      return res.json({ ok: false, msg: 'You are already logged in with this account!' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.json({ ok: false, msg: 'No account found with this email. Please signup first.' });
    }

    const user = result.rows[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.json({ ok: false, msg: 'Incorrect password. Please try again.' });
    }

    // Check role
    if (user.role !== role) {
      return res.json({ ok: false, msg: `This account is registered as "${user.role}", not "${role}".` });
    }

    // Save session
    req.session.user = {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      usn:         user.usn,
      branch:      user.branch,
      semester:    user.semester,
      designation: user.designation,
      department:  user.department
    };

    return res.json({ ok: true, user: req.session.user });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.json({ ok: false, msg: 'Server error. Please try again.' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ─── GET SESSION ──────────────────────────────────────────────────────────────
router.get('/session', (req, res) => {
  if (req.session.user) {
    return res.json({ ok: true, user: req.session.user });
  }
  return res.json({ ok: false });
});

module.exports = router;
