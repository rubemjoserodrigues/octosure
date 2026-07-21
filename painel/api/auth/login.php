<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Metodo nao permitido.']);
    exit;
}

require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/repo_plans.php';

$raw = file_get_contents('php://input');
$payload = json_decode((string) $raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['message' => 'JSON invalido.']);
    exit;
}

$email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
$password = (string) ($payload['password'] ?? '');

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['message' => 'Informe e-mail e senha.']);
    exit;
}

try {
    painel_plans_install_schema();
    $pdo = painel_db();

    // 1) tenta admin
    $stmt = $pdo->prepare('SELECT id, email, password_hash FROM admins WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $row = $stmt->fetch();
    $kind = 'admin';

    // 2) fallback para usuario do painel
    if (!$row) {
        $stmt = $pdo->prepare(
            "SELECT id, email, full_name, document_number, phone_number, password_hash, subscription_status,
                    subscription_access_type, subscription_days, subscription_expires_at
             FROM panel_users
             WHERE email = :email
             LIMIT 1"
        );
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();
        $kind = 'user';
    }

    if (!$row) {
        http_response_code(401);
        echo json_encode(['message' => 'E-mail ou senha invalidos.']);
        exit;
    }

    $hash = (string) ($row['password_hash'] ?? '');
    if ($hash === '' || !password_verify($password, $hash)) {
        http_response_code(401);
        echo json_encode(['message' => 'E-mail ou senha invalidos.']);
        exit;
    }

    $expiresAt = '';
    $daysRemaining = null;
    $isExpired = false;

    if ($kind === 'user') {
        $status = (string) ($row['subscription_status'] ?? 'inactive');
        if ($status !== 'active') {
            http_response_code(403);
            echo json_encode([
                'code' => 'NO_ACTIVE_PLAN',
                'message' => 'Conta sem plano ativo. Assine um plano para continuar.',
                'renew' => [
                    'required' => true,
                    'label' => 'Assinar plano',
                ],
            ]);
            exit;
        }

        $expiresAt = trim((string) ($row['subscription_expires_at'] ?? ''));
        if ($expiresAt !== '') {
            try {
                $tz = new DateTimeZone('America/Sao_Paulo');
                $now = new DateTimeImmutable('now', $tz);
                $exp = new DateTimeImmutable($expiresAt, $tz);
                $seconds = $exp->getTimestamp() - $now->getTimestamp();
                $daysRemaining = (int) max(0, (int) ceil($seconds / 86400));
                $isExpired = $seconds <= 0;
            } catch (Throwable $e) {
                $daysRemaining = null;
            }
        }

        if ($isExpired) {
            http_response_code(403);
            echo json_encode([
                'code' => 'PLAN_EXPIRED',
                'message' => 'Plano vencido. Renove para continuar.',
                'renew' => [
                    'required' => true,
                    'label' => 'Renovar',
                    'placeholder' => true,
                ],
            ]);
            exit;
        }
    }

    $userId = (int) $row['id'];
    $ts = (string) time();
    $sig = hash('sha256', $kind . ':' . $userId . ':' . $email . ':' . $ts);
    $token = $userId . ':' . $ts . ':' . substr($sig, 0, 32);
    $socketKey = rtrim(strtr(base64_encode($token), '+/', '-_'), '=');

    $userData = [
        'id' => $userId,
        'email' => (string) $row['email'],
        'kind' => $kind,
    ];

    if ($kind === 'user') {
        $userData['name'] = (string) ($row['full_name'] ?? '');
        $userData['hasBillingProfile'] = trim((string) ($row['full_name'] ?? '')) !== ''
            && trim((string) ($row['document_number'] ?? '')) !== ''
            && trim((string) ($row['phone_number'] ?? '')) !== '';
        $userData['subscription'] = [
            'status' => (string) ($row['subscription_status'] ?? 'inactive'),
            'accessType' => (string) ($row['subscription_access_type'] ?? 'full'),
            'daysTotal' => (int) ($row['subscription_days'] ?? 0),
            'daysRemaining' => $daysRemaining,
            'expiresAt' => $expiresAt !== '' ? $expiresAt : null,
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'socketKey' => $socketKey,
            'user' => $userData,
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Erro interno de autenticacao.']);
}
