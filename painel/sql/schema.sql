-- cPanel: selecione no phpMyAdmin o banco ja criado (ex.: meupacks_surebet)
-- e rode este arquivo sem CREATE DATABASE / USE.

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS panel_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NULL,
  document_number VARCHAR(20) NULL,
  phone_number VARCHAR(30) NULL,
  password_hash VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subscription_days INT UNSIGNED NOT NULL DEFAULT 0,
  subscription_expires_at DATETIME NULL,
  subscription_status ENUM('active', 'inactive') NOT NULL DEFAULT 'inactive',
  subscription_access_type ENUM('prematch', 'live', 'full') NOT NULL DEFAULT 'full',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'panel_users'
    AND COLUMN_NAME = 'password_hash'
);
SET @sql_add_col := IF(@col_exists = 0,
  'ALTER TABLE panel_users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email',
  'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'panel_users'
    AND COLUMN_NAME = 'full_name'
);
SET @sql_add_col := IF(@col_exists = 0,
  'ALTER TABLE panel_users ADD COLUMN full_name VARCHAR(255) NULL AFTER email',
  'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'panel_users'
    AND COLUMN_NAME = 'document_number'
);
SET @sql_add_col := IF(@col_exists = 0,
  'ALTER TABLE panel_users ADD COLUMN document_number VARCHAR(20) NULL AFTER full_name',
  'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'panel_users'
    AND COLUMN_NAME = 'phone_number'
);
SET @sql_add_col := IF(@col_exists = 0,
  'ALTER TABLE panel_users ADD COLUMN phone_number VARCHAR(30) NULL AFTER document_number',
  'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @access_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'panel_users'
    AND COLUMN_NAME = 'subscription_access_type'
);
SET @sql_add_col := IF(@access_col_exists = 0,
  'ALTER TABLE panel_users ADD COLUMN subscription_access_type ENUM(''prematch'', ''live'', ''full'') NOT NULL DEFAULT ''full'' AFTER subscription_status',
  'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

CREATE TABLE IF NOT EXISTS panel_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  message VARCHAR(500) NOT NULL,
  context_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_created_at (created_at),
  INDEX idx_logs_category (category)
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type ENUM('income', 'expense') NOT NULL DEFAULT 'income',
  status ENUM('paid', 'pending', 'canceled') NOT NULL DEFAULT 'paid',
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ft_user (user_id),
  INDEX idx_ft_paid_at (paid_at),
  INDEX idx_ft_type_status (type, status),
  CONSTRAINT fk_ft_user FOREIGN KEY (user_id) REFERENCES panel_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS panel_suggestions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_type ENUM('suggestion', 'update') NOT NULL DEFAULT 'suggestion',
  title VARCHAR(200) NOT NULL,
  details TEXT NOT NULL,
  approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  public_status ENUM('em_votacao', 'em_desenvolvimento', 'lancado', 'pausado', 'arquivado') NOT NULL DEFAULT 'em_votacao',
  is_visible TINYINT(1) NOT NULL DEFAULT 0,
  publish_at DATETIME NULL,
  publish_until DATETIME NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_by_email VARCHAR(255) NULL,
  approved_by_admin_id BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_panel_suggestions_public (approval_status, is_visible, public_status, publish_at, publish_until),
  INDEX idx_panel_suggestions_type (entry_type, public_status),
  INDEX idx_panel_suggestions_created_by_user (created_by_user_id),
  CONSTRAINT fk_panel_suggestions_user FOREIGN KEY (created_by_user_id) REFERENCES panel_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_panel_suggestions_admin FOREIGN KEY (approved_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS panel_suggestion_votes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  suggestion_id BIGINT UNSIGNED NOT NULL,
  panel_user_id BIGINT UNSIGNED NOT NULL,
  vote_type ENUM('up', 'down') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_panel_suggestion_vote (suggestion_id, panel_user_id),
  INDEX idx_panel_suggestion_votes_user (panel_user_id),
  CONSTRAINT fk_panel_suggestion_votes_suggestion FOREIGN KEY (suggestion_id) REFERENCES panel_suggestions(id) ON DELETE CASCADE,
  CONSTRAINT fk_panel_suggestion_votes_user FOREIGN KEY (panel_user_id) REFERENCES panel_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_releases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  changelog TEXT NULL,
  status ENUM('draft', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft',
  installer_filename VARCHAR(255) NULL,
  installer_original_name VARCHAR(255) NULL,
  installer_sha512 VARCHAR(180) NULL,
  installer_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  blockmap_filename VARCHAR(255) NULL,
  blockmap_original_name VARCHAR(255) NULL,
  blockmap_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  latest_filename VARCHAR(255) NOT NULL DEFAULT 'latest.yml',
  publish_at DATETIME NULL,
  published_at DATETIME NULL,
  archived_at DATETIME NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_releases_status_publish (status, publish_at),
  INDEX idx_app_releases_published_at (published_at)
);

CREATE TABLE IF NOT EXISTS app_release_downloads (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  release_id BIGINT UNSIGNED NULL,
  version VARCHAR(50) NOT NULL,
  file_kind ENUM('installer', 'blockmap', 'latest') NOT NULL DEFAULT 'installer',
  file_name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_release_downloads_release (release_id),
  INDEX idx_app_release_downloads_version (version),
  INDEX idx_app_release_downloads_created (created_at),
  CONSTRAINT fk_app_release_downloads_release FOREIGN KEY (release_id) REFERENCES app_releases(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  access_type ENUM('prematch', 'live', 'full') NOT NULL DEFAULT 'full',
  duration_days INT UNSIGNED NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  description VARCHAR(500) NULL,
  features_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_plans_public (is_active, duration_days, sort_order),
  INDEX idx_app_plans_access (access_type)
);

CREATE TABLE IF NOT EXISTS app_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_ref VARCHAR(120) NOT NULL UNIQUE,
  pagou_transaction_id VARCHAR(120) NULL,
  pagou_request_id VARCHAR(120) NULL,
  user_id BIGINT UNSIGNED NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NULL,
  buyer_document VARCHAR(20) NULL,
  buyer_phone VARCHAR(30) NULL,
  amount_cents INT UNSIGNED NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'BRL',
  method VARCHAR(30) NOT NULL DEFAULT 'pix',
  status VARCHAR(40) NOT NULL DEFAULT 'created',
  pix_qr_code MEDIUMTEXT NULL,
  pix_expiration_date DATETIME NULL,
  pagou_payload_json JSON NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_app_payments_user (user_id),
  INDEX idx_app_payments_plan (plan_id),
  INDEX idx_app_payments_transaction (pagou_transaction_id),
  INDEX idx_app_payments_status (status),
  CONSTRAINT fk_app_payments_user FOREIGN KEY (user_id) REFERENCES panel_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_app_payments_plan FOREIGN KEY (plan_id) REFERENCES app_plans(id) ON DELETE RESTRICT
);

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_payments'
    AND COLUMN_NAME = 'buyer_phone'
);
SET @sql_add_col := IF(@col_exists = 0,
  'ALTER TABLE app_payments ADD COLUMN buyer_phone VARCHAR(30) NULL AFTER buyer_name',
  'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'app_payments'
    AND COLUMN_NAME = 'buyer_document'
);
SET @sql_add_col := IF(@col_exists = 0,
  'ALTER TABLE app_payments ADD COLUMN buyer_document VARCHAR(20) NULL AFTER buyer_name',
  'SELECT 1');
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

CREATE TABLE IF NOT EXISTS pagou_webhook_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(160) NOT NULL UNIQUE,
  event_type VARCHAR(120) NOT NULL,
  transaction_id VARCHAR(120) NULL,
  payload_json JSON NOT NULL,
  processed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pagou_webhook_transaction (transaction_id),
  INDEX idx_pagou_webhook_type (event_type)
);

INSERT INTO app_plans (code, name, access_type, duration_days, price_cents, description, features_json, is_active, sort_order)
VALUES
('prematch_1d', 'Prematch', 'prematch', 1, 749, 'Apostas lentas, a opcao mais segura para principiantes', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 10),
('live_1d', 'Live', 'live', 1, 749, 'Apostas em tempo real, ideal para quem busca retorno mais rapido.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 20),
('full_1d', 'Prematch + LIVE', 'full', 1, 999, 'O pacote completo: ideal para quem quer o maximo de oportunidades todos os dias.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 30),
('prematch_7d', 'Prematch', 'prematch', 7, 4372, 'Apostas lentas, a opcao mais segura para principiantes', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 40),
('live_7d', 'Live', 'live', 7, 4372, 'Apostas em tempo real, ideal para quem busca retorno mais rapido.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 50),
('full_7d', 'Prematch + LIVE', 'full', 7, 5900, 'O pacote completo: ideal para quem quer o maximo de oportunidades todos os dias.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 60),
('prematch_30d', 'Prematch', 'prematch', 30, 14990, 'Apostas lentas, a opcao mais segura para principiantes', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 70),
('live_30d', 'Live', 'live', 30, 14990, 'Apostas em tempo real, ideal para quem busca retorno mais rapido.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 80),
('full_30d', 'Prematch + LIVE', 'full', 30, 19990, 'O pacote completo: ideal para quem quer o maximo de oportunidades todos os dias.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 90),
('prematch_180d', 'Prematch', 'prematch', 180, 80900, 'Apostas lentas, a opcao mais segura para principiantes', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 100),
('live_180d', 'Live', 'live', 180, 80900, 'Apostas em tempo real, ideal para quem busca retorno mais rapido.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 110),
('full_180d', 'Prematch + LIVE', 'full', 180, 107900, 'O pacote completo: ideal para quem quer o maximo de oportunidades todos os dias.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 120),
('prematch_360d', 'Prematch', 'prematch', 360, 143900, 'Apostas lentas, a opcao mais segura para principiantes', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 130),
('live_360d', 'Live', 'live', 360, 143900, 'Apostas em tempo real, ideal para quem busca retorno mais rapido.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 140),
('full_360d', 'Prematch + LIVE', 'full', 360, 191900, 'O pacote completo: ideal para quem quer o maximo de oportunidades todos os dias.', JSON_ARRAY('Acesso sem atraso ao Pre-live', 'Links diretos para as casas de apostas', '40 esportes e 27 eSports', 'Mais de 60 casas de apostas'), 1, 150)
ON DUPLICATE KEY UPDATE code = code;

UPDATE panel_users pu
JOIN (
  SELECT p1.user_id, p1.plan_id
  FROM app_payments p1
  JOIN (
    SELECT user_id, MAX(id) AS max_id
    FROM app_payments
    WHERE user_id IS NOT NULL
      AND status IN ('paid', 'captured')
    GROUP BY user_id
  ) last_payment ON last_payment.max_id = p1.id
) latest_payment ON latest_payment.user_id = pu.id
JOIN app_plans pl ON pl.id = latest_payment.plan_id
SET pu.subscription_access_type = pl.access_type
WHERE @access_col_exists = 0
  AND pu.subscription_status = 'active';

INSERT INTO panel_users (email, password_hash, subscription_days, subscription_expires_at, subscription_status, subscription_access_type)
VALUES
('harriettepenix@rhyta.com', '$2y$12$b52I7s/8hfxtnyIcHysoEO9pJZhKW/WqQXP6mV.F3zIzCcHtfLM4S', 30, DATE_ADD(NOW(), INTERVAL 30 DAY), 'active', 'full'),
('marina.souza@email.com', '$2y$12$b52I7s/8hfxtnyIcHysoEO9pJZhKW/WqQXP6mV.F3zIzCcHtfLM4S', 0, NULL, 'inactive', 'full'),
('carlos.melo@email.com', '$2y$12$b52I7s/8hfxtnyIcHysoEO9pJZhKW/WqQXP6mV.F3zIzCcHtfLM4S', 7, DATE_ADD(NOW(), INTERVAL 7 DAY), 'active', 'full')
ON DUPLICATE KEY UPDATE
  password_hash = COALESCE(panel_users.password_hash, VALUES(password_hash)),
  subscription_days = VALUES(subscription_days),
  subscription_expires_at = VALUES(subscription_expires_at),
  subscription_status = VALUES(subscription_status),
  subscription_access_type = VALUES(subscription_access_type);

INSERT INTO panel_settings (setting_key, setting_value)
VALUES
('app_name', 'Painel Surebet'),
('timezone', 'America/Sao_Paulo'),
('houses_filter_enabled', '1'),
('logs_retention_days', '30'),
('pagou_environment', 'sandbox'),
('pagou_token', ''),
('pagou_base_url', ''),
('pagou_webhook_url', 'https://octosure.net/painel/api/webhooks/pagou.php'),
('pagou_webhook_security_token', '')
ON DUPLICATE KEY UPDATE
  setting_value = IF(
    setting_key IN ('pagou_environment', 'pagou_token', 'pagou_base_url', 'pagou_webhook_url', 'pagou_webhook_security_token'),
    setting_value,
    VALUES(setting_value)
  );

INSERT INTO financial_transactions (user_id, description, amount, type, status, paid_at)
SELECT NULL, 'Assinatura mensal', 49.90, 'income', 'paid', NOW()
WHERE NOT EXISTS (SELECT 1 FROM financial_transactions);
