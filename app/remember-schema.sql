CREATE TABLE IF NOT EXISTS bf_remember_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    actor VARCHAR(32) NOT NULL,
    auth_version CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_remember_expiry (expires_at),
    INDEX idx_remember_actor (actor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
