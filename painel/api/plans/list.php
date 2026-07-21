<?php
declare(strict_types=1);

require_once __DIR__ . '/../api_bootstrap.php';

api_require_method('GET');

try {
    painel_plans_install_schema();
    api_json([
        'success' => true,
        'data' => [
            'durations' => painel_plans_public_payload(),
        ],
    ]);
} catch (Throwable $e) {
    api_json(['success' => false, 'message' => 'Erro ao listar planos.'], 500);
}
