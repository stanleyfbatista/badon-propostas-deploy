CREATE TABLE IF NOT EXISTS bf_tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    workspace_id BIGINT UNSIGNED NOT NULL,
    creator VARCHAR(32) NOT NULL,
    create_key CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    visibility VARCHAR(12) NOT NULL DEFAULT 'team',
    assignee VARCHAR(32) NULL,
    opportunity_id BIGINT UNSIGNED NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'todo',
    priority VARCHAR(12) NOT NULL DEFAULT 'normal',
    start_date DATE NULL,
    due_date DATE NULL,
    checklist_json MEDIUMTEXT NOT NULL,
    archived TINYINT(1) NOT NULL DEFAULT 0,
    revision INT UNSIGNED NOT NULL DEFAULT 1,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY idx_task_request (workspace_id, creator, create_key),
    INDEX idx_task_due (workspace_id, archived, status, due_date),
    INDEX idx_task_owner (workspace_id, assignee),
    INDEX idx_task_opportunity (opportunity_id),
    CONSTRAINT fk_task_workspace FOREIGN KEY (workspace_id) REFERENCES bf_workspaces(id),
    CONSTRAINT fk_task_opportunity FOREIGN KEY (opportunity_id) REFERENCES bf_opportunities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bf_task_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    actor VARCHAR(32) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_task_history (task_id,id),
    CONSTRAINT fk_task_history FOREIGN KEY (task_id) REFERENCES bf_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
