<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/repo_settings.php';
require_once __DIR__ . '/repo_users.php';
require_once __DIR__ . '/repo_finance.php';
require_once __DIR__ . '/qr_pix.php';

function painel_plans_install_schema(): void
{
    $pdo = painel_db();
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS app_plans (
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
        )"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS app_payments (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          external_ref VARCHAR(120) NOT NULL UNIQUE,
          pagou_transaction_id VARCHAR(120) NULL,
          pagou_request_id VARCHAR(120) NULL,
          user_id BIGINT UNSIGNED NULL,
          plan_id BIGINT UNSIGNED NOT NULL,
          buyer_email VARCHAR(255) NOT NULL,
          buyer_name VARCHAR(255) NULL,
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
        )"
    );

    painel_ensure_column('app_payments', 'buyer_phone', 'ALTER TABLE app_payments ADD COLUMN buyer_phone VARCHAR(30) NULL AFTER buyer_name');
    $addedAccessColumn = painel_ensure_column(
        'panel_users',
        'subscription_access_type',
        "ALTER TABLE panel_users ADD COLUMN subscription_access_type ENUM('prematch', 'live', 'full') NOT NULL DEFAULT 'full' AFTER subscription_status"
    );
    painel_ensure_column('panel_users', 'full_name', 'ALTER TABLE panel_users ADD COLUMN full_name VARCHAR(255) NULL AFTER email');
    painel_ensure_column('panel_users', 'document_number', 'ALTER TABLE panel_users ADD COLUMN document_number VARCHAR(20) NULL AFTER full_name');
    painel_ensure_column('panel_users', 'phone_number', 'ALTER TABLE panel_users ADD COLUMN phone_number VARCHAR(30) NULL AFTER document_number');
    painel_ensure_column('app_payments', 'buyer_document', 'ALTER TABLE app_payments ADD COLUMN buyer_document VARCHAR(20) NULL AFTER buyer_name');

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS pagou_webhook_events (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          event_id VARCHAR(160) NOT NULL UNIQUE,
          event_type VARCHAR(120) NOT NULL,
          transaction_id VARCHAR(120) NULL,
          payload_json JSON NOT NULL,
          processed_at DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_pagou_webhook_transaction (transaction_id),
          INDEX idx_pagou_webhook_type (event_type)
        )"
    );

    painel_plans_seed_defaults();
    if ($addedAccessColumn) {
        painel_backfill_subscription_access_type();
    }
}

function painel_ensure_column(string $tableName, string $columnName, string $alterSql): bool
{
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = :table_name
           AND COLUMN_NAME = :column_name'
    );
    $stmt->execute(['table_name' => $tableName, 'column_name' => $columnName]);
    if ((int) $stmt->fetchColumn() === 0) {
        $pdo->exec($alterSql);
        return true;
    }
    return false;
}

function painel_plans_seed_defaults(): void
{
    $defaults = [
        [1, 'prematch', 'Prematch', 749],
        [1, 'live', 'Live', 749],
        [1, 'full', 'Prematch + LIVE', 999],
        [7, 'prematch', 'Prematch', 4372],
        [7, 'live', 'Live', 4372],
        [7, 'full', 'Prematch + LIVE', 5900],
        [30, 'prematch', 'Prematch', 14990],
        [30, 'live', 'Live', 14990],
        [30, 'full', 'Prematch + LIVE', 19990],
        [180, 'prematch', 'Prematch', 80900],
        [180, 'live', 'Live', 80900],
        [180, 'full', 'Prematch + LIVE', 107900],
        [360, 'prematch', 'Prematch', 143900],
        [360, 'live', 'Live', 143900],
        [360, 'full', 'Prematch + LIVE', 191900],
    ];

    $features = [
        'Acesso sem atraso ao Pre-live',
        'Links diretos para as casas de apostas',
        '40 esportes e 27 eSports',
        'Mais de 60 casas de apostas',
    ];

    $descriptions = [
        'prematch' => 'Apostas lentas, a opcao mais segura para principiantes',
        'live' => 'Apostas em tempo real, ideal para quem busca retorno mais rapido.',
        'full' => 'O pacote completo: ideal para quem quer o maximo de oportunidades todos os dias.',
    ];

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "INSERT INTO app_plans (code, name, access_type, duration_days, price_cents, description, features_json, is_active, sort_order)
         VALUES (:code, :name, :access_type, :duration_days, :price_cents, :description, :features_json, 1, :sort_order)
         ON DUPLICATE KEY UPDATE code = code"
    );

    $order = 10;
    foreach ($defaults as [$days, $type, $name, $price]) {
        $stmt->execute([
            'code' => $type . '_' . $days . 'd',
            'name' => $name,
            'access_type' => $type,
            'duration_days' => $days,
            'price_cents' => $price,
            'description' => $descriptions[$type],
            'features_json' => json_encode($features, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'sort_order' => $order,
        ]);
        $order += 10;
    }
}

function painel_normalize_access_type(string $value): string
{
    $value = strtolower(trim($value));
    return in_array($value, ['prematch', 'live', 'full'], true) ? $value : 'full';
}

function painel_merge_access_types(string $current, string $incoming, bool $currentStillActive): string
{
    $current = painel_normalize_access_type($current);
    $incoming = painel_normalize_access_type($incoming);
    if (!$currentStillActive) {
        return $incoming;
    }
    if ($current === 'full' || $incoming === 'full') {
        return 'full';
    }
    return $current === $incoming ? $incoming : 'full';
}

function painel_backfill_subscription_access_type(): void
{
    $pdo = painel_db();
    $pdo->exec(
        "UPDATE panel_users pu
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
         WHERE pu.subscription_status = 'active'"
    );
}

function painel_plans_list(bool $includeInactive = true): array
{
    $pdo = painel_db();
    $sql = 'SELECT * FROM app_plans';
    if (!$includeInactive) {
        $sql .= ' WHERE is_active = 1';
    }
    $sql .= ' ORDER BY duration_days ASC, FIELD(access_type, "prematch", "live", "full"), sort_order ASC, id ASC';
    $rows = $pdo->query($sql)->fetchAll();
    foreach ($rows as &$row) {
        $row['features'] = painel_plan_features($row);
    }
    unset($row);
    return $rows;
}

function painel_plan_by_id(int $planId, bool $activeOnly = false): ?array
{
    if ($planId <= 0) {
        return null;
    }
    $pdo = painel_db();
    $sql = 'SELECT * FROM app_plans WHERE id = :id';
    if ($activeOnly) {
        $sql .= ' AND is_active = 1';
    }
    $sql .= ' LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $planId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['features'] = painel_plan_features($row);
    return $row;
}

function painel_plan_features(array $row): array
{
    $raw = (string) ($row['features_json'] ?? '');
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [];
    }
    return array_values(array_filter(array_map(static fn($v): string => trim((string) $v), $decoded), static fn($v): bool => $v !== ''));
}

function painel_plan_save(array $input): int
{
    $id = (int) ($input['plan_id'] ?? 0);
    $name = trim((string) ($input['name'] ?? ''));
    $accessType = (string) ($input['access_type'] ?? 'full');
    $durationDays = max(1, (int) ($input['duration_days'] ?? 1));
    $priceText = str_replace(',', '.', trim((string) ($input['price'] ?? '0')));
    $priceCents = (int) round(max(0.01, (float) $priceText) * 100);
    $description = trim((string) ($input['description'] ?? ''));
    $featuresRaw = str_replace("\r\n", "\n", (string) ($input['features'] ?? ''));
    $features = array_values(array_filter(array_map('trim', explode("\n", $featuresRaw)), static fn($v): bool => $v !== ''));
    $isActive = isset($input['is_active']) && (string) $input['is_active'] === '1' ? 1 : 0;
    $sortOrder = (int) ($input['sort_order'] ?? 0);

    if ($name === '') {
        throw new InvalidArgumentException('Informe o nome do plano.');
    }
    if (!in_array($accessType, ['prematch', 'live', 'full'], true)) {
        throw new InvalidArgumentException('Tipo de acesso invalido.');
    }

    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '_', $name) ?: 'plano');
    $code = trim((string) ($input['code'] ?? ''));
    if ($code === '') {
        $code = $slug . '_' . $durationDays . 'd_' . substr($accessType, 0, 4);
    }
    $code = strtolower(trim(preg_replace('/[^a-z0-9_]+/i', '_', $code) ?: 'plano'));

    $pdo = painel_db();
    if ($id > 0) {
        $stmt = $pdo->prepare(
            'UPDATE app_plans
             SET code = :code, name = :name, access_type = :access_type, duration_days = :duration_days,
                 price_cents = :price_cents, description = :description, features_json = :features_json,
                 is_active = :is_active, sort_order = :sort_order
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'code' => $code,
            'name' => $name,
            'access_type' => $accessType,
            'duration_days' => $durationDays,
            'price_cents' => $priceCents,
            'description' => $description,
            'features_json' => json_encode($features, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'is_active' => $isActive,
            'sort_order' => $sortOrder,
        ]);
        return $id;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO app_plans (code, name, access_type, duration_days, price_cents, description, features_json, is_active, sort_order)
         VALUES (:code, :name, :access_type, :duration_days, :price_cents, :description, :features_json, :is_active, :sort_order)'
    );
    $stmt->execute([
        'code' => $code,
        'name' => $name,
        'access_type' => $accessType,
        'duration_days' => $durationDays,
        'price_cents' => $priceCents,
        'description' => $description,
        'features_json' => json_encode($features, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'is_active' => $isActive,
        'sort_order' => $sortOrder,
    ]);
    return (int) $pdo->lastInsertId();
}

function painel_plan_toggle(int $planId, bool $active): void
{
    if ($planId <= 0) {
        throw new InvalidArgumentException('Plano invalido.');
    }
    $pdo = painel_db();
    $stmt = $pdo->prepare('UPDATE app_plans SET is_active = :active WHERE id = :id');
    $stmt->execute(['id' => $planId, 'active' => $active ? 1 : 0]);
}

function painel_plans_public_payload(): array
{
    $rows = painel_plans_list(false);
    $durations = [];
    foreach ($rows as $row) {
        $days = (int) $row['duration_days'];
        if (!isset($durations[$days])) {
            $durations[$days] = [
                'days' => $days,
                'label' => $days === 1 ? '1 dia' : $days . ' dias',
                'plans' => [],
            ];
        }
        $durations[$days]['plans'][] = [
            'id' => (int) $row['id'],
            'code' => (string) $row['code'],
            'name' => (string) $row['name'],
            'accessType' => (string) $row['access_type'],
            'durationDays' => $days,
            'priceCents' => (int) $row['price_cents'],
            'priceLabel' => 'R$' . number_format(((int) $row['price_cents']) / 100, 2, ',', '.'),
            'description' => (string) ($row['description'] ?? ''),
            'features' => $row['features'],
        ];
    }
    return array_values($durations);
}

function painel_pagou_settings(): array
{
    $settings = painel_settings_all();
    $env = (string) ($settings['pagou_environment'] ?? painel_env('PAGOU_ENVIRONMENT', 'sandbox'));
    if (!in_array($env, ['sandbox', 'production'], true)) {
        $env = 'sandbox';
    }
    $baseUrl = $env === 'production' ? 'https://api.pagou.ai' : 'https://api-sandbox.pagou.ai';
    $customBase = trim((string) ($settings['pagou_base_url'] ?? painel_env('PAGOU_BASE_URL', '')));
    if ($customBase !== '') {
        $baseUrl = rtrim($customBase, '/');
    }
    return [
        'environment' => $env,
        'base_url' => $baseUrl,
        'token' => trim((string) (($settings['pagou_token'] ?? '') !== '' ? $settings['pagou_token'] : painel_env('PAGOU_TOKEN', ''))),
        'webhook_url' => trim((string) (($settings['pagou_webhook_url'] ?? '') !== '' ? $settings['pagou_webhook_url'] : painel_env('PAGOU_WEBHOOK_URL', ''))),
        'webhook_security_token' => trim((string) (($settings['pagou_webhook_security_token'] ?? '') !== '' ? $settings['pagou_webhook_security_token'] : painel_env('PAGOU_WEBHOOK_SECURITY_TOKEN', ''))),
    ];
}

function painel_payment_find_by_external_ref(string $externalRef): ?array
{
    $pdo = painel_db();
    $stmt = $pdo->prepare('SELECT * FROM app_payments WHERE external_ref = :external_ref LIMIT 1');
    $stmt->execute(['external_ref' => $externalRef]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function painel_payment_find_by_transaction(string $transactionId): ?array
{
    $pdo = painel_db();
    $stmt = $pdo->prepare('SELECT * FROM app_payments WHERE pagou_transaction_id = :transaction_id LIMIT 1');
    $stmt->execute(['transaction_id' => $transactionId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function painel_normalize_brazil_phone(string $value): string
{
    $digits = preg_replace('/\D+/', '', $value);
    if (strlen($digits) === 13 && str_starts_with($digits, '55')) {
        $digits = substr($digits, 2);
    }
    if (strlen($digits) < 10 || strlen($digits) > 11) {
        throw new InvalidArgumentException('Informe telefone com DDD valido.');
    }
    if (preg_match('/^(\d)\1+$/', $digits)) {
        throw new InvalidArgumentException('Informe telefone valido.');
    }
    return $digits;
}

function painel_validate_brazil_document(string $value): array
{
    $digits = preg_replace('/\D+/', '', $value);
    if (strlen($digits) === 11 && painel_validate_cpf($digits)) {
        return ['CPF', $digits];
    }
    if (strlen($digits) === 14 && painel_validate_cnpj($digits)) {
        return ['CNPJ', $digits];
    }
    throw new InvalidArgumentException('Informe CPF ou CNPJ valido.');
}

function painel_validate_cpf(string $cpf): bool
{
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1+$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $sum = 0;
        for ($i = 0; $i < $t; $i++) {
            $sum += (int) $cpf[$i] * (($t + 1) - $i);
        }
        $digit = ((10 * $sum) % 11) % 10;
        if ((int) $cpf[$t] !== $digit) {
            return false;
        }
    }
    return true;
}

function painel_validate_cnpj(string $cnpj): bool
{
    if (strlen($cnpj) !== 14 || preg_match('/^(\d)\1+$/', $cnpj)) {
        return false;
    }
    $weights = [
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    ];
    for ($round = 0; $round < 2; $round++) {
        $sum = 0;
        foreach ($weights[$round] as $index => $weight) {
            $sum += (int) $cnpj[$index] * $weight;
        }
        $rest = $sum % 11;
        $digit = $rest < 2 ? 0 : 11 - $rest;
        if ((int) $cnpj[12 + $round] !== $digit) {
            return false;
        }
    }
    return true;
}

function painel_create_pix_payment(int $userId, int $planId, string $buyerName, string $buyerEmail, ?string $buyerDocument = null, ?string $buyerPhone = null): array
{
    $plan = painel_plan_by_id($planId, true);
    if (!$plan) {
        throw new InvalidArgumentException('Plano indisponivel.');
    }

    $buyerEmail = mb_strtolower(trim($buyerEmail));
    if (!filter_var($buyerEmail, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('E-mail invalido.');
    }
    $buyerName = trim($buyerName);
    $buyerDocument = preg_replace('/\D+/', '', (string) $buyerDocument);
    $buyerPhone = preg_replace('/\D+/', '', (string) $buyerPhone);
    if ($userId > 0 && ($buyerName === '' || $buyerDocument === '' || $buyerPhone === '')) {
        $user = painel_user_by_id($userId);
        if ($user) {
            if ($buyerName === '') {
                $buyerName = trim((string) ($user['full_name'] ?? ''));
            }
            if ($buyerDocument === '') {
                $buyerDocument = preg_replace('/\D+/', '', (string) ($user['document_number'] ?? ''));
            }
            if ($buyerPhone === '') {
                $buyerPhone = preg_replace('/\D+/', '', (string) ($user['phone_number'] ?? ''));
            }
            if ($buyerEmail === '' && !empty($user['email'])) {
                $buyerEmail = mb_strtolower(trim((string) $user['email']));
            }
        }
    }
    $buyerName = $buyerName !== '' ? $buyerName : $buyerEmail;
    $phone = painel_normalize_brazil_phone((string) $buyerPhone);
    [$docType, $docNumber] = painel_validate_brazil_document((string) $buyerDocument);

    $settings = painel_pagou_settings();
    if ($settings['token'] === '') {
        throw new RuntimeException('Token da Pagou.ai nao configurado no painel.');
    }

    $externalRef = painel_pagou_external_ref();
    $notifyUrl = $settings['webhook_url'] !== '' ? $settings['webhook_url'] : painel_guess_webhook_url();
    $amountCents = (int) $plan['price_cents'];

    $payload = [
        'external_ref' => $externalRef,
        'amount' => $amountCents,
        'currency' => 'BRL',
        'method' => 'pix',
        'notify_url' => $notifyUrl,
        'buyer' => [
            'name' => $buyerName,
            'email' => $buyerEmail,
            'phone' => $phone,
            'document' => [
                'type' => $docType,
                'number' => $docNumber,
            ],
        ],
        'products' => [[
            'name' => (string) $plan['name'] . ' - ' . (int) $plan['duration_days'] . ' dias',
            'price' => $amountCents,
            'quantity' => 1,
        ]],
    ];

    $response = painel_pagou_request('POST', '/v2/transactions', $payload, $settings);
    $data = is_array($response['data'] ?? null) ? $response['data'] : [];
    $transactionId = (string) ($data['id'] ?? '');
    $status = (string) ($data['status'] ?? 'pending');
    $pix = is_array($data['pix'] ?? null) ? $data['pix'] : [];

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'INSERT INTO app_payments
          (external_ref, pagou_transaction_id, pagou_request_id, user_id, plan_id, buyer_email, buyer_name, buyer_document, buyer_phone, amount_cents, status, pix_qr_code, pix_expiration_date, pagou_payload_json)
         VALUES
          (:external_ref, :pagou_transaction_id, :pagou_request_id, :user_id, :plan_id, :buyer_email, :buyer_name, :buyer_document, :buyer_phone, :amount_cents, :status, :pix_qr_code, :pix_expiration_date, :pagou_payload_json)'
    );
    $stmt->execute([
        'external_ref' => $externalRef,
        'pagou_transaction_id' => $transactionId !== '' ? $transactionId : null,
        'pagou_request_id' => (string) ($response['requestId'] ?? ''),
        'user_id' => $userId > 0 ? $userId : null,
        'plan_id' => (int) $plan['id'],
        'buyer_email' => $buyerEmail,
        'buyer_name' => $buyerName,
        'buyer_document' => $docNumber,
        'buyer_phone' => $phone,
        'amount_cents' => $amountCents,
        'status' => $status,
        'pix_qr_code' => (string) ($pix['qr_code'] ?? ''),
        'pix_expiration_date' => painel_mysql_datetime((string) ($pix['expiration_date'] ?? '')),
        'pagou_payload_json' => json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);

    if ($userId > 0) {
        $stmt = $pdo->prepare(
            'UPDATE panel_users
             SET full_name = COALESCE(NULLIF(:full_name, ""), full_name),
                 document_number = COALESCE(NULLIF(:document_number, ""), document_number),
                 phone_number = COALESCE(NULLIF(:phone_number, ""), phone_number)
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $userId,
            'full_name' => $buyerName,
            'document_number' => $docNumber,
            'phone_number' => $phone,
        ]);
    }

    return [
        'paymentId' => (int) $pdo->lastInsertId(),
        'externalRef' => $externalRef,
        'transactionId' => $transactionId,
        'status' => $status,
        'amountCents' => $amountCents,
        'plan' => painel_public_plan($plan),
        'pix' => [
            'qrCode' => (string) ($pix['qr_code'] ?? ''),
            'qrImage' => painel_pix_qr_image_data_url((string) ($pix['qr_code'] ?? '')),
            'expirationDate' => (string) ($pix['expiration_date'] ?? ''),
            'receiptUrl' => $pix['receipt_url'] ?? null,
        ],
    ];
}

function painel_public_plan(array $plan): array
{
    return [
        'id' => (int) $plan['id'],
        'code' => (string) $plan['code'],
        'name' => (string) $plan['name'],
        'accessType' => (string) $plan['access_type'],
        'durationDays' => (int) $plan['duration_days'],
        'priceCents' => (int) $plan['price_cents'],
    ];
}

function painel_pagou_external_ref(): string
{
    return 'octosure_' . date('YmdHis') . '_' . str_replace('.', '', sprintf('%.6F', microtime(true))) . '_' . bin2hex(random_bytes(8));
}

function painel_pagou_request(string $method, string $path, ?array $payload, array $settings): array
{
    $url = rtrim((string) $settings['base_url'], '/') . $path;
    $maxAttempts = 3;
    $retryStatuses = [429, 500, 502, 504];
    $lastDecoded = null;
    $lastStatus = 0;
    $lastErr = '';

    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Falha ao iniciar conexao com Pagou.');
        }

        $headers = [
            'Authorization: Bearer ' . (string) $settings['token'],
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
        ]);
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }

        $body = curl_exec($ch);
        $lastErr = curl_error($ch);
        $lastStatus = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($body === false) {
            if ($attempt < $maxAttempts) {
                usleep(250000 * $attempt);
                continue;
            }
            painel_pagou_log_error($path, 0, [
                'message' => 'network_error',
                'detail' => $lastErr,
            ], $payload);
            throw new RuntimeException('Erro de rede na Pagou: ' . $lastErr);
        }

        $decoded = json_decode((string) $body, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Resposta invalida da Pagou. HTTP ' . $lastStatus);
        }
        $lastDecoded = $decoded;

        if ($lastStatus >= 200 && $lastStatus < 300) {
            return $decoded;
        }

        if ($lastStatus === 409) {
            break;
        }

        if ($attempt < $maxAttempts && in_array($lastStatus, $retryStatuses, true)) {
            usleep(350000 * $attempt);
            continue;
        }

        break;
    }

    if (is_array($lastDecoded)) {
        $detail = (string) ($lastDecoded['detail'] ?? $lastDecoded['message'] ?? $lastDecoded['title'] ?? 'Falha na Pagou');
        $requestId = (string) ($lastDecoded['requestId'] ?? $lastDecoded['request_id'] ?? '');
        painel_pagou_log_error($path, $lastStatus, $lastDecoded, $payload);
        if ($requestId !== '') {
            $detail .= ' requestId=' . $requestId;
        }
        throw new RuntimeException($detail . ' (HTTP ' . $lastStatus . ')');
    }

    throw new RuntimeException('Falha na Pagou. HTTP ' . $lastStatus);
}

function painel_pagou_log_error(string $path, int $status, array $response, ?array $payload): void
{
    try {
        $safePayload = $payload ?? [];
        if (isset($safePayload['buyer']['document']['number'])) {
            $doc = (string) $safePayload['buyer']['document']['number'];
            $safePayload['buyer']['document']['number'] = strlen($doc) > 4 ? str_repeat('*', max(0, strlen($doc) - 4)) . substr($doc, -4) : '****';
        }
        if (isset($safePayload['buyer']['phone'])) {
            $phone = (string) $safePayload['buyer']['phone'];
            $safePayload['buyer']['phone'] = strlen($phone) > 4 ? str_repeat('*', max(0, strlen($phone) - 4)) . substr($phone, -4) : '****';
        }

        $pdo = painel_db();
        $stmt = $pdo->prepare(
            'INSERT INTO system_logs (level, category, message, context_json)
             VALUES ("error", "pagou", :message, :context_json)'
        );
        $stmt->execute([
            'message' => 'Falha ao chamar Pagou',
            'context_json' => json_encode([
                'path' => $path,
                'http_status' => $status,
                'request_id' => (string) ($response['requestId'] ?? $response['request_id'] ?? ''),
                'detail' => (string) ($response['detail'] ?? $response['message'] ?? $response['title'] ?? ''),
                'payload' => $safePayload,
                'response' => $response,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    } catch (Throwable $e) {
        // O checkout nao deve quebrar por falha de log.
    }
}

function painel_pagou_webhook_token_from_request(): string
{
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $headerMap = [];
    if (is_array($headers)) {
        foreach ($headers as $key => $value) {
            $headerMap[strtolower((string) $key)] = trim((string) $value);
        }
    }

    $candidates = [
        (string) ($_GET['token'] ?? ''),
        (string) ($_SERVER['HTTP_X_WEBHOOK_TOKEN'] ?? ''),
        (string) ($_SERVER['HTTP_X_PAGOU_WEBHOOK_TOKEN'] ?? ''),
        (string) ($_SERVER['HTTP_X_PAGOU_TOKEN'] ?? ''),
        (string) ($_SERVER['HTTP_X_PAGOU_SECURITY_TOKEN'] ?? ''),
        (string) ($_SERVER['HTTP_X_SECURITY_TOKEN'] ?? ''),
        (string) ($_SERVER['HTTP_TOKEN'] ?? ''),
        (string) ($_SERVER['HTTP_SECURITY_TOKEN'] ?? ''),
        $headerMap['x-webhook-token'] ?? '',
        $headerMap['x-pagou-webhook-token'] ?? '',
        $headerMap['x-pagou-token'] ?? '',
        $headerMap['x-pagou-security-token'] ?? '',
        $headerMap['x-security-token'] ?? '',
        $headerMap['token'] ?? '',
        $headerMap['security-token'] ?? '',
    ];

    $auth = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ($headerMap['authorization'] ?? '')));
    if (stripos($auth, 'Bearer ') === 0) {
        $candidates[] = trim(substr($auth, 7));
    } elseif ($auth !== '') {
        $candidates[] = $auth;
    }

    foreach ($candidates as $candidate) {
        $candidate = trim((string) $candidate);
        if ($candidate !== '') {
            return $candidate;
        }
    }
    return '';
}

function painel_validate_pagou_webhook_security_token(): void
{
    $settings = painel_pagou_settings();
    $expected = (string) ($settings['webhook_security_token'] ?? '');
    if ($expected === '') {
        return;
    }

    $received = painel_pagou_webhook_token_from_request();
    if ($received === '' || !hash_equals($expected, $received)) {
        throw new RuntimeException('Webhook nao autorizado.');
    }
}

function painel_apply_paid_payment(array $payment, string $paidAt = ''): void
{
    $plan = painel_plan_by_id((int) $payment['plan_id'], false);
    if (!$plan) {
        return;
    }
    $userId = (int) ($payment['user_id'] ?? 0);
    if ($userId <= 0) {
        return;
    }
    $paidAtMysql = painel_mysql_datetime($paidAt) ?? date('Y-m-d H:i:s');
    $pdo = painel_db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'SELECT subscription_expires_at, subscription_access_type, subscription_status
             FROM panel_users
             WHERE id = :id
             FOR UPDATE'
        );
        $stmt->execute(['id' => $userId]);
        $current = $stmt->fetch();
        if (!$current) {
            $pdo->rollBack();
            return;
        }

        $tz = new DateTimeZone('America/Sao_Paulo');
        $now = new DateTimeImmutable('now', $tz);
        $base = $now;
        $rawExp = trim((string) ($current['subscription_expires_at'] ?? ''));
        $currentStillActive = strtolower((string) ($current['subscription_status'] ?? '')) === 'active';
        if ($rawExp !== '') {
            $exp = new DateTimeImmutable($rawExp, $tz);
            if ($exp > $now) {
                $base = $exp;
            } else {
                $currentStillActive = false;
            }
        }
        $newExp = $base->modify('+' . (int) $plan['duration_days'] . ' days')->format('Y-m-d H:i:s');
        $newAccessType = painel_merge_access_types(
            (string) ($current['subscription_access_type'] ?? 'full'),
            (string) ($plan['access_type'] ?? 'full'),
            $currentStillActive
        );

        $stmt = $pdo->prepare(
            'UPDATE panel_users
             SET subscription_days = :days,
                 subscription_expires_at = :expires_at,
                 subscription_status = "active",
                 subscription_access_type = :access_type
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $userId,
            'days' => (int) $plan['duration_days'],
            'expires_at' => $newExp,
            'access_type' => $newAccessType,
        ]);

        $stmt = $pdo->prepare('UPDATE app_payments SET status = "paid", paid_at = :paid_at WHERE id = :id');
        $stmt->execute(['id' => (int) $payment['id'], 'paid_at' => $paidAtMysql]);

        $stmt = $pdo->prepare(
            'INSERT INTO financial_transactions (user_id, description, amount, type, status, paid_at)
             VALUES (:user_id, :description, :amount, "income", "paid", :paid_at)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'description' => 'Pagamento Pix plano ' . (string) $plan['name'] . ' ' . (int) $plan['duration_days'] . ' dias',
            'amount' => ((int) $payment['amount_cents']) / 100,
            'paid_at' => $paidAtMysql,
        ]);

        $stmt = $pdo->prepare(
            'UPDATE panel_users
             SET full_name = COALESCE(NULLIF(:full_name, ""), full_name),
                 document_number = COALESCE(NULLIF(:document_number, ""), document_number),
                 phone_number = COALESCE(NULLIF(:phone_number, ""), phone_number)
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $userId,
            'full_name' => (string) ($payment['buyer_name'] ?? ''),
            'document_number' => preg_replace('/\D+/', '', (string) ($payment['buyer_document'] ?? '')),
            'phone_number' => preg_replace('/\D+/', '', (string) ($payment['buyer_phone'] ?? '')),
        ]);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function painel_reconcile_payment_status(array $payment): array
{
    $transactionId = trim((string) ($payment['pagou_transaction_id'] ?? ''));
    $currentStatus = strtolower(trim((string) ($payment['status'] ?? '')));
    if ($transactionId === '' || in_array($currentStatus, ['paid', 'captured', 'refunded', 'canceled', 'cancelled', 'failed', 'expired'], true)) {
        return $payment;
    }

    try {
        $settings = painel_pagou_settings();
        if (($settings['token'] ?? '') === '') {
            return $payment;
        }
        $response = painel_pagou_request('GET', '/v2/transactions/' . rawurlencode($transactionId), null, $settings);
        $data = is_array($response['data'] ?? null) ? $response['data'] : $response;
        $status = trim((string) ($data['status'] ?? ''));
        if ($status !== '') {
            $pdo = painel_db();
            $stmt = $pdo->prepare('UPDATE app_payments SET status = :status, pagou_payload_json = :payload WHERE id = :id');
            $stmt->execute([
                'id' => (int) $payment['id'],
                'status' => $status,
                'payload' => json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
            $payment['status'] = $status;
        }
        if ($status === 'paid' || $status === 'captured') {
            painel_apply_paid_payment($payment, (string) ($data['paid_at'] ?? ''));
        }
        $fresh = painel_payment_find_by_external_ref((string) $payment['external_ref']);
        return $fresh ?: $payment;
    } catch (Throwable $e) {
        return $payment;
    }
}

function painel_process_pagou_webhook(array $payload): void
{
    $eventId = (string) ($payload['id'] ?? $payload['event_id'] ?? '');
    if ($eventId === '') {
        $eventId = hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
    $eventType = (string) ($payload['type'] ?? $payload['event'] ?? '');
    $data = is_array($payload['data'] ?? null) ? $payload['data'] : $payload;
    $transactionId = (string) ($data['id'] ?? $data['transaction_id'] ?? '');

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'INSERT IGNORE INTO pagou_webhook_events (event_id, event_type, transaction_id, payload_json)
         VALUES (:event_id, :event_type, :transaction_id, :payload_json)'
    );
    $stmt->execute([
        'event_id' => $eventId,
        'event_type' => $eventType,
        'transaction_id' => $transactionId !== '' ? $transactionId : null,
        'payload_json' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
    if ($stmt->rowCount() === 0) {
        return;
    }

    $status = (string) ($data['status'] ?? '');
    $externalRef = (string) ($data['external_ref'] ?? '');
    $payment = null;
    if ($transactionId !== '') {
        $payment = painel_payment_find_by_transaction($transactionId);
    }
    if (!$payment && $externalRef !== '') {
        $payment = painel_payment_find_by_external_ref($externalRef);
    }
    if (!$payment) {
        return;
    }

    if ($status !== '') {
        $stmt = $pdo->prepare('UPDATE app_payments SET status = :status, pagou_payload_json = :payload WHERE id = :id');
        $stmt->execute([
            'id' => (int) $payment['id'],
            'status' => $status,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    }

    if ($eventType === 'transaction.paid' || $status === 'paid' || $status === 'captured') {
        painel_apply_paid_payment($payment, (string) ($data['paid_at'] ?? ''));
        $stmt = $pdo->prepare('UPDATE pagou_webhook_events SET processed_at = NOW() WHERE event_id = :event_id');
        $stmt->execute(['event_id' => $eventId]);
    }
}

function painel_mysql_datetime(string $value): ?string
{
    $value = trim($value);
    if ($value === '') {
        return null;
    }
    try {
        return (new DateTimeImmutable($value))->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return null;
    }
}

function painel_guess_webhook_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'octosure.net');
    return $scheme . '://' . $host . '/painel/api/webhooks/pagou.php';
}
