const pool = require('../config/database');

// Logs security and administrative actions to audit_logs table
const recordAuditLog = async (req, {
  action_type,
  target_resource_type,
  target_resource_id = null,
  action_details_json = null
}) => {
  try {
    const tenant_id = req.user?.tenant_id;
    const user_id = req.user?.user_id || null;
    const client_ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

    if (!tenant_id) {
      console.warn('[AuditLog] Action skipped: tenant_id not available in request context');
      return;
    }

    const query = `
      INSERT INTO audit_logs (
        tenant_id,
        performed_by_user_id,
        action_type,
        target_resource_type,
        target_resource_id,
        action_details_json,
        client_ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const details = action_details_json ? JSON.stringify(action_details_json) : null;

    await pool.query(query, [
      tenant_id,
      user_id,
      action_type,
      target_resource_type,
      target_resource_id ? String(target_resource_id) : null,
      details,
      client_ip
    ]);
  } catch (error) {
    // Log failure locally so it does not interrupt the main request flow
    console.error('[AuditLog Error]:', error.message);
  }
};

module.exports = recordAuditLog;
