// ─── ELECTPRO FRONTEND AUTH (auth.js) ────────────────────────────────────────
// Talks to the real backend API instead of localStorage

async function registerUser(userData) {
  try {
    const res = await fetch('/api/auth/signup', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify(userData)
    });
    return await res.json();
  } catch (err) {
    return { ok: false, msg: 'Cannot connect to server. Make sure server.js is running.' };
  }
}

async function loginUser(email, password, role) {
  try {
    const res = await fetch('/api/auth/login', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ email, password, role })
    });
    return await res.json();
  } catch (err) {
    return { ok: false, msg: 'Cannot connect to server. Make sure server.js is running.' };
  }
}

async function logoutUser() {
  try {
    await fetch('/api/auth/logout', {
      method:      'POST',
      credentials: 'include'
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
}

async function getSession() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    return await res.json();
  } catch (err) {
    return { ok: false };
  }
}

async function requireAuth(role, redirectPath) {
  const result = await getSession();
  if (!result.ok) {
    window.location.href = redirectPath;
    return null;
  }
  if (result.user.role !== role) {
    window.location.href = redirectPath;
    return null;
  }
  return result.user;
}
