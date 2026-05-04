const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5000,

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'psrc_tms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    poolSize: parseInt(process.env.DB_POOL_SIZE) || 20
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'psrc-tms-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  upload: {
    maxSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  },

  gst: {
    defaultRate: 12.00,
    igstRate: 12.00,
    cgstRate: 6.00,
    sgstRate: 6.00
  },

  bankApi: {
    icici: {
      baseUrl: process.env.ICICI_API_URL,
      clientId: process.env.ICICI_CLIENT_ID,
      clientSecret: process.env.ICICI_CLIENT_SECRET
    },
    hdfc: {
      baseUrl: process.env.HDFC_API_URL,
      apiKey: process.env.HDFC_API_KEY
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    }
  },

  gps: {
    provider: process.env.GPS_PROVIDER || 'none',
    apiKey: process.env.GPS_API_KEY
  }
};

module.exports = config;
