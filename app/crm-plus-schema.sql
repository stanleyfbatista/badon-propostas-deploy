-- Additive CRM expansion: no alteration, deletion or automatic merging of legacy records.
CREATE TABLE IF NOT EXISTS bf_crm_companies (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(150) NOT NULL,
 document VARCHAR(25) NOT NULL DEFAULT '',
 email VARCHAR(254) NOT NULL DEFAULT '',
 phone VARCHAR(40) NOT NULL DEFAULT '',
 notes TEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 create_key VARCHAR(64) NOT NULL,
 created_at DATETIME NOT NULL,
 updated_at DATETIME NOT NULL,
 FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id),
 UNIQUE KEY crm_company_request (workspace_id,create_key),
 INDEX crm_company_name (workspace_id,name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS bf_crm_contacts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 company_id BIGINT UNSIGNED NULL,
 name VARCHAR(150) NOT NULL,
 job_title VARCHAR(150) NOT NULL DEFAULT '',
 email VARCHAR(254) NOT NULL DEFAULT '',
 phone VARCHAR(40) NOT NULL DEFAULT '',
 notes TEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 create_key VARCHAR(64) NOT NULL,
 created_at DATETIME NOT NULL,
 updated_at DATETIME NOT NULL,
 FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id),
 FOREIGN KEY (company_id) REFERENCES bf_crm_companies(id),
 UNIQUE KEY crm_contact_request (workspace_id,create_key),
 INDEX crm_contact_name (workspace_id,name),
 INDEX crm_contact_company (workspace_id,company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS bf_crm_details (
 opportunity_id BIGINT UNSIGNED PRIMARY KEY,
 company_id BIGINT UNSIGNED NULL,
 contact_id BIGINT UNSIGNED NULL,
 service VARCHAR(150) NOT NULL DEFAULT '',
 expected_close DATE NULL,
 loss_reason VARCHAR(1000) NOT NULL DEFAULT '',
 FOREIGN KEY (opportunity_id) REFERENCES bf_opportunities(id) ON DELETE CASCADE,
 FOREIGN KEY (company_id) REFERENCES bf_crm_companies(id),
 FOREIGN KEY (contact_id) REFERENCES bf_crm_contacts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS bf_crm_activities (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 opportunity_id BIGINT UNSIGNED NOT NULL,
 kind VARCHAR(12) NOT NULL,
 subject VARCHAR(200) NOT NULL,
 body TEXT NOT NULL,
 due_at DATETIME NULL,
 completed_at DATETIME NULL,
 actor VARCHAR(32) NOT NULL,
 create_key VARCHAR(64) NOT NULL,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (opportunity_id) REFERENCES bf_opportunities(id) ON DELETE CASCADE,
 UNIQUE KEY crm_activity_request (opportunity_id,create_key),
 INDEX crm_activity_due (opportunity_id,completed_at,due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS bf_crm_views (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 actor VARCHAR(32) NOT NULL,
 name VARCHAR(80) NOT NULL,
 filters_json TEXT NOT NULL,
 FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id),
 UNIQUE KEY crm_view_name (workspace_id,actor,name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
