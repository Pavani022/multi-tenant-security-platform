const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authMiddleware');
const recordAuditLog = require('../utils/auditLogger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_deep_trace_cybernetics_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Authenticates user credentials and issues a tenant-scoped JWT token
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Look up user along with organization status
    const query = `
      SELECT 
        u.user_id,
        u.tenant_id,
        u.full_name,
        u.email_address,
        u.password_hash,
        u.role_name,
        u.account_status,
        t.tenant_name,
        t.tenant_slug,
        t.tenant_status
      FROM users u
      JOIN tenants t ON u.tenant_id = t.tenant_id
      WHERE u.email_address = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [email.trim().toLowerCase()]);

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // Check account status
    if (user.account_status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your administrator'
      });
    }

    // Check organization subscription status
    if (user.tenant_status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your organization account is suspended'
      });
    }

    // Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate signed JWT token
    const tokenPayload = {
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      role_name: user.role_name,
      email_address: user.email_address,
      full_name: user.full_name
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Update last login timestamp
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE user_id = ?', [user.user_id]);

    // Record login in audit log
    req.user = tokenPayload;
    await recordAuditLog(req, {
      action_type: 'USER_LOGIN',
      target_resource_type: 'AUTH',
      target_resource_id: String(user.user_id),
      action_details_json: { email: user.email_address, status: 'SUCCESS' }
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          email_address: user.email_address,
          role_name: user.role_name,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant_name,
          tenant_slug: user.tenant_slug
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Returns the profile of the currently logged-in user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const query = `
      SELECT 
        u.user_id,
        u.tenant_id,
        u.full_name,
        u.email_address,
        u.role_name,
        u.account_status,
        u.last_login_at,
        t.tenant_name,
        t.tenant_slug
      FROM users u
      JOIN tenants t ON u.tenant_id = t.tenant_id
      WHERE u.user_id = ? AND u.tenant_id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [req.user.user_id, req.user.tenant_id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
