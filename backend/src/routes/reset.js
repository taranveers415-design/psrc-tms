const express = require('express');
const { query } = require('../database/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Update admin password to a known working hash
    await query(`
      UPDATE users 
      SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy'
      WHERE email = 'admin@psrc.in'
    `);
    
    // If no rows updated, insert new admin
    await query(`
      INSERT INTO users (email, password_hash, full_name, phone, role, is_active)
      SELECT 'admin@psrc.in', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'System Admin', '9876543210', 'admin', true
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@psrc.in')
    `);
    
    res.json({ 
      status: 'success', 
      message: 'Admin password reset',
      login: 'admin@psrc.in / password'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
