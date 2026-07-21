<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    painel_api_json_response([
        'ok' => false,
        'message' => 'Metodo nao permitido.',
    ], 405);
}

$viewer = painel_api_current_viewer(false, true);
$entryType = (string) ($_GET['entry_type'] ?? 'all');
$publicStatus = (string) ($_GET['public_status'] ?? 'all');
$sort = (string) ($_GET['sort'] ?? 'votes');
$limit = max(1, min((int) ($_GET['limit'] ?? 50), 100));

try {
    $items = painel_suggestions_public_list([
        'entry_type' => $entryType,
        'public_status' => $publicStatus,
        'sort' => $sort,
        'limit' => $limit,
    ], $viewer ? (int) $viewer['id'] : null);

    $stats = painel_suggestions_public_stats();
    $statusLabels = painel_suggestion_status_options();
    $entryLabels = painel_suggestion_entry_options();

    $out = [];
    foreach ($items as $item) {
        $out[] = [
            'id' => (int) $item['id'],
            'entryType' => (string) $item['entry_type'],
            'entryLabel' => $entryLabels[(string) $item['entry_type']] ?? (string) $item['entry_type'],
            'title' => (string) $item['title'],
            'details' => (string) $item['details'],
            'publicStatus' => (string) $item['public_status'],
            'statusLabel' => $statusLabels[(string) $item['public_status']] ?? (string) $item['public_status'],
            'createdAt' => (string) $item['created_at'],
            'publishAt' => $item['publish_at'] ? (string) $item['publish_at'] : null,
            'publishUntil' => $item['publish_until'] ? (string) $item['publish_until'] : null,
            'upvotes' => (int) ($item['upvotes'] ?? 0),
            'downvotes' => (int) ($item['downvotes'] ?? 0),
            'score' => (int) ($item['score'] ?? 0),
            'viewerVote' => $item['viewer_vote'] ? (string) $item['viewer_vote'] : null,
        ];
    }

    painel_api_json_response([
        'ok' => true,
        'viewer' => $viewer ? [
            'id' => (int) $viewer['id'],
            'kind' => (string) $viewer['kind'],
        ] : null,
        'stats' => $stats,
        'items' => $out,
    ]);
} catch (Throwable $e) {
    painel_api_json_response([
        'ok' => false,
        'message' => 'Falha ao listar sugestoes publicas.',
    ], 500);
}
