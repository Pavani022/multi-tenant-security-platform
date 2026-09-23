-- =====================================================================
-- MULTI-TENANT SECURITY MANAGEMENT PLATFORM
-- SQL Database Schema (MySQL 8.0+)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS multi_tenant_security_platform
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE multi_tenant_security_platform;

-- =====================================================================
-- 1. TENANTS TABLE
-- Represents distinct client companies/organizations using the SaaS platform.
-- All other tables link to this to ensure strict data isolation.
-- =====================================================================
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique internal primary key for the organization',
    tenant_name VARCHAR(150) NOT NULL COMMENT 'Display name of the organization (e.g., Acme Cyber Corp)',
    tenant_slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique URL/identifier slug (e.g., acme-cyber)',
    tenant_status ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Lifecycle state of the organization subscription',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when organization was onboarded',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Auto-updated timestamp on modification'
) ENGINE=InnoDB COMMENT='Organizations / Tenants in the multi-tenant system';

-- =====================================================================
-- 2. USERS TABLE
-- Stores staff members and users for each tenant with Role-Based Access Control.
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique internal primary key for the user',
    tenant_id BIGINT NOT NULL COMMENT 'Foreign key identifying which tenant organization this user belongs to',
    full_name VARCHAR(150) NOT NULL COMMENT 'User full legal or display name',
    email_address VARCHAR(255) NOT NULL COMMENT 'Email used for login (must be unique within each tenant)',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt-hashed password string (never store plain text)',
    role_name ENUM('ADMIN', 'MANAGER', 'USER') NOT NULL DEFAULT 'USER' COMMENT 'RBAC role enforcing permission levels',
    account_status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Allows suspending user access without deleting records',
    last_login_at TIMESTAMP NULL DEFAULT NULL COMMENT 'Audit field tracking latest login activity',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when user account was created',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Auto-updated timestamp on modification',
    
    -- Foreign Key Constraints
    CONSTRAINT fk_users_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    -- Indexes & Unique Constraints
    CONSTRAINT uq_tenant_email UNIQUE (tenant_id, email_address),
    INDEX idx_users_tenant_role (tenant_id, role_name)
) ENGINE=InnoDB COMMENT='User accounts scoped strictly by tenant with RBAC';

-- =====================================================================
-- 3. CAMPAIGNS TABLE
-- Security campaigns (e.g., Phishing simulations, Security awareness, Vulnerability audits).
-- =====================================================================
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique internal primary key for the campaign',
    tenant_id BIGINT NOT NULL COMMENT 'Foreign key binding this campaign strictly to a tenant',
    campaign_name VARCHAR(200) NOT NULL COMMENT 'Descriptive title of the security campaign',
    campaign_description TEXT NULL COMMENT 'Detailed explanation, instructions, and objectives of the campaign',
    campaign_status ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT' COMMENT 'State machine status enforcing transition rules',
    start_date DATE NULL DEFAULT NULL COMMENT 'Scheduled or actual launch date',
    end_date DATE NULL DEFAULT NULL COMMENT 'Scheduled or actual completion date',
    created_by_user_id BIGINT NOT NULL COMMENT 'User ID of the manager/admin who created this campaign',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when campaign was drafted',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Auto-updated timestamp on modification',

    -- Foreign Key Constraints
    CONSTRAINT fk_campaigns_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_campaigns_creator
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    -- Indexes for high-performance tenant-isolated queries
    INDEX idx_campaigns_tenant_status (tenant_id, campaign_status),
    INDEX idx_campaigns_tenant_created (tenant_id, created_at DESC)
) ENGINE=InnoDB COMMENT='Security campaigns managed per tenant';

-- =====================================================================
-- 4. CAMPAIGN_USER_ASSIGNMENTS TABLE
-- Junction table assigning specific tenant users to a campaign.
-- =====================================================================
CREATE TABLE IF NOT EXISTS campaign_user_assignments (
    assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique primary key for the assignment record',
    tenant_id BIGINT NOT NULL COMMENT 'Tenant ID redundancy to guarantee cross-tenant users cannot be assigned',
    campaign_id BIGINT NOT NULL COMMENT 'Foreign key to the target campaign',
    user_id BIGINT NOT NULL COMMENT 'Foreign key to the assigned user',
    assigned_by_user_id BIGINT NOT NULL COMMENT 'User ID of the manager/admin who made the assignment',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when user was assigned',

    -- Foreign Key Constraints
    CONSTRAINT fk_assign_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assign_campaign
        FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assign_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_assign_assigner
        FOREIGN KEY (assigned_by_user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    -- Ensures a user cannot be assigned twice to the same campaign
    CONSTRAINT uq_campaign_user UNIQUE (campaign_id, user_id),
    INDEX idx_assignments_tenant_user (tenant_id, user_id)
) ENGINE=InnoDB COMMENT='Mapping between campaigns and assigned users';

-- =====================================================================
-- 5. SECURITY_EVENTS TABLE
-- Live security threats and incidents detected for the tenant organization.
-- =====================================================================
CREATE TABLE IF NOT EXISTS security_events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique primary key for the security event',
    tenant_id BIGINT NOT NULL COMMENT 'Tenant ID identifying where the security incident occurred',
    event_type VARCHAR(100) NOT NULL COMMENT 'Classification (e.g., PHISHING_CLICK, BRUTE_FORCE, MALWARE_DETECTED, UNAUTHORIZED_IP)',
    severity_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM' COMMENT 'Threat severity level for prioritization',
    event_status ENUM('OPEN', 'INVESTIGATING', 'RESOLVED') NOT NULL DEFAULT 'OPEN' COMMENT 'Incident triage workflow status',
    event_description TEXT NOT NULL COMMENT 'Detailed technical description and evidence payload of the event',
    source_ip_address VARCHAR(45) NULL DEFAULT NULL COMMENT 'IPv4 or IPv6 address associated with the event',
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the security incident actually occurred',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When this record was ingested into the database',

    -- Foreign Key Constraints
    CONSTRAINT fk_events_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    -- Indexes for fast filtering by status, severity, and time within tenant
    INDEX idx_events_tenant_sev_stat (tenant_id, severity_level, event_status),
    INDEX idx_events_tenant_timestamp (tenant_id, event_timestamp DESC)
) ENGINE=InnoDB COMMENT='Security incidents and alerts monitored per tenant';

-- =====================================================================
-- 6. AUDIT_LOGS TABLE
-- Immutable trail of critical administrative actions and access events.
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_log_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique primary key for the audit log entry',
    tenant_id BIGINT NOT NULL COMMENT 'Tenant organization where the action took place',
    performed_by_user_id BIGINT NULL DEFAULT NULL COMMENT 'User who executed the action (NULL for system/auth failures)',
    action_type VARCHAR(100) NOT NULL COMMENT 'Code for action (e.g., USER_LOGIN, CAMPAIGN_CREATED, USER_ASSIGNED)',
    target_resource_type VARCHAR(50) NOT NULL COMMENT 'Resource modified: CAMPAIGN, USER, SECURITY_EVENT, AUTH',
    target_resource_id VARCHAR(50) NULL DEFAULT NULL COMMENT 'Primary key of the affected resource',
    action_details_json JSON NULL DEFAULT NULL COMMENT 'Structured JSON with extra context (old values, new values, parameters)',
    client_ip_address VARCHAR(45) NULL DEFAULT NULL COMMENT 'IP address of the client triggering the request',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Immutable creation timestamp',

    -- Foreign Key Constraints
    CONSTRAINT fk_audit_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    -- Indexes for fast filtering and pagination in the audit log viewer
    INDEX idx_audit_tenant_created (tenant_id, created_at DESC),
    INDEX idx_audit_tenant_action (tenant_id, action_type)
) ENGINE=InnoDB COMMENT='Immutable security and compliance audit trail';
