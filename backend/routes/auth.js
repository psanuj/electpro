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
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.json({ ok: false, msg: 'This email is already registered. Please login instead.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
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
    if (req.session.user && req.session.user.email === email.toLowerCase()) {
      return res.json({ ok: false, msg: 'You are already logged in with this account!' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.json({ ok: false, msg: 'No account found with this email. Please signup first.' });
    }
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.json({ ok: false, msg: 'Incorrect password. Please try again.' });
    }
    if (user.role !== role) {
      return res.json({ ok: false, msg: `This account is registered as "${user.role}", not "${role}".` });
    }
    req.session.user = {
      id: user.id, name: user.name, email: user.email, role: user.role,
      usn: user.usn, branch: user.branch, semester: user.semester,
      designation: user.designation, department: user.department,
      phone: user.phone, dob: user.dob, cgpa: user.cgpa, advisor: user.advisor
    };
    return res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.json({ ok: false, msg: 'Server error. Please try again.' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => { res.json({ ok: true }); });
});

// ─── GET SESSION ──────────────────────────────────────────────────────────────
router.get('/session', (req, res) => {
  if (req.session.user) return res.json({ ok: true, user: req.session.user });
  return res.json({ ok: false });
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
router.post('/update-profile', async (req, res) => {
  try {
    if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in.' });
    const { name, phone, dob, department, advisor, cgpa } = req.body;
    if (!name) return res.json({ ok: false, msg: 'Name is required.' });
    await pool.query(
      `UPDATE users SET name=$1, phone=$2, dob=$3, department=$4, advisor=$5, cgpa=$6 WHERE id=$7`,
      [name, phone||null, dob||null, department||null, advisor||null, cgpa||null, req.session.user.id]
    );
    // Update session
    req.session.user.name       = name;
    req.session.user.phone      = phone;
    req.session.user.dob        = dob;
    req.session.user.department = department;
    req.session.user.advisor    = advisor;
    req.session.user.cgpa       = cgpa;
    return res.json({ ok: true, msg: 'Profile updated successfully!', user: req.session.user });
  } catch (err) {
    console.error('Update profile error:', err.message);
    return res.json({ ok: false, msg: 'Server error. Please try again.' });
  }
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
router.post('/change-password', async (req, res) => {
  try {
    if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in.' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.json({ ok: false, msg: 'All fields required.' });
    if (newPassword.length < 8) return res.json({ ok: false, msg: 'Password must be at least 8 characters.' });
    const result = await pool.query('SELECT password FROM users WHERE id=$1', [req.session.user.id]);
    const user = result.rows[0];
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.json({ ok: false, msg: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.session.user.id]);
    return res.json({ ok: true, msg: 'Password changed successfully!' });
  } catch (err) {
    console.error('Change password error:', err.message);
    return res.json({ ok: false, msg: 'Server error. Please try again.' });
  }
});

module.exports = router;

// ─── SAVE PREFERENCES ─────────────────────────────────────────────────────────
router.post('/save-preferences', async (req, res) => {
  try {
    if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in.' });
    const { preferences } = req.body;
    await pool.query(
      `UPDATE users SET preferences=$1 WHERE id=$2`,
      [JSON.stringify(preferences), req.session.user.id]
    );
    req.session.user.preferences = preferences;
    return res.json({ ok: true, msg: 'Preferences saved!' });
  } catch (err) {
    console.error('Save preferences error:', err.message);
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── GET PREFERENCES ──────────────────────────────────────────────────────────
router.get('/get-preferences', async (req, res) => {
  try {
    if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in.' });
    const result = await pool.query('SELECT preferences FROM users WHERE id=$1', [req.session.user.id]);
    const prefs = result.rows[0]?.preferences || null;
    return res.json({ ok: true, preferences: prefs });
  } catch (err) {
    console.error('Get preferences error:', err.message);
    return res.json({ ok: false, msg: 'Server error.' });
  }
});
