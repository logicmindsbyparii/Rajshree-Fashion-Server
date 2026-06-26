const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { queryOne, run, saveDB } = require('../models/db');
const { generateToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const existingUser = queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const role = 'customer';

    run('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email.toLowerCase(), hashedPassword, role]);
    saveDB();

    const user = { id, name, email: email.toLowerCase(), role };
    const token = generateToken(user);

    res.status(201).json({
      message: 'Registration successful',
      user,
      token
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    const user = queryOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/profile
router.get('/profile', verifyToken, (req, res) => {
  try {
    const user = queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

module.exports = router;
