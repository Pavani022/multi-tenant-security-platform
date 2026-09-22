const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/rbacMiddleware');
const recordAuditLog = require('../utils/auditLogger');

const router = express.Router();

// All event routes require authentication
router.use(authenticateToken);

// Lists tenant security incidents with filtering by severity, status, and pagination
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { severity, status, search } = req.query;

    const whereClauses = ['tenant_id = ?'];
    const queryParams = [tenantId];

    if (severity && severity.trim()) {
      whereClauses.push('severity_level = ?');
      queryParams.push(severity.trim().toUpperCase());
    }

    if (status && status.trim()) {
      whereClauses.push('event_status = ?');
      queryParams.push(status.trim().toUpperCase());
    }

    if (search && search.trim()) {
      whereClauses.push('(event_description LIKE ? OR event_type LIKE ? OR source_ip_address LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count for pagination
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM security_events WHERE ${whereSql}`,
      queryParams
    );
    const totalRecords = countResult[0].total;

    // Fetch paginated events
    const selectQuery = `
      SELECT 
        event_id,
        tenant_id,
        event_type,
        severity_level,
        event_status,
        event_description,
        source_ip_address,
        event_timestamp,
        created_at
      FROM security_events
      WHERE ${whereSql}
      ORDER BY event_timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const [events] = await pool.query(selectQuery, [...queryParams, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        events,
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

// Updates triage status of a security event (ADMIN & MANAGER only)
router.patch('/:id/status', authorizeRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { status, notes } = req.body;
    const tenantId = req.user.tenant_id;

    if (isNaN(eventId) || !status) {
      return res.status(400).json({
        success: false,
        message: 'Valid event ID and target status are required'
      });
    }

    const normalizedStatus = status.trim().toUpperCase();
    const VALID_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED'];

    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: [${VALID_STATUSES.join(', ')}]`
      });
    }

    // Verify event exists within the caller's tenant
    const [existingRows] = await pool.query(
      'SELECT event_id, event_type, event_status FROM security_events WHERE event_id = ? AND tenant_id = ?',
      [eventId, tenantId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Security event not found'
      });
    }

    const currentEvent = existingRows[0];

    await pool.query(
      'UPDATE security_events SET event_status = ? WHERE event_id = ? AND tenant_id = ?',
      [normalizedStatus, eventId, tenantId]
    );

    // Record triage action in audit log
    await recordAuditLog(req, {
      action_type: 'SECURITY_EVENT_TRIAGED',
      target_resource_type: 'SECURITY_EVENT',
      target_resource_id: String(eventId),
      action_details_json: {
        previous_status: currentEvent.event_status,
        new_status: normalizedStatus,
        notes: notes || null
      }
    });

    res.status(200).json({
      success: true,
      message: `Event status updated to '${normalizedStatus}'`,
      data: {
        event_id: eventId,
        event_status: normalizedStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
