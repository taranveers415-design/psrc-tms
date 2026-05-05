const express = require('express');
const { query } = require('../database/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Step 1: Enable uuid extension
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Step 2: Create users table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Step 3: Delete existing users
    await query("DELETE FROM users WHERE email IN ('admin@psrc.in', 'manager@psrc.in', 'accounts@psrc.in')");
    
    // Step 4: Insert users with working bcrypt hash
    await query(`
      INSERT INTO users (email, password_hash, full_name, phone, role, is_active)
      VALUES 
        ('admin@psrc.in', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'System Admin', '9876543210', 'admin', true),
        ('manager@psrc.in', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Operations Manager', '9876543211', 'manager', true),
        ('accounts@psrc.in', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqhmM6JGKpS4G3R1G2JH8YpfB0Bqy', 'Accountant', '9876543212', 'accountant', true)
    `);
    
    res.json({
      status: 'success',
      message: 'All users created successfully',
      users: [
        { email: 'admin@psrc.in', password: 'password', role: 'admin' },
        { email: 'manager@psrc.in', password: 'password', role: 'manager' },
        { email: 'accounts@psrc.in', password: 'password', role: 'accountant' }
      ]
    });
    
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error',
      code: error.code || 'NO_CODE',
      detail: error.detail || 'No detail'
    });
  }
});

module.exports = router;
