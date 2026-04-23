const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../db');

// Email validation helper
function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, usn, branch, semester, designation, department } = req.body;
    if (!name || !email || !password || !role) return res.json({ ok: false, msg: 'Please fill in all required fields.' });
    if (!isValidEmail(email)) return res.json({ ok: false, msg: 'Please enter a valid email address (e.g. name@domain.com).' });
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.json({ ok: false, msg: 'This email is already registered. Please login instead.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password, role, usn, branch, semester, designation, department) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
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
    if (!email || !password || !role) return res.json({ ok: false, msg: 'Please fill in all fields.' });
    if (!isValidEmail(email)) return res.json({ ok: false, msg: 'Please enter a valid email address.' });
    if (req.session.user && req.session.user.email === email.toLowerCase()) return res.json({ ok: false, msg: 'You are already logged in with this account!' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.json({ ok: false, msg: 'No account found with this email. Please signup first.' });
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.json({ ok: false, msg: 'Incorrect password. Please try again.' });
    if (user.role !== role) return res.json({ ok: false, msg: `This account is registered as "${user.role}", not "${role}".` });
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
router.post('/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });

// ─── SESSION ──────────────────────────────────────────────────────────────────
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
    req.session.user = { ...req.session.user, name, phone, dob, department, advisor, cgpa };
    return res.json({ ok: true, msg: 'Profile updated successfully!', user: req.session.user });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
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
    const match = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.json({ ok: false, msg: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.session.user.id]);
    return res.json({ ok: true, msg: 'Password changed successfully!' });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── SAVE PREFERENCES ─────────────────────────────────────────────────────────
router.post('/save-preferences', async (req, res) => {
  try {
    if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in.' });
    const { preferences } = req.body;
    if (!Array.isArray(preferences) || preferences.length === 0) return res.json({ ok: false, msg: 'No preferences provided.' });
    await pool.query(`UPDATE users SET preferences=$1 WHERE id=$2`, [JSON.stringify(preferences), req.session.user.id]);
    req.session.user.preferences = preferences;
    return res.json({ ok: true, msg: 'Preferences saved!' });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── GET PREFERENCES ──────────────────────────────────────────────────────────
router.get('/get-preferences', async (req, res) => {
  try {
    if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in.' });
    const result = await pool.query('SELECT preferences FROM users WHERE id=$1', [req.session.user.id]);
    const prefs = result.rows[0]?.preferences || null;
    return res.json({ ok: true, preferences: prefs ? JSON.parse(prefs) : [] });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── GET ELECTIVES (student) ──────────────────────────────────────────────────
router.get('/electives', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM electives ORDER BY id`);
    return res.json({ ok: true, electives: result.rows });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── STUDENT: GET MY ALLOCATION RESULT ────────────────────────────────────────
router.get('/my-allocation', async (req, res) => {
  try {
    if (!req.session.user) return res.json({ ok: false, msg: 'Not logged in.' });
    // Check if results are published
    const pub = await pool.query(`SELECT value FROM settings WHERE key='results_published'`);
    const published = pub.rows[0]?.value === 'true';
    if (!published) return res.json({ ok: true, status: 'pending', published: false });
    // Get student's allocation
    const result = await pool.query(`
      SELECT a.status, a.preference_num, e.name as elective_name, e.department, e.credits
      FROM allocations a
      JOIN electives e ON a.elective_id = e.id
      WHERE a.student_id = $1
    `, [req.session.user.id]);
    if (result.rows.length === 0) return res.json({ ok: true, status: 'not_allocated', published: true });
    return res.json({ ok: true, status: result.rows[0].status, allocation: result.rows[0], published: true });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── ADMIN: GET ALL STUDENTS ──────────────────────────────────────────────────
router.get('/admin/students', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') return res.json({ ok: false, msg: 'Unauthorized.' });
    const result = await pool.query(`SELECT id, name, email, usn, branch, semester, cgpa, preferences FROM users WHERE role='student' ORDER BY name`);
    return res.json({ ok: true, students: result.rows });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── ADMIN: ELECTIVES CRUD ────────────────────────────────────────────────────
router.get('/admin/electives', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM electives ORDER BY id`);
    return res.json({ ok: true, electives: result.rows });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

router.post('/admin/electives', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') return res.json({ ok: false, msg: 'Unauthorized.' });
    const { name, department, seats, credits, faculty } = req.body;
    if (!name) return res.json({ ok: false, msg: 'Elective name required.' });
    await pool.query(
      `INSERT INTO electives (name, department, seats, credits, faculty) VALUES ($1,$2,$3,$4,$5)`,
      [name, department||'', seats||30, credits||3, faculty||'']
    );
    return res.json({ ok: true, msg: 'Elective added!' });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

router.delete('/admin/electives/:id', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') return res.json({ ok: false, msg: 'Unauthorized.' });
    const id = req.params.id;
    // Clear preferences that include this elective from all students
    const students = await pool.query(`SELECT id, preferences FROM users WHERE role='student' AND preferences IS NOT NULL`);
    for (const s of students.rows) {
      try {
        let prefs = JSON.parse(s.preferences || '[]');
        const newPrefs = prefs.filter(p => p != id);
        if (newPrefs.length !== prefs.length) {
          await pool.query(`UPDATE users SET preferences=$1 WHERE id=$2`, [JSON.stringify(newPrefs), s.id]);
        }
      } catch(e) {}
    }
    // Delete from allocations too
    await pool.query(`DELETE FROM allocations WHERE elective_id=$1`, [id]);
    await pool.query(`DELETE FROM electives WHERE id=$1`, [id]);
    return res.json({ ok: true, msg: 'Elective deleted and removed from student preferences!' });
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── ADMIN: RUN ALLOCATION ────────────────────────────────────────────────────
router.post('/admin/run-allocation', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') return res.json({ ok: false, msg: 'Unauthorized.' });
    const studentsResult = await pool.query(
      `SELECT id, name, usn, cgpa, preferences FROM users WHERE role='student' AND preferences IS NOT NULL ORDER BY CAST(NULLIF(cgpa,'') AS FLOAT) DESC NULLS LAST`
    );
    const students = studentsResult.rows;
    const electivesResult = await pool.query(`SELECT * FROM electives`);
    const electives = electivesResult.rows;
    const seatMap = {};
    electives.forEach(e => { seatMap[e.id] = parseInt(e.seats); });
    await pool.query(`DELETE FROM allocations`);
    // Unpublish results when re-running
    await pool.query(`INSERT INTO settings (key, value) VALUES ('results_published','false') ON CONFLICT (key) DO UPDATE SET value='false'`);
    const results = [];
    for (const student of students) {
      let prefs = [];
      try { prefs = JSON.parse(student.preferences || '[]'); } catch(e) {}
      let allocated = false;
      let prefNum = 0;
      for (const electiveId of prefs) {
        prefNum++;
        const elective = electives.find(e => e.id == electiveId);
        if (!elective) continue;
        if (seatMap[electiveId] > 0) {
          seatMap[electiveId]--;
          await pool.query(
            `INSERT INTO allocations (student_id, elective_id, preference_num, status) VALUES ($1,$2,$3,'Allocated')`,
            [student.id, electiveId, prefNum]
          );
          results.push({ student, elective, prefNum, status: 'Allocated' });
          allocated = true;
          break;
        }
      }
      if (!allocated && prefs.length > 0) {
        const firstElective = electives.find(e => e.id == prefs[0]);
        if (firstElective) {
          await pool.query(
            `INSERT INTO allocations (student_id, elective_id, preference_num, status) VALUES ($1,$2,$3,'Waitlisted')`,
            [student.id, prefs[0], 1]
          );
          results.push({ student, elective: firstElective, prefNum: 1, status: 'Waitlisted' });
        }
      }
    }
    // Update seats remaining in electives table
    for (const [id, remaining] of Object.entries(seatMap)) {
      await pool.query(`UPDATE electives SET seats=$1 WHERE id=$2`, [remaining, id]);
    }
    return res.json({ ok: true, msg: 'Allocation completed!', results });
  } catch (err) {
    console.error('Allocation error:', err.message);
    return res.json({ ok: false, msg: 'Server error: ' + err.message });
  }
});

// ─── ADMIN: PUBLISH RESULTS ───────────────────────────────────────────────────
router.post('/admin/publish-results', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') return res.json({ ok: false, msg: 'Unauthorized.' });
    await pool.query(`INSERT INTO settings (key, value) VALUES ('results_published','true') ON CONFLICT (key) DO UPDATE SET value='true'`);
    return res.json({ ok: true, msg: 'Results published! Students can now see their allocation.' });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── ADMIN: GET ALLOCATION RESULTS ────────────────────────────────────────────
router.get('/admin/allocations', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') return res.json({ ok: false, msg: 'Unauthorized.' });
    const result = await pool.query(`
      SELECT a.id, a.preference_num, a.status,
             u.name as student_name, u.usn, u.cgpa,
             e.name as elective_name
      FROM allocations a
      JOIN users u ON a.student_id = u.id
      JOIN electives e ON a.elective_id = e.id
      ORDER BY CAST(NULLIF(u.cgpa,'') AS FLOAT) DESC NULLS LAST
    `);
    const pub = await pool.query(`SELECT value FROM settings WHERE key='results_published'`);
    const published = pub.rows[0]?.value === 'true';
    return res.json({ ok: true, allocations: result.rows, published });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

// ─── ADMIN: DASHBOARD STATS ───────────────────────────────────────────────────
router.get('/admin/stats', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'admin') return res.json({ ok: false, msg: 'Unauthorized.' });
    const [students, electives, prefs, allocs] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE role='student'`),
      pool.query(`SELECT COUNT(*) FROM electives`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role='student' AND preferences IS NOT NULL AND preferences != '[]'`),
      pool.query(`SELECT COUNT(*) FROM allocations`)
    ]);
    const pub = await pool.query(`SELECT value FROM settings WHERE key='results_published'`);
    return res.json({
      ok: true,
      totalStudents: parseInt(students.rows[0].count),
      totalElectives: parseInt(electives.rows[0].count),
      submittedPrefs: parseInt(prefs.rows[0].count),
      allocationsRun: parseInt(allocs.rows[0].count) > 0,
      published: pub.rows[0]?.value === 'true'
    });
  } catch (err) {
    return res.json({ ok: false, msg: 'Server error.' });
  }
});

module.exports = router;
