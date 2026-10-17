CREATE TABLE IF NOT EXISTS bf_google_accounts (
    actor VARCHAR(32) PRIMARY KEY,
    google_sub VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL,
    login_enabled TINYINT(1) NOT NULL DEFAULT 0,
    calendar_enabled TINYINT(1) NOT NULL DEFAULT 0,
    refresh_cipher TEXT NULL,
    calendar_id VARCHAR(255) NULL,
    calendar_creating TINYINT(1) NOT NULL DEFAULT 0,
    last_sync DATETIME NULL,
    sync_error VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bf_google_events (
    actor VARCHAR(32) NOT NULL,
    task_id BIGINT UNSIGNED NOT NULL,
    event_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    payload_hash CHAR(64) NULL,
    PRIMARY KEY (actor,task_id),
    CONSTRAINT fk_google_account FOREIGN KEY (actor) REFERENCES bf_google_accounts(actor) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
