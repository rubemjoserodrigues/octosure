<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Octosure-Token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../src/repo_suggestions.php';
require_once __DIR__ . '/../../src/repo_logs.php';

function painel_api_json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function painel_api_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        painel_api_json_response([
            'ok' => false,
            'message' => 'JSON invalido.',
        ], 400);
    }

    return $payload;
}

function painel_api_read_auth_token(): string
{
    $header = (string) ($_SERVER['HTTP_X_OCTOSURE_TOKEN'] ?? '');
    if ($header !== '') {
        return trim($header);
    }

    $auth = trim((string) ($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $match)) {
        return trim((string) ($match[1] ?? ''));
    }

    return '';
}

function painel_api_current_viewer(bool $required = false, bool $allowAdmin = true): ?array
{
    $token = painel_api_read_auth_token();
    $viewer = $token !== '' ? painel_auth_subject_from_socket_token($token, $allowAdmin) : null;
    if ($required && !$viewer) {
        painel_api_json_response([
            'ok' => false,
            'message' => 'Sessao invalida. Faca login novamente.',
        ], 401);
    }
    return $viewer;
}
