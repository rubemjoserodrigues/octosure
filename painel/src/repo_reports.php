<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_reports_monthly_user_registrations(int $months = 12): array
{
    $months = max(1, min($months, 36));
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS total
         FROM panel_users
         WHERE created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL :months MONTH)
         GROUP BY ym
         ORDER BY ym ASC"
    );
    $stmt->bindValue(':months', $months - 1, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $map = [];
    foreach ($rows as $row) {
        $map[(string) $row['ym']] = (int) $row['total'];
    }

    $out = [];
    $base = new DateTimeImmutable('first day of this month');
    for ($i = $months - 1; $i >= 0; $i--) {
        $d = $base->modify("-{$i} month");
        $ym = $d->format('Y-m');
        $out[] = [
            'ym' => $ym,
            'label' => $d->format('m/Y'),
            'total' => $map[$ym] ?? 0,
        ];
    }
    return $out;
}

function painel_reports_monthly_financial(int $months = 12): array
{
    $months = max(1, min($months, 36));
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT DATE_FORMAT(paid_at, '%Y-%m') AS ym,
                SUM(CASE WHEN type='income' AND status='paid' THEN amount ELSE 0 END) AS income_total,
                SUM(CASE WHEN type='expense' AND status='paid' THEN amount ELSE 0 END) AS expense_total
         FROM financial_transactions
         WHERE paid_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL :months MONTH)
         GROUP BY ym
         ORDER BY ym ASC"
    );
    $stmt->bindValue(':months', $months - 1, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $map = [];
    foreach ($rows as $row) {
        $map[(string) $row['ym']] = [
            'income' => (float) $row['income_total'],
            'expense' => (float) $row['expense_total'],
        ];
    }

    $out = [];
    $base = new DateTimeImmutable('first day of this month');
    for ($i = $months - 1; $i >= 0; $i--) {
        $d = $base->modify("-{$i} month");
        $ym = $d->format('Y-m');
        $income = $map[$ym]['income'] ?? 0.0;
        $expense = $map[$ym]['expense'] ?? 0.0;
        $out[] = [
            'ym' => $ym,
            'label' => $d->format('m/Y'),
            'income' => $income,
            'expense' => $expense,
            'net' => $income - $expense,
        ];
    }
    return $out;
}

function painel_reports_subscription_expiring(int $days = 30): array
{
    $days = max(1, min($days, 3650));
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT id, email, subscription_expires_at, subscription_status
         FROM panel_users
         WHERE subscription_expires_at IS NOT NULL
           AND subscription_expires_at >= NOW()
           AND subscription_expires_at <= DATE_ADD(NOW(), INTERVAL :days DAY)
         ORDER BY subscription_expires_at ASC"
    );
    $stmt->bindValue(':days', $days, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function painel_reports_subscription_status(): array
{
    $pdo = painel_db();
    $rows = $pdo->query(
        "SELECT subscription_status, COUNT(*) AS total
         FROM panel_users
         GROUP BY subscription_status"
    )->fetchAll();
    $out = ['active' => 0, 'inactive' => 0];
    foreach ($rows as $row) {
        $k = (string) $row['subscription_status'];
        if (array_key_exists($k, $out)) {
            $out[$k] = (int) $row['total'];
        }
    }
    return $out;
}

