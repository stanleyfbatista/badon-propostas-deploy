CREATE TABLE IF NOT EXISTS bf_flow_clients (
 workspace_id BIGINT UNSIGNED PRIMARY KEY,
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 create_key CHAR(36) NULL UNIQUE,
 contact VARCHAR(150) NOT NULL DEFAULT '',
 email VARCHAR(254) NOT NULL DEFAULT '',
 phone VARCHAR(40) NOT NULL DEFAULT '',
 document VARCHAR(25) NOT NULL DEFAULT '',
 email_key VARCHAR(254) NULL UNIQUE,
 document_key VARCHAR(25) NULL UNIQUE,
 active TINYINT(1) NOT NULL DEFAULT 1,
 details_json MEDIUMTEXT NOT NULL,
 created_at DATETIME NOT NULL,
 updated_at DATETIME NOT NULL,
 FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bf_flow_files (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 task_id BIGINT UNSIGNED NULL,
 name VARCHAR(180) NOT NULL,
 mime VARCHAR(60) NOT NULL,
 content MEDIUMBLOB NOT NULL,
 byte_size INT UNSIGNED NOT NULL,
 actor VARCHAR(32) NOT NULL,
 created_at DATETIME NOT NULL,
 KEY flow_file_workspace (workspace_id),
 FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id),
 FOREIGN KEY (task_id) REFERENCES bf_tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bf_flow_sales (
 opportunity_id BIGINT UNSIGNED PRIMARY KEY,
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 state VARCHAR(20) NOT NULL DEFAULT 'approval',
 client_workspace_id BIGINT UNSIGNED NULL,
 approved_by VARCHAR(32) NULL,
 approved_at DATETIME NULL,
 approved_amount DECIMAL(13,2) NULL,
 approved_identity CHAR(64) NULL,
 payment_reference VARCHAR(200) NOT NULL DEFAULT '',
 paid_by VARCHAR(32) NULL,
 paid_at DATETIME NULL,
 created_at DATETIME NOT NULL,
 updated_at DATETIME NOT NULL,
 FOREIGN KEY (opportunity_id) REFERENCES bf_opportunities(id),
 FOREIGN KEY (client_workspace_id) REFERENCES bf_workspaces(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bf_flow_projects (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 workspace_id BIGINT UNSIGNED NOT NULL,
 create_key CHAR(36) NOT NULL,
 name VARCHAR(150) NOT NULL,
 description TEXT NOT NULL,
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL,
 UNIQUE KEY flow_project_request (workspace_id, create_key),
 FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
