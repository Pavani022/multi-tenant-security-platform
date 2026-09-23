const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/rbacMiddleware');

const router = express.Router();

// All audit routes require authentication and are restricted to ADMIN & MANAGER roles
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'MANAGER'));

// Retrieves paginated audit trail records for the tenant
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;

    const { action_type, resource_type } = req.query;

    const whereClauses = ['a.tenant_id = ?'];
    const queryParams = [tenantId];

    if (action_type && action_type.trim()) {
      whereClauses.push('a.action_type = ?');
      queryParams.push(action_type.trim());
    }

    if (resource_type && resource_type.trim()) {
      whereClauses.push('a.target_resource_type = ?');
      queryParams.push(resource_type.trim().toUpperCase());
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count for pagination
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs a WHERE ${whereSql}`,
      queryParams
    );
    const totalRecords = countResult[0].total;

    // Fetch paginated audit records with actor name
    const selectQuery = `
      SELECT 
        a.audit_log_id,
        a.tenant_id,
        a.performed_by_user_id,
        u.full_name AS performed_by_name,
        u.email_address AS performed_by_email,
        u.role_name AS performed_by_role,
        a.action_type,
        a.target_resource_type,
        a.target_resource_id,
        a.action_details_json,
        a.client_ip_address,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.performed_by_user_id = u.user_id
      WHERE ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [auditLogs] = await pool.query(selectQuery, [...queryParams, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        audit_logs: auditLogs,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
