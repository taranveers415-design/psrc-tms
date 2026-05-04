const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const tripRoutes = require('./routes/trips');
const orderRoutes = require('./routes/orders');
const clientRoutes = require('./routes/clients');
const invoiceRoutes = require('./routes/invoices');
const accountingRoutes = require('./routes/accounting');
const bankRoutes = require('./routes/banking');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Auto-create database tables on startup
const setupDatabase = async () => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const schemaPath = path.join(__dirname, 'database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split and execute each statement
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        await pool.query(stmt + ';');
      } catch (e) {
        // Ignore "already exists" errors
        if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
          console.log('DB Note:', e.message);
        }
      }
    }
    
    console.log('Database setup complete!');
    await pool.end();
  } catch (err) {
    console.error('DB Setup Error:', err.message);
  }
};

// Run database setup
setupDatabase();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'PSRC TMS API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/banking', bankRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`PSRC TMS API running on port ${PORT}`);
});

module.exports = app;
