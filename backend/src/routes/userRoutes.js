const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/rbacMiddleware');
const recordAuditLog = require('../utils/auditLogger');

const router = express.Router();

// User management routes require authentication
router.use(authenticateToken);

// Lists all users within the current tenant organization
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    const query = `
      SELECT 
        user_id,
        tenant_id,
        full_name,
        email_address,
        role_name,
        account_status,
        last_login_at,
        created_at
      FROM users
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `;

    const [users] = await pool.query(query, [tenantId]);

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Registers a new user within the tenant (ADMIN only)
router.post('/', authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const { full_name, email_address, password, role_name } = req.body;
    const tenantId = req.user.tenant_id;

    if (!full_name || !email_address || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email address, and password are required'
      });
    }

    const assignedRole = (role_name || 'USER').trim().toUpperCase();
    if (!['ADMIN', 'MANAGER', 'USER'].includes(assignedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be 'ADMIN', 'MANAGER', or 'USER'"
      });
    }

    // Check if email already exists within this tenant
    const [existing] = await pool.query(
      'SELECT user_id FROM users WHERE tenant_id = ? AND email_address = ?',
      [tenantId, email_address.trim().toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists in your organization'
      });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO users (
        tenant_id,
        full_name,
        email_address,
        password_hash,
        role_name,
        account_status
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVE')
    `;

    const [result] = await pool.query(insertQuery, [
      tenantId,
      full_name.trim(),
      email_address.trim().toLowerCase(),
      passwordHash,
      assignedRole
    ]);

    const newUserId = result.insertId;

    // Record creation in audit log
    await recordAuditLog(req, {
      action_type: 'USER_CREATED',
      target_resource_type: 'USER',
      target_resource_id: String(newUserId),
      action_details_json: {
        created_user_id: newUserId,
        email: email_address.trim().toLowerCase(),
        role: assignedRole
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user_id: newUserId,
        full_name: full_name.trim(),
        email_address: email_address.trim().toLowerCase(),
        role_name: assignedRole,
        account_status: 'ACTIVE'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
