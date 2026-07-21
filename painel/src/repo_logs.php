<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_log(string $level, string $category, string $message, array $context = []): void
{
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'INSERT INTO system_logs (level, category, message, context_json, created_at)
         VALUES (:level, :category, :message, :context_json, NOW())'
    );
    $stmt->execute([
        'level' => mb_substr(trim($level) ?: 'info', 0, 20),
        'category' => mb_substr(trim($category) ?: 'system', 0, 50),
        'message' => mb_substr(trim($message), 0, 500),
        'context_json' => $context ? json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
    ]);
}

function painel_logs_recent(int $limit = 50): array
{
    $limit = max(1, min($limit, 500));
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'SELECT id, level, category, message, context_json, created_at
         FROM system_logs
         ORDER BY id DESC
         LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

