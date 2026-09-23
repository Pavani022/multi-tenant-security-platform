const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const securityEventRoutes = require('./routes/securityEventRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Global Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health Check API
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS database_connected');
    res.status(200).json({
      success: true,
      message: 'Multi-Tenant Security Platform API is healthy',
      database: rows[0].database_connected === 1
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connectivity error',
      error: error.message
    });
  }
});

// Mount Feature Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/events', securityEventRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Centralized Error Handling Middleware (must be registered last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] Deep Trace Security Platform running on http://localhost:${PORT}`);
  });
}

module.exports = app;