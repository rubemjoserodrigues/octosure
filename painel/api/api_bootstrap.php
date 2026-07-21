<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../src/repo_plans.php';

function api_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_read_json(): array
{
    $raw = file_get_contents('php://input');
    $payload = json_decode((string) $raw, true);
    if (!is_array($payload)) {
        api_json(['success' => false, 'message' => 'JSON invalido.'], 400);
    }
    return $payload;
}

function api_require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        api_json(['success' => false, 'message' => 'Metodo nao permitido.'], 405);
    }
}

function api_bearer_user(): ?array
{
    $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if (!preg_match('/Bearer\s+(.+)/i', $header, $m)) {
        return null;
    }
    $token = trim($m[1]);
    $decoded = base64_decode(strtr($token, '-_', '+/'), true);
    if (!is_string($decoded) || substr_count($decoded, ':') < 2) {
        $decoded = $token;
    }
    [$userId] = array_pad(explode(':', $decoded), 3, '');
    $user = painel_user_by_id((int) $userId);
    return $user ?: null;
}
