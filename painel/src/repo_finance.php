<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_finance_summary(): array
{
    $pdo = painel_db();

    $totalRevenue = (float) $pdo->query(
        "SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
         WHERE type = 'income' AND status = 'paid'"
    )->fetchColumn();

    $totalExpenses = (float) $pdo->query(
        "SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
         WHERE type = 'expense' AND status = 'paid'"
    )->fetchColumn();

    $currentMonthRevenue = (float) $pdo->query(
        "SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
         WHERE type = 'income' AND status = 'paid'
           AND YEAR(paid_at) = YEAR(CURDATE())
           AND MONTH(paid_at) = MONTH(CURDATE())"
    )->fetchColumn();

    $currentMonthExpenses = (float) $pdo->query(
        "SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
         WHERE type = 'expense' AND status = 'paid'
           AND YEAR(paid_at) = YEAR(CURDATE())
           AND MONTH(paid_at) = MONTH(CURDATE())"
    )->fetchColumn();

    $pending = (float) $pdo->query(
        "SELECT COALESCE(SUM(amount), 0) FROM financial_transactions
         WHERE type = 'income' AND status = 'pending'"
    )->fetchColumn();

    return [
        'total_revenue' => $totalRevenue,
        'total_expenses' => $totalExpenses,
        'net_total' => $totalRevenue - $totalExpenses,
        'month_revenue' => $currentMonthRevenue,
        'month_expenses' => $currentMonthExpenses,
        'month_net' => $currentMonthRevenue - $currentMonthExpenses,
        'pending_income' => $pending,
    ];
}

function painel_finance_recent_transactions(int $limit = 50): array
{
    $limit = max(1, min($limit, 500));
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT ft.id, ft.user_id, pu.email AS user_email, ft.description, ft.amount, ft.type, ft.status, ft.paid_at, ft.created_at
         FROM financial_transactions ft
         LEFT JOIN panel_users pu ON pu.id = ft.user_id
         ORDER BY ft.id DESC
         LIMIT :limit"
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function painel_finance_create_transaction(?int $userId, string $description, float $amount, string $type, string $status, ?string $paidAt = null): void
{
    $description = trim($description);
    if ($description === '') {
        throw new InvalidArgumentException('Descricao da transacao e obrigatoria.');
    }
    if ($amount <= 0) {
        throw new InvalidArgumentException('Valor da transacao deve ser maior que zero.');
    }
    if (!in_array($type, ['income', 'expense'], true)) {
        throw new InvalidArgumentException('Tipo de transacao invalido.');
    }
    if (!in_array($status, ['paid', 'pending', 'canceled'], true)) {
        throw new InvalidArgumentException('Status de transacao invalido.');
    }

    $paidAtValue = $paidAt ? trim($paidAt) : '';
    if ($paidAtValue === '') {
        $paidAtValue = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "INSERT INTO financial_transactions (user_id, description, amount, type, status, paid_at, created_at)
         VALUES (:user_id, :description, :amount, :type, :status, :paid_at, NOW())"
    );
    $stmt->execute([
        'user_id' => ($userId && $userId > 0) ? $userId : null,
        'description' => $description,
        'amount' => $amount,
        'type' => $type,
        'status' => $status,
        'paid_at' => $paidAtValue,
    ]);
}

