const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

app.use(session({
  secret: 'electpro_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true
  }
}));

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(100)  NOT NULL,
        email       VARCHAR(100)  NOT NULL UNIQUE,
        password    VARCHAR(255)  NOT NULL,
        role        VARCHAR(20)   NOT NULL,
        usn         VARCHAR(50),
        branch      VARCHAR(50),
        semester    VARCHAR(20),
        designation VARCHAR(100),
        department  VARCHAR(100),
        phone       VARCHAR(20),
        dob         VARCHAR(20),
        cgpa        VARCHAR(10),
        advisor     VARCHAR(100),
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add missing columns if they don't exist (for existing databases)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cgpa VARCHAR(10)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS advisor VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences TEXT`);

    // Settings table for publish/unpublish
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key   VARCHAR(100) PRIMARY KEY,
        value TEXT
      )
    `);
    // Ensure results_published key exists
    await pool.query(`INSERT INTO settings (key,value) VALUES ('results_published','false') ON CONFLICT (key) DO NOTHING`);

    // Create electives table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS electives (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        department VARCHAR(50),
        seats      INTEGER DEFAULT 30,
        credits    INTEGER DEFAULT 3,
        faculty    VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create allocations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allocations (
        id             SERIAL PRIMARY KEY,
        student_id     INTEGER REFERENCES users(id),
        elective_id    INTEGER REFERENCES electives(id),
        preference_num INTEGER,
        status         VARCHAR(20) DEFAULT 'Allocated',
        created_at     TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default electives if none exist
    const electCount = await pool.query('SELECT COUNT(*) FROM electives');
    if (parseInt(electCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO electives (name, department, seats, credits, faculty) VALUES
        ('Machine Learning', 'CSE', 30, 3, 'Dr. Meena Rao'),
        ('Cloud Computing', 'CSE', 30, 3, 'Prof. Anand S.'),
        ('IoT Systems', 'ECE', 30, 2, 'Dr. Priya Nair'),
        ('Cyber Security', 'CSE', 30, 3, 'Prof. Raj Kumar'),
        ('Robotics', 'MECH', 30, 4, 'Dr. Suresh T.'),
        ('Deep Learning', 'CSE', 30, 3, 'Dr. Aisha Khan'),
        ('Blockchain Tech', 'CSE', 30, 2, 'Prof. Vinod M.'),
        ('Signal Processing', 'ECE', 30, 3, 'Dr. Ravi Menon'),
        ('Entrepreneurship', 'MBA', 30, 2, 'Prof. Latha S.')
      `);
      console.log('✅ Default electives inserted!');
    }
    console.log('✅ Database tables ready!');
  } catch (err) {
    console.error('❌ Table creation failed:', err.message);
  }
}

initDB();

app.use(express.static(path.join(__dirname, '..')));
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ElectPro server is running!');
  console.log(`👉 Open this in your browser: http://localhost:${PORT}`);
});
