const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'electpro_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// ─── SERVE FRONTEND FILES ─────────────────────────────────────────────────────
// This serves your HTML/CSS/JS files directly
app.use(express.static(path.join(__dirname, '..')));

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ElectPro server is running!');
  console.log(`👉 Open this in your browser: http://localhost:${PORT}`);
  console.log('');
});
