const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');
const pool    = require('./db');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'electpro_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
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
