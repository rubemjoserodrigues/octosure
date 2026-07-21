<?php
declare(strict_types=1);

require_once __DIR__ . '/../api_bootstrap.php';

api_require_method('POST');

$payload = api_read_json();

$email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
$password = (string) ($payload['password'] ?? '');
$name = trim((string) ($payload['name'] ?? ''));
$planId = (int) ($payload['planId'] ?? $payload['plan_id'] ?? 0);
$document = (string) ($payload['document'] ?? '');
$phone = (string) ($payload['phone'] ?? $payload['telefone'] ?? '');

try {
    painel_plans_install_schema();
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        api_json(['success' => false, 'message' => 'E-mail invalido.'], 422);
    }
    if (mb_strlen($password) < 6) {
        api_json(['success' => false, 'message' => 'Senha deve ter ao menos 6 caracteres.'], 422);
    }
    painel_validate_brazil_document($document);
    painel_normalize_brazil_phone($phone);
    if ($planId > 0 && !painel_plan_by_id($planId, true)) {
        api_json(['success' => false, 'message' => 'Plano invalido.'], 422);
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare('SELECT id, password_hash, subscription_status, subscription_expires_at FROM panel_users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $existing = $stmt->fetch();
    $existingId = (int) ($existing['id'] ?? 0);
    if ($existingId > 0) {
        $passwordMatches = false;
        if (empty($existing['password_hash'])) {
            $stmt = $pdo->prepare('UPDATE panel_users SET password_hash = :password_hash WHERE id = :id');
            $stmt->execute(['id' => $existingId, 'password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
            $passwordMatches = true;
        } else {
            $passwordMatches = password_verify($password, (string) $existing['password_hash']);
        }
        if ($passwordMatches) {
            $stmt = $pdo->prepare(
                'UPDATE panel_users
                 SET full_name = COALESCE(NULLIF(:full_name, ""), full_name),
                     document_number = COALESCE(NULLIF(:document_number, ""), document_number),
                     phone_number = COALESCE(NULLIF(:phone_number, ""), phone_number)
                 WHERE id = :id'
            );
            $stmt->execute([
                'id' => $existingId,
                'full_name' => $name,
                'document_number' => preg_replace('/\D+/', '', $document),
                'phone_number' => preg_replace('/\D+/', '', $phone),
            ]);
        }

        $hasActivePlan = false;
        if ((string) ($existing['subscription_status'] ?? '') === 'active') {
            $expiresAt = trim((string) ($existing['subscription_expires_at'] ?? ''));
            if ($expiresAt === '') {
                $hasActivePlan = true;
            } else {
                try {
                    $hasActivePlan = (new DateTimeImmutable($expiresAt)) > new DateTimeImmutable('now');
                } catch (Throwable $e) {
                    $hasActivePlan = false;
                }
            }
        }

        api_json([
            'success' => false,
            'code' => 'EMAIL_EXISTS',
            'message' => $hasActivePlan
                ? 'Este e-mail ja esta cadastrado. Faca login para continuar.'
                : ($passwordMatches
                    ? 'Este e-mail ja esta cadastrado e nao possui plano ativo.'
                    : 'Este e-mail ja esta cadastrado. Use a senha dessa conta para assinar ou faca login.'),
            'data' => [
                'userId' => $existingId,
                'hasActivePlan' => $hasActivePlan,
                'passwordMatches' => $passwordMatches,
            ],
        ], 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO panel_users (email, full_name, document_number, phone_number, password_hash, subscription_days, subscription_expires_at, subscription_status)
         VALUES (:email, :full_name, :document_number, :phone_number, :password_hash, 0, NULL, "inactive")'
    );
    $stmt->execute([
        'email' => $email,
        'full_name' => $name,
        'document_number' => preg_replace('/\D+/', '', $document),
        'phone_number' => preg_replace('/\D+/', '', $phone),
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
    $userId = (int) $pdo->lastInsertId();

    if ($planId <= 0) {
        api_json([
            'success' => true,
            'data' => [
                'userId' => $userId,
                'payment' => null,
            ],
        ]);
    }

    $payment = painel_create_pix_payment($userId, $planId, $name, $email, $document, $phone);
    api_json([
        'success' => true,
        'data' => [
            'userId' => $userId,
            'payment' => $payment,
        ],
    ]);
} catch (InvalidArgumentException $e) {
    api_json(['success' => false, 'message' => $e->getMessage()], 422);
} catch (Throwable $e) {
    api_json(['success' => false, 'message' => $e->getMessage()], 500);
}
