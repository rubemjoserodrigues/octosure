<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_users_paginated(int $page, int $perPage): array
{
    $page = max(1, $page);
    $perPage = max(1, min($perPage, 100));
    $offset = ($page - 1) * $perPage;

    $pdo = painel_db();
    $total = (int) $pdo->query('SELECT COUNT(*) FROM panel_users')->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT id, email, created_at, subscription_days, subscription_expires_at, subscription_status
         FROM panel_users
         ORDER BY id DESC
         LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    return [
        'rows' => $rows,
        'total' => $total,
        'page' => $page,
        'per_page' => $perPage,
        'pages' => (int) max(1, ceil($total / $perPage)),
    ];
}

function painel_create_user(string $email, int $days, string $password): void
{
    $email = mb_strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('E-mail invalido.');
    }
    if (mb_strlen($password) < 6) {
        throw new InvalidArgumentException('Senha do usuario deve ter ao menos 6 caracteres.');
    }

    $days = max(0, $days);
    $status = $days > 0 ? 'active' : 'inactive';
    $expiresAt = $days > 0 ? (new DateTimeImmutable('now'))->modify('+' . $days . ' days')->format('Y-m-d H:i:s') : null;

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'INSERT INTO panel_users (email, password_hash, subscription_days, subscription_expires_at, subscription_status)
         VALUES (:email, :password_hash, :subscription_days, :subscription_expires_at, :subscription_status)'
    );
    $stmt->execute([
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'subscription_days' => $days,
        'subscription_expires_at' => $expiresAt,
        'subscription_status' => $status,
    ]);
}

function painel_update_subscription(int $id, int $days): void
{
    $days = max(0, $days);
    $status = $days > 0 ? 'active' : 'inactive';
    $expiresAt = $days > 0 ? (new DateTimeImmutable('now'))->modify('+' . $days . ' days')->format('Y-m-d H:i:s') : null;

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'UPDATE panel_users
         SET subscription_days = :subscription_days,
             subscription_expires_at = :subscription_expires_at,
             subscription_status = :subscription_status
         WHERE id = :id'
    );
    $stmt->execute([
        'id' => $id,
        'subscription_days' => $days,
        'subscription_expires_at' => $expiresAt,
        'subscription_status' => $status,
    ]);
}

function painel_set_user_status(int $id, string $status): void
{
    if ($id <= 0) {
        throw new InvalidArgumentException('Usuario invalido.');
    }
    if (!in_array($status, ['active', 'inactive'], true)) {
        throw new InvalidArgumentException('Status invalido.');
    }
    $pdo = painel_db();
    $stmt = $pdo->prepare('UPDATE panel_users SET subscription_status = :status WHERE id = :id');
    $stmt->execute([
        'id' => $id,
        'status' => $status,
    ]);
}

function painel_update_user_password(int $id, string $password): void
{
    if ($id <= 0) {
        throw new InvalidArgumentException('Usuario invalido.');
    }
    if (mb_strlen($password) < 6) {
        throw new InvalidArgumentException('Senha deve ter ao menos 6 caracteres.');
    }
    $pdo = painel_db();
    $stmt = $pdo->prepare('UPDATE panel_users SET password_hash = :password_hash WHERE id = :id');
    $stmt->execute([
        'id' => $id,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
}

function painel_users_summary(): array
{
    $pdo = painel_db();
    $row = $pdo->query(
        "SELECT
            COUNT(*) AS total_users,
            SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) AS active_users,
            SUM(CASE WHEN subscription_status = 'inactive' THEN 1 ELSE 0 END) AS inactive_users
         FROM panel_users"
    )->fetch();

    return [
        'total_users' => (int) ($row['total_users'] ?? 0),
        'active_users' => (int) ($row['active_users'] ?? 0),
        'inactive_users' => (int) ($row['inactive_users'] ?? 0),
    ];
}

function painel_user_by_id(int $userId): ?array
{
    if ($userId <= 0) {
        return null;
    }
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'SELECT id, email, full_name, document_number, phone_number, created_at, subscription_days, subscription_expires_at, subscription_status
         FROM panel_users
         WHERE id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function painel_user_finance_summary(int $userId): array
{
    if ($userId <= 0) {
        return [
            'income_paid' => 0.0,
            'expense_paid' => 0.0,
            'income_pending' => 0.0,
            'net_paid' => 0.0,
            'last_plan_value' => 0.0,
            'transactions_count' => 0,
        ];
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT
            COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END), 0) AS income_paid,
            COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END), 0) AS expense_paid,
            COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) AS income_pending,
            COUNT(*) AS transactions_count
         FROM financial_transactions
         WHERE user_id = :user_id"
    );
    $stmt->execute(['user_id' => $userId]);
    $row = $stmt->fetch() ?: [];

    $lastPlanStmt = $pdo->prepare(
        "SELECT amount
         FROM financial_transactions
         WHERE user_id = :user_id
           AND type = 'income'
         ORDER BY COALESCE(paid_at, created_at) DESC, id DESC
         LIMIT 1"
    );
    $lastPlanStmt->execute(['user_id' => $userId]);
    $lastPlan = (float) ($lastPlanStmt->fetchColumn() ?: 0);

    $incomePaid = (float) ($row['income_paid'] ?? 0);
    $expensePaid = (float) ($row['expense_paid'] ?? 0);

    return [
        'income_paid' => $incomePaid,
        'expense_paid' => $expensePaid,
        'income_pending' => (float) ($row['income_pending'] ?? 0),
        'net_paid' => $incomePaid - $expensePaid,
        'last_plan_value' => $lastPlan,
        'transactions_count' => (int) ($row['transactions_count'] ?? 0),
    ];
}

function painel_user_transactions(int $userId, int $limit = 20): array
{
    if ($userId <= 0) {
        return [];
    }
    $limit = max(1, min($limit, 200));
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT id, description, amount, type, status, paid_at, created_at
         FROM financial_transactions
         WHERE user_id = :user_id
         ORDER BY id DESC
         LIMIT :limit"
    );
    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function painel_user_logs(int $userId, string $email, int $limit = 30): array
{
    if ($userId <= 0) {
        return [];
    }
    $limit = max(1, min($limit, 300));
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT id, level, category, message, context_json, created_at
         FROM system_logs
         WHERE (
            context_json LIKE :ctx_id
            OR context_json LIKE :ctx_email
            OR message LIKE :msg_email
         )
         ORDER BY id DESC
         LIMIT :limit"
    );
    $stmt->bindValue(':ctx_id', '%\"user_id\":' . $userId . '%', PDO::PARAM_STR);
    $stmt->bindValue(':ctx_email', '%"email":"' . $email . '"%', PDO::PARAM_STR);
    $stmt->bindValue(':msg_email', '%' . $email . '%', PDO::PARAM_STR);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}
