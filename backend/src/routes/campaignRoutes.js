const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/rbacMiddleware');
const recordAuditLog = require('../utils/auditLogger');

const router = express.Router();

// All campaign routes require authentication
router.use(authenticateToken);

// Valid status transitions state machine
const ALLOWED_STATUS_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

// Lists campaigns for the authenticated tenant with pagination, search, and status filters
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { status, search } = req.query;

    const whereClauses = ['c.tenant_id = ?'];
    const queryParams = [tenantId];

    if (status && status.trim()) {
      whereClauses.push('c.campaign_status = ?');
      queryParams.push(status.trim().toUpperCase());
    }

    if (search && search.trim()) {
      whereClauses.push('(c.campaign_name LIKE ? OR c.campaign_description LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count query for pagination metadata
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM campaigns c WHERE ${whereSql}`,
      queryParams
    );
    const totalRecords = countResult[0].total;

    // Fetch paginated campaigns with creator name and assigned user counts
    const selectQuery = `
      SELECT 
        c.campaign_id,
        c.tenant_id,
        c.campaign_name,
        c.campaign_description,
        c.campaign_status,
        c.start_date,
        c.end_date,
        c.created_by_user_id,
        u.full_name AS created_by_name,
        c.created_at,
        c.updated_at,
        COUNT(cua.assignment_id) AS assigned_users_count
      FROM campaigns c
      LEFT JOIN users u ON c.created_by_user_id = u.user_id
      LEFT JOIN campaign_user_assignments cua ON c.campaign_id = cua.campaign_id
      WHERE ${whereSql}
      GROUP BY c.campaign_id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [campaigns] = await pool.query(selectQuery, [...queryParams, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        campaigns,
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

// Retrieves single campaign details along with assigned members
// Strictly enforces tenant isolation: returns 404 if campaign belongs to another tenant
router.get('/:id', async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const tenantId = req.user.tenant_id;

    if (isNaN(campaignId)) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
    }

    const query = `
      SELECT 
        c.campaign_id,
        c.tenant_id,
        c.campaign_name,
        c.campaign_description,
        c.campaign_status,
        c.start_date,
        c.end_date,
        c.created_by_user_id,
        u.full_name AS created_by_name,
        u.email_address AS created_by_email,
        c.created_at,
        c.updated_at
      FROM campaigns c
      LEFT JOIN users u ON c.created_by_user_id = u.user_id
      WHERE c.campaign_id = ? AND c.tenant_id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [campaignId, tenantId]);

    if (rows.length === 0) {
      // Return 404 to avoid disclosing whether the campaign exists in another tenant
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Fetch assigned users for this campaign
    const assignmentsQuery = `
      SELECT 
        cua.assignment_id,
        cua.user_id,
        u.full_name,
        u.email_address,
        u.role_name,
        cua.assigned_at
      FROM campaign_user_assignments cua
      JOIN users u ON cua.user_id = u.user_id
      WHERE cua.campaign_id = ? AND cua.tenant_id = ?
      ORDER BY cua.assigned_at DESC
    `;

    const [assignedUsers] = await pool.query(assignmentsQuery, [campaignId, tenantId]);

    const campaign = rows[0];
    campaign.assigned_users = assignedUsers;

    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    next(error);
  }
});

// Creates a new campaign scoped to the user's tenant (ADMIN & MANAGER only)
router.post('/', authorizeRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { campaign_name, campaign_description, start_date, end_date, campaign_status } = req.body;
    const tenantId = req.user.tenant_id;
    const userId = req.user.user_id;

    if (!campaign_name || !campaign_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name is required'
      });
    }

    const initialStatus = campaign_status || 'DRAFT';
    if (!['DRAFT', 'ACTIVE'].includes(initialStatus)) {
      return res.status(400).json({
        success: false,
        message: "New campaigns must start with 'DRAFT' or 'ACTIVE' status"
      });
    }

    const insertQuery = `
      INSERT INTO campaigns (
        tenant_id,
        campaign_name,
        campaign_description,
        campaign_status,
        start_date,
        end_date,
        created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertQuery, [
      tenantId,
      campaign_name.trim(),
      campaign_description ? campaign_description.trim() : null,
      initialStatus,
      start_date || null,
      end_date || null,
      userId
    ]);

    const newCampaignId = result.insertId;

    // Record creation in audit log
    await recordAuditLog(req, {
      action_type: 'CAMPAIGN_CREATED',
      target_resource_type: 'CAMPAIGN',
      target_resource_id: String(newCampaignId),
      action_details_json: {
        campaign_name: campaign_name.trim(),
        status: initialStatus
      }
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: {
        campaign_id: newCampaignId,
        campaign_name: campaign_name.trim(),
        campaign_status: initialStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

// Updates campaign details and validates status transition rules (ADMIN & MANAGER only)
router.put('/:id', authorizeRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const tenantId = req.user.tenant_id;
    const { campaign_name, campaign_description, campaign_status, start_date, end_date } = req.body;

    if (isNaN(campaignId)) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
    }

    // Verify campaign exists in this tenant
    const [existingRows] = await pool.query(
      'SELECT * FROM campaigns WHERE campaign_id = ? AND tenant_id = ?',
      [campaignId, tenantId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const currentCampaign = existingRows[0];

    // Validate status transition if status is being updated
    if (campaign_status && campaign_status !== currentCampaign.campaign_status) {
      const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentCampaign.campaign_status] || [];

      if (!allowedNextStatuses.includes(campaign_status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition: Cannot change status from '${currentCampaign.campaign_status}' to '${campaign_status}'. Allowed transitions: [${allowedNextStatuses.join(', ')}]`
        });
      }
    }

    const updatedName = campaign_name !== undefined ? campaign_name.trim() : currentCampaign.campaign_name;
    const updatedDesc = campaign_description !== undefined ? campaign_description : currentCampaign.campaign_description;
    const updatedStatus = campaign_status || currentCampaign.campaign_status;
    const updatedStart = start_date !== undefined ? start_date : currentCampaign.start_date;
    const updatedEnd = end_date !== undefined ? end_date : currentCampaign.end_date;

    const updateQuery = `
      UPDATE campaigns SET
        campaign_name = ?,
        campaign_description = ?,
        campaign_status = ?,
        start_date = ?,
        end_date = ?
      WHERE campaign_id = ? AND tenant_id = ?
    `;

    await pool.query(updateQuery, [
      updatedName,
      updatedDesc,
      updatedStatus,
      updatedStart || null,
      updatedEnd || null,
      campaignId,
      tenantId
    ]);

    // Record update in audit log
    await recordAuditLog(req, {
      action_type: 'CAMPAIGN_UPDATED',
      target_resource_type: 'CAMPAIGN',
      target_resource_id: String(campaignId),
      action_details_json: {
        previous_status: currentCampaign.campaign_status,
        new_status: updatedStatus,
        campaign_name: updatedName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: {
        campaign_id: campaignId,
        campaign_name: updatedName,
        campaign_status: updatedStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

// Deletes a campaign (ADMIN only)
router.delete('/:id', authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const tenantId = req.user.tenant_id;

    if (isNaN(campaignId)) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
    }

    // Verify campaign belongs to this tenant
    const [rows] = await pool.query(
      'SELECT campaign_id, campaign_name FROM campaigns WHERE campaign_id = ? AND tenant_id = ?',
      [campaignId, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = rows[0];

    // Delete campaign (foreign key ON DELETE CASCADE clears assignments)
    await pool.query('DELETE FROM campaigns WHERE campaign_id = ? AND tenant_id = ?', [
      campaignId,
      tenantId
    ]);

    // Record deletion in audit log
    await recordAuditLog(req, {
      action_type: 'CAMPAIGN_DELETED',
      target_resource_type: 'CAMPAIGN',
      target_resource_id: String(campaignId),
      action_details_json: { campaign_name: campaign.campaign_name }
    });

    res.status(200).json({
      success: true,
      message: `Campaign '${campaign.campaign_name}' has been deleted`
    });
  } catch (error) {
    next(error);
  }
});

// Assigns a tenant user to a campaign (ADMIN & MANAGER only)
router.post('/:id/assignments', authorizeRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const { user_id } = req.body;
    const tenantId = req.user.tenant_id;
    const assignedByUserId = req.user.user_id;

    if (isNaN(campaignId) || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'Valid campaign ID and user_id are required'
      });
    }

    // Verify campaign exists in user's tenant
    const [campaignRows] = await pool.query(
      'SELECT campaign_id, campaign_name FROM campaigns WHERE campaign_id = ? AND tenant_id = ?',
      [campaignId, tenantId]
    );

    if (campaignRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Strictly verify target user belongs to the SAME tenant
    const [userRows] = await pool.query(
      'SELECT user_id, full_name, email_address FROM users WHERE user_id = ? AND tenant_id = ?',
      [user_id, tenantId]
    );

    if (userRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign user: Target user does not belong to your organization'
      });
    }

    const targetUser = userRows[0];

    // Insert assignment
    const assignQuery = `
      INSERT INTO campaign_user_assignments (tenant_id, campaign_id, user_id, assigned_by_user_id)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.query(assignQuery, [
      tenantId,
      campaignId,
      user_id,
      assignedByUserId
    ]);

    // Record assignment in audit log
    await recordAuditLog(req, {
      action_type: 'USER_ASSIGNED_TO_CAMPAIGN',
      target_resource_type: 'CAMPAIGN',
      target_resource_id: String(campaignId),
      action_details_json: {
        assigned_user_id: user_id,
        assigned_user_name: targetUser.full_name
      }
    });

    res.status(201).json({
      success: true,
      message: `User '${targetUser.full_name}' assigned to campaign successfully`,
      data: {
        assignment_id: result.insertId,
        campaign_id: campaignId,
        user_id: targetUser.user_id,
        full_name: targetUser.full_name
      }
    });
  } catch (error) {
    next(error);
  }
});

// Removes a user assignment from a campaign (ADMIN & MANAGER only)
router.delete('/:id/assignments/:userId', authorizeRoles('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const campaignId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    const tenantId = req.user.tenant_id;

    if (isNaN(campaignId) || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid campaign or user ID' });
    }

    const deleteQuery = `
      DELETE FROM campaign_user_assignments 
      WHERE campaign_id = ? AND user_id = ? AND tenant_id = ?
    `;

    const [result] = await pool.query(deleteQuery, [campaignId, targetUserId, tenantId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found for this campaign'
      });
    }

    // Record removal in audit log
    await recordAuditLog(req, {
      action_type: 'USER_REMOVED_FROM_CAMPAIGN',
      target_resource_type: 'CAMPAIGN',
      target_resource_id: String(campaignId),
      action_details_json: { removed_user_id: targetUserId }
    });

    res.status(200).json({
      success: true,
      message: 'User removed from campaign successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
