<?php
declare(strict_types=1);

require_once __DIR__ . '/../api_bootstrap.php';

api_require_method('POST');

$payload = api_read_json();

try {
    painel_plans_install_schema();
    $user = api_bearer_user();
    $userId = $user ? (int) $user['id'] : (int) ($payload['userId'] ?? $payload['user_id'] ?? 0);
    $email = $user ? (string) $user['email'] : mb_strtolower(trim((string) ($payload['email'] ?? '')));
    $planId = (int) ($payload['planId'] ?? $payload['plan_id'] ?? 0);
    $name = trim((string) ($payload['name'] ?? $email));
    $document = (string) ($payload['document'] ?? '');
    $phone = (string) ($payload['phone'] ?? $payload['telefone'] ?? '');

    if ($userId <= 0 && $email === '') {
        api_json(['success' => false, 'message' => 'Informe usuario ou e-mail.'], 422);
    }
    if ($userId <= 0) {
        $pdo = painel_db();
        $stmt = $pdo->prepare('SELECT id FROM panel_users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $userId = (int) ($stmt->fetchColumn() ?: 0);
    }
    if ($userId <= 0) {
        api_json(['success' => false, 'message' => 'Usuario nao encontrado. Cadastre primeiro.'], 404);
    }
    if ($email === '') {
        $found = painel_user_by_id($userId);
        $email = $found ? (string) $found['email'] : '';
        if ($found) {
            if ($name === '' || $name === $email) {
                $name = (string) ($found['full_name'] ?? $name);
            }
            if ($document === '') {
                $document = (string) ($found['document_number'] ?? '');
            }
            if ($phone === '') {
                $phone = (string) ($found['phone_number'] ?? '');
            }
        }
    }

    $payment = painel_create_pix_payment($userId, $planId, $name, $email, $document, $phone);
    api_json(['success' => true, 'data' => $payment]);
} catch (InvalidArgumentException $e) {
    api_json(['success' => false, 'message' => $e->getMessage()], 422);
} catch (Throwable $e) {
    api_json(['success' => false, 'message' => $e->getMessage()], 500);
}
