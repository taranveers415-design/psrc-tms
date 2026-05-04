const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { query } = require('../database/db');
const config = require('../config');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', 
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await query(
        'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(401).json({ error: 'Account is deactivated' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
