CREATE TABLE IF NOT EXISTS bf_profiles (
    actor VARCHAR(32) PRIMARY KEY,
    name VARCHAR(150) NOT NULL DEFAULT '',
    phone VARCHAR(40) NOT NULL DEFAULT '',
    appearance VARCHAR(8) NOT NULL DEFAULT 'light',
    avatar MEDIUMBLOB NULL,
    avatar_mime VARCHAR(30) NULL,
    avatar_version CHAR(16) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bf_opportunities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT UNSIGNED NOT NULL,
    lead_id BIGINT UNSIGNED NULL UNIQUE,
    create_key VARCHAR(64) NULL,
    name VARCHAR(150) NOT NULL,
    company VARCHAR(150) NOT NULL DEFAULT '',
    document VARCHAR(25) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    phone VARCHAR(40) NOT NULL DEFAULT '',
    stage VARCHAR(24) NOT NULL DEFAULT 'new',
    assignee VARCHAR(32) NULL,
    amount DECIMAL(13,2) NOT NULL DEFAULT 0,
    source VARCHAR(150) NOT NULL DEFAULT 'Manual',
    notes TEXT NOT NULL,
    next_action VARCHAR(200) NOT NULL DEFAULT '',
    scheduled_at DATETIME NULL,
    last_contact_at DATETIME NULL,
    revision INT UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_crm_workspace FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id),
    CONSTRAINT fk_crm_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    UNIQUE KEY idx_crm_request (workspace_id, create_key),
    INDEX idx_crm_stage (workspace_id, stage),
    INDEX idx_crm_schedule (workspace_id, scheduled_at),
    INDEX idx_crm_created (workspace_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bf_crm_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT UNSIGNED NOT NULL,
    actor VARCHAR(32) NULL,
    message VARCHAR(2000) NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_crm_event FOREIGN KEY (opportunity_id) REFERENCES bf_opportunities(id) ON DELETE CASCADE,
    INDEX idx_crm_history (opportunity_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
