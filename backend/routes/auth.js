const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { sql, poolPromise } = require('../db');

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, usn, branch, semester, designation, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.json({ ok: false, msg: 'Please fill in all required fields.' });
    }

    const pool = await poolPromise;

    // Check if email already exists
    const existing = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT id FROM Users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.json({ ok: false, msg: 'This email is already registered. Please login instead.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await pool.request()
      .input('name',        sql.NVarChar, name)
      .input('email',       sql.NVarChar, email.toLowerCase())
      .input('password',    sql.NVarChar, hashedPassword)
      .input('role',        sql.NVarChar, role)
      .input('usn',         sql.NVarChar, usn         || null)
      .input('branch',      sql.NVarChar, branch      || null)
      .input('semester',    sql.NVarChar, semester    || null)
      .input('designation', sql.NVarChar, designation || null)
      .input('department',  sql.NVarChar, department  || null)
      .query(`INSERT INTO Users (name, email, password, role, usn, branch, semester, designation, department)
              VALUES (@name, @email, @password, @role, @usn, @branch, @semester, @designation, @department)`);

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

    const pool = await poolPromise;

    // Find user by email
    const result = await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase())
      .query('SELECT * FROM Users WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.json({ ok: false, msg: 'No account found with this email. Please signup first.' });
    }

    const user = result.recordset[0];

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

// ─── GET SESSION (check if logged in) ─────────────────────────────────────────
router.get('/session', (req, res) => {
  if (req.session.user) {
    return res.json({ ok: true, user: req.session.user });
  }
  return res.json({ ok: false });
});

module.exports = router;
