const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authMiddleware');

const router = express.Router();

// Dashboard routes require authentication
router.use(authenticateToken);

// Returns aggregated high-level security metrics and activity for the tenant
router.get('/metrics', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    // Parallel metric queries scoped strictly by tenant_id
    const [
      [userCountRow],
      [campaignStats],
      [eventStats],
      [recentActivity]
    ] = await Promise.all([
      // Total active users
      pool.query(
        'SELECT COUNT(*) AS total_users FROM users WHERE tenant_id = ? AND account_status = "ACTIVE"',
        [tenantId]
      ),
      // Campaign breakdown
      pool.query(`
        SELECT 
          COUNT(*) AS total_campaigns,
          SUM(CASE WHEN campaign_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_campaigns,
          SUM(CASE WHEN campaign_status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_campaigns,
          SUM(CASE WHEN campaign_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_campaigns
        FROM campaigns 
        WHERE tenant_id = ?
      `, [tenantId]),
      // Security event breakdown
      pool.query(`
        SELECT 
          COUNT(*) AS total_events,
          SUM(CASE WHEN event_status = 'OPEN' THEN 1 ELSE 0 END) AS open_events,
          SUM(CASE WHEN event_status = 'INVESTIGATING' THEN 1 ELSE 0 END) AS investigating_events,
          SUM(CASE WHEN severity_level = 'CRITICAL' AND event_status != 'RESOLVED' THEN 1 ELSE 0 END) AS critical_unresolved_events
        FROM security_events
        WHERE tenant_id = ?
      `, [tenantId]),
      // Latest 5 audit events for the live activity feed
      pool.query(`
        SELECT 
          a.audit_log_id,
          a.action_type,
          a.target_resource_type,
          a.target_resource_id,
          a.created_at,
          u.full_name AS performed_by_name
        FROM audit_logs a
        LEFT JOIN users u ON a.performed_by_user_id = u.user_id
        WHERE a.tenant_id = ?
        ORDER BY a.created_at DESC
        LIMIT 5
      `, [tenantId])
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: userCountRow[0].total_users || 0
        },
        campaigns: {
          total: campaignStats[0].total_campaigns || 0,
          active: campaignStats[0].active_campaigns || 0,
          draft: campaignStats[0].draft_campaigns || 0,
          completed: campaignStats[0].completed_campaigns || 0
        },
        security_events: {
          total: eventStats[0].total_events || 0,
          open: eventStats[0].open_events || 0,
          investigating: eventStats[0].investigating_events || 0,
          critical_unresolved: eventStats[0].critical_unresolved_events || 0
        },
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
