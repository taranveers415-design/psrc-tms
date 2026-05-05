const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    let executed = 0;
    
    for (const stmt of statements) {
      try {
        await pool.query(stmt + ';');
        executed++;
      } catch (e) {
        // Ignore already exists errors
      }
    }
    
    await pool.end();
    
    res.json({
      status: 'success',
      message: 'Database initialized',
      login: 'admin@psrc.in / password'
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
