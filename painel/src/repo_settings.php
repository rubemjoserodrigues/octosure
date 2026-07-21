<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_default_settings(): array
{
    return [
        'app_name' => 'Painel Surebet',
        'timezone' => 'America/Sao_Paulo',
        'houses_filter_enabled' => '1',
        'logs_retention_days' => '30',
        'pagou_environment' => 'sandbox',
        'pagou_token' => '',
        'pagou_base_url' => '',
        'pagou_webhook_url' => 'https://octosure.net/painel/api/webhooks/pagou.php',
        'pagou_webhook_security_token' => '',
    ];
}

function painel_settings_all(): array
{
    $defaults = painel_default_settings();
    $pdo = painel_db();
    $stmt = $pdo->query('SELECT setting_key, setting_value FROM panel_settings');
    foreach ($stmt->fetchAll() as $row) {
        $key = (string) ($row['setting_key'] ?? '');
        if ($key === '') {
            continue;
        }
        $defaults[$key] = (string) ($row['setting_value'] ?? '');
    }
    return $defaults;
}

function painel_setting_set(string $key, string $value): void
{
    if ($key === '') {
        return;
    }
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'INSERT INTO panel_settings (setting_key, setting_value, updated_at)
         VALUES (:setting_key, :setting_value, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()'
    );
    $stmt->execute([
        'setting_key' => $key,
        'setting_value' => $value,
    ]);
}
