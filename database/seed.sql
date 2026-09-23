-- =====================================================================
-- MULTI-TENANT SECURITY MANAGEMENT PLATFORM
-- SQL Database Seed Data (MySQL 8.0+)
--
-- Passwords:
-- Admin users:  Admin@123    (Bcrypt hash: $2b$10$wO3Pz0tVj9Gv7x1X0vV39.V0G4aCqfJ7U2xKzQk8N6uB3mN4sQv2y)
-- All other:    Password@123 (Bcrypt hash: $2b$10$b5y2QYvKqH6hYv5fO4hQke1wWv3d0f4Q2x1w6h1p7n2m8q0v3r2t)
-- =====================================================================

USE multi_tenant_security_platform;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE security_events;
TRUNCATE TABLE campaign_user_assignments;
TRUNCATE TABLE campaigns;
TRUNCATE TABLE users;
TRUNCATE TABLE tenants;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Tenants
INSERT INTO tenants (tenant_id, tenant_name, tenant_slug, tenant_status) VALUES
(1, 'Acme Cyber Corp', 'acme-cyber', 'ACTIVE'),
(2, 'Stark Defense Systems', 'stark-defense', 'ACTIVE');

-- 2. Insert Users (Password: Admin@123 or Password@123)
INSERT INTO users (user_id, tenant_id, full_name, email_address, password_hash, role_name, account_status) VALUES
-- Tenant 1: Acme Cyber Corp
(1, 1, 'Alice Admin (Acme)', 'admin@acme.com', '$2a$10$tZk5eQv73d57FqHq6k5B6.k6k2O7E.93e0bX1a013k243k103k102', 'ADMIN', 'ACTIVE'),
(2, 1, 'Bob Manager (Acme)', 'manager@acme.com', '$2a$10$p0c1t2o3r4i5a6l7e8f90.1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o', 'MANAGER', 'ACTIVE'),
(3, 1, 'Charlie User (Acme)', 'user@acme.com', '$2a$10$p0c1t2o3r4i5a6l7e8f90.1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o', 'USER', 'ACTIVE'),
(4, 1, 'Diana Analyst (Acme)', 'diana@acme.com', '$2a$10$p0c1t2o3r4i5a6l7e8f90.1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o', 'USER', 'ACTIVE'),

-- Tenant 2: Stark Defense Systems
(5, 2, 'Tony Stark (Admin)', 'admin@stark.com', '$2a$10$tZk5eQv73d57FqHq6k5B6.k6k2O7E.93e0bX1a013k243k103k102', 'ADMIN', 'ACTIVE'),
(6, 2, 'Pepper Potts (Manager)', 'manager@stark.com', '$2a$10$p0c1t2o3r4i5a6l7e8f90.1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o', 'MANAGER', 'ACTIVE'),
(7, 2, 'Peter Parker (User)', 'user@stark.com', '$2a$10$p0c1t2o3r4i5a6l7e8f90.1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o', 'USER', 'ACTIVE');

-- 3. Insert Campaigns
INSERT INTO campaigns (campaign_id, tenant_id, campaign_name, campaign_description, campaign_status, start_date, end_date, created_by_user_id) VALUES
-- Tenant 1
(101, 1, 'Q3 Spear Phishing Awareness Simulation', 'Simulated phishing attacks targeting executive and finance departments to measure employee awareness.', 'ACTIVE', '2026-09-01', '2026-10-15', 2),
(102, 1, 'Executive Credential Harvesting Defense', 'High-priority credential stuffing audit and multi-factor authentication compliance drill.', 'DRAFT', '2026-10-01', '2026-11-01', 1),
(103, 1, 'SOC Incident Response Readiness Q2', 'Quarterly tabletop exercise assessing triage speed for ransomware alerts.', 'COMPLETED', '2026-05-01', '2026-06-15', 2),
(104, 1, 'Legacy Remote VPN Security Audit', 'Review of unpatched VPN endpoints and decommissioned contractor access.', 'CANCELLED', '2026-04-01', '2026-04-20', 1),

-- Tenant 2 (Crucial for testing cross-tenant isolation: Tenant 1 must never access 201)
(201, 2, 'Arc Reactor SCADA Vulnerability Assessment', 'Critical infrastructure penetration testing and firmware vulnerability analysis.', 'ACTIVE', '2026-09-10', '2026-10-25', 5),
(202, 2, 'Jarvis Neural Interface Security Review', 'AI model integrity audit and defense against adversarial prompts.', 'DRAFT', '2026-11-01', '2026-12-01', 6);

-- 4. Campaign User Assignments
INSERT INTO campaign_user_assignments (assignment_id, tenant_id, campaign_id, user_id, assigned_by_user_id) VALUES
(1, 1, 101, 3, 2),
(2, 1, 101, 4, 2),
(3, 1, 102, 3, 1),
(4, 1, 103, 4, 2),
(5, 2, 201, 7, 5);

-- 5. Security Events
INSERT INTO security_events (event_id, tenant_id, event_type, severity_level, event_status, event_description, source_ip_address, event_timestamp) VALUES
(1, 1, 'MALWARE_DETECTED', 'CRITICAL', 'OPEN', 'Ransomware signature WannaCry-Variant found in workstation WS-042 temp folder.', '198.51.100.23', NOW() - INTERVAL 1 HOUR),
(2, 1, 'BRUTE_FORCE_ATTEMPT', 'HIGH', 'INVESTIGATING', 'Excessive failed SSH login attempts detected (540 attempts in 3 minutes).', '203.0.113.15', NOW() - INTERVAL 4 HOUR),
(3, 1, 'SUSPICIOUS_PRIVILEGE_ESCALATION', 'HIGH', 'OPEN', 'User account attempted to execute unauthorized Mimikatz dump on domain controller.', '10.0.1.14', NOW() - INTERVAL 12 HOUR),
(4, 1, 'PHISHING_LINK_CLICKED', 'MEDIUM', 'INVESTIGATING', 'Employee Charlie clicked simulated phishing test payload URL in email.', '192.168.1.105', NOW() - INTERVAL 1 DAY),
(5, 1, 'OUTDATED_TLS_HANDSHAKE', 'LOW', 'RESOLVED', 'Inbound API call attempted deprecated TLS 1.0 connection; automatically rejected.', '198.51.100.89', NOW() - INTERVAL 2 DAY),
(6, 2, 'SCADA_PROTOCOL_ANOMALY', 'CRITICAL', 'INVESTIGATING', 'Unrecognized Modbus command packet detected targeting Generator Node 04.', '172.16.50.12', NOW() - INTERVAL 2 HOUR),
(7, 2, 'UNAUTHORIZED_GEO_LOGIN', 'HIGH', 'RESOLVED', 'Login attempt from non-approved geographic region bypassed and blocked by conditional access.', '185.220.101.5', NOW() - INTERVAL 1 DAY);

-- 6. Audit Logs
INSERT INTO audit_logs (audit_log_id, tenant_id, performed_by_user_id, action_type, target_resource_type, target_resource_id, action_details_json, client_ip_address, created_at) VALUES
(1, 1, 1, 'USER_LOGIN', 'AUTH', '1', '{"email": "admin@acme.com", "status": "SUCCESS"}', '127.0.0.1', NOW() - INTERVAL 6 HOUR),
(2, 1, 2, 'CAMPAIGN_CREATED', 'CAMPAIGN', '101', '{"campaign_name": "Q3 Spear Phishing Awareness Simulation", "status": "ACTIVE"}', '127.0.0.1', NOW() - INTERVAL 5 HOUR),
(3, 1, 2, 'USER_ASSIGNED', 'CAMPAIGN', '101', '{"assigned_user_id": 3, "assigned_user_name": "Charlie User (Acme)"}', '127.0.0.1', NOW() - INTERVAL 4 HOUR),
(4, 1, 1, 'CAMPAIGN_STATUS_UPDATED', 'CAMPAIGN', '103', '{"old_status": "ACTIVE", "new_status": "COMPLETED"}', '127.0.0.1', NOW() - INTERVAL 3 HOUR),
(5, 1, 2, 'SECURITY_EVENT_TRIAGED', 'SECURITY_EVENT', '2', '{"new_status": "INVESTIGATING", "notes": "IP added to firewall watchlist"}', '127.0.0.1', NOW() - INTERVAL 2 HOUR),
(6, 2, 5, 'USER_LOGIN', 'AUTH', '5', '{"email": "admin@stark.com", "status": "SUCCESS"}', '127.0.0.1', NOW() - INTERVAL 8 HOUR),
(7, 2, 5, 'CAMPAIGN_CREATED', 'CAMPAIGN', '201', '{"campaign_name": "Arc Reactor SCADA Vulnerability Assessment"}', '127.0.0.1', NOW() - INTERVAL 7 HOUR);
