/**
 * Multi-Tenant Security Platform - Security & RBAC Verification Test Suite
 * 
 * Verifies:
 * 1. Multi-Tenant Data Isolation (Zero cross-tenant data leakage)
 * 2. Role-Based Access Control (ADMIN, MANAGER, USER)
 * 3. Campaign Lifecycle State Machine Validation
 */

const http = require('http');
const app = require('./src/index');
const pool = require('./src/config/database');

const TEST_PORT = 5002;
let server;

function apiRequest(method, path, token = null, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runSecuritySuite() {
  console.log('====================================================');
  console.log(' DEEP TRACE - SECURITY & RBAC VERIFICATION SUITE');
  console.log('====================================================\n');

  server = app.listen(TEST_PORT);

  try {
    // 1. Authenticate users from both tenants
    console.log('[Step 1] Authenticating Test Personas...');
    const t1AdminRes = await apiRequest('POST', '/api/auth/login', null, { email: 'admin@acme.com', password: 'Admin@123' });
    const t1UserRes = await apiRequest('POST', '/api/auth/login', null, { email: 'user@acme.com', password: 'Password@123' });
    const t2AdminRes = await apiRequest('POST', '/api/auth/login', null, { email: 'admin@stark.com', password: 'Admin@123' });

    const tokenT1Admin = t1AdminRes.body.data.token;
    const tokenT1User = t1UserRes.body.data.token;
    const tokenT2Admin = t2AdminRes.body.data.token;

    console.log(' Authenticated: Tenant 1 Admin (Alice Admin, Acme Cyber Corp)');
    console.log(' Authenticated: Tenant 1 User (Charlie User, Acme Cyber Corp)');
    console.log(' Authenticated: Tenant 2 Admin (Tony Stark, Stark Defense Systems)\n');

    // 2. Mandatory Security Scenario: Cross-Tenant Data Isolation
    console.log('[Step 2] Testing Mandatory Cross-Tenant Isolation Scenario...');
    console.log(' -> Tenant 1 Admin attempts GET /api/campaigns/201 (owned by Tenant 2)');
    const crossTenantGet = await apiRequest('GET', '/api/campaigns/201', tokenT1Admin);

    if (crossTenantGet.status === 404) {
      console.log(' PASS: Returned 404 Not Found (Zero cross-tenant leakage)');
    } else {
      throw new Error(`FAIL: Cross-tenant data leak! Expected 404, received ${crossTenantGet.status}`);
    }

    console.log(' -> Tenant 2 Admin attempts GET /api/campaigns/201 (legitimate owner)');
    const legitimateGet = await apiRequest('GET', '/api/campaigns/201', tokenT2Admin);
    if (legitimateGet.status === 200 && legitimateGet.body.data.campaign_id === 201) {
      console.log(' PASS: Tenant 2 successfully accessed its own resource\n');
    } else {
      throw new Error('FAIL: Legitimate owner could not access campaign 201');
    }

    // 3. RBAC Enforcement Test
    console.log('[Step 3] Testing RBAC Role Enforcement...');
    console.log(' -> USER role attempts POST /api/campaigns (requires ADMIN/MANAGER)');
    const rbacCampaign = await apiRequest('POST', '/api/campaigns', tokenT1User, { campaign_name: 'Hacked Campaign' });
    if (rbacCampaign.status === 403) {
      console.log(' PASS: USER role correctly rejected with 403 Forbidden');
    } else {
      throw new Error(`FAIL: USER role created campaign with status ${rbacCampaign.status}`);
    }

    console.log(' -> USER role attempts GET /api/audit-logs (requires ADMIN/MANAGER)');
    const rbacAudit = await apiRequest('GET', '/api/audit-logs', tokenT1User);
    if (rbacAudit.status === 403) {
      console.log(' PASS: USER role correctly blocked from audit logs with 403 Forbidden\n');
    } else {
      throw new Error(`FAIL: USER role viewed audit logs with status ${rbacAudit.status}`);
    }

    // 4. Campaign State Machine Validation Test
    console.log('[Step 4] Testing Campaign Status Transition Validation...');
    const createCamp = await apiRequest('POST', '/api/campaigns', tokenT1Admin, {
      campaign_name: 'Lifecycle Verification Test',
      campaign_status: 'DRAFT'
    });
    const testCampId = createCamp.body.data.campaign_id;

    console.log(' -> Valid transition: DRAFT -> ACTIVE');
    const validTransition = await apiRequest('PUT', `/api/campaigns/${testCampId}`, tokenT1Admin, { campaign_status: 'ACTIVE' });
    if (validTransition.status === 200) {
      console.log(' PASS: Valid status transition accepted (200 OK)');
    } else {
      throw new Error(`FAIL: Valid transition failed with ${validTransition.status}`);
    }

    console.log(' -> Invalid transition: ACTIVE -> DRAFT (illegal backward jump)');
    const invalidTransition = await apiRequest('PUT', `/api/campaigns/${testCampId}`, tokenT1Admin, { campaign_status: 'DRAFT' });
    if (invalidTransition.status === 400) {
      console.log(' PASS: Invalid transition rejected with 400 Bad Request');
    } else {
      throw new Error(`FAIL: Invalid transition was permitted with ${invalidTransition.status}`);
    }

    // Cleanup
    await apiRequest('DELETE', `/api/campaigns/${testCampId}`, tokenT1Admin);

    console.log('\n====================================================');
    console.log(' ALL SECURITY & TENANT ISOLATION TESTS PASSED (4/4)');
    console.log('====================================================');
  } catch (error) {
    console.error('\n TEST SUITE FAILED:', error.message);
    process.exit(1);
  } finally {
    if (server) server.close();
    await pool.end();
    process.exit(0);
  }
}

runSecuritySuite();
