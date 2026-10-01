CREATE TABLE IF NOT EXISTS admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS forms (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    fields_json JSON NOT NULL,
    whatsapp_message TEXT NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    form_id BIGINT UNSIGNED NOT NULL,
    form_title VARCHAR(150) NOT NULL,
    values_json JSON NOT NULL,
    reply_email VARCHAR(254) NULL,
    consent_text TEXT NOT NULL,
    consent_accepted TINYINT(1) NOT NULL,
    privacy_url VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL,
    submission_hash CHAR(64) NOT NULL UNIQUE,
    email_status VARCHAR(12) NOT NULL DEFAULT 'pending',
    email_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    email_attempted_at DATETIME NULL,
    email_sent_at DATETIME NULL,
    CONSTRAINT fk_leads_form FOREIGN KEY (form_id) REFERENCES forms(id),
    INDEX idx_leads_form_date (form_id, created_at),
    INDEX idx_leads_date (created_at),
    INDEX idx_leads_mail (email_status, email_attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
    bucket CHAR(64) PRIMARY KEY,
    window_start BIGINT UNSIGNED NOT NULL,
    hits INT UNSIGNED NOT NULL DEFAULT 1,
    INDEX idx_rate_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
