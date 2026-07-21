<?php
declare(strict_types=1);

require_once __DIR__ . '/../api_bootstrap.php';

api_require_method('POST');

$payload = api_read_json();

try {
    painel_plans_install_schema();
    painel_validate_pagou_webhook_security_token();
    painel_process_pagou_webhook($payload);
    api_json(['received' => true]);
} catch (Throwable $e) {
    $status = $e->getMessage() === 'Webhook nao autorizado.' ? 401 : 500;
    api_json(['received' => false], $status);
}
