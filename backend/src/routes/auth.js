const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

const JWT_SECRET  = process.env.JWT_SECRET || 'bazaar-dev-secret-change-in-prod';
const JWT_EXPIRES = '7d';
const SALT_ROUNDS = 10;

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, displayName: user.display_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // Hash is stored in a separate table so we don't pollute users
    // We keep users clean and add a credentials table
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows: [user] } = await db.query(
      `INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id, email, display_name`,
      [email.toLowerCase(), displayName || email.split('@')[0]]
    );

    await db.query(
      `INSERT INTO user_credentials (user_id, password_hash) VALUES ($1, $2)`,
      [user.id, hash]
    );

    const token = makeToken(user);
    res.status(201).json({
      data: { id: user.id, email: user.email, displayName: user.display_name, token }
    });
  } catch (err) {
    console.error('[POST /auth/register]', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { rows: [user] } = await db.query(
      `SELECT u.id, u.email, u.display_name, c.password_hash
       FROM users u
       JOIN user_credentials c ON c.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = makeToken(user);
    res.json({
      data: { id: user.id, email: user.email, displayName: user.display_name, token }
    });
  } catch (err) {
    console.error('[POST /auth/login]', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
