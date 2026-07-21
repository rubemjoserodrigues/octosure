<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    painel_api_json_response([
        'ok' => false,
        'message' => 'Metodo nao permitido.',
    ], 405);
}

$viewer = painel_api_current_viewer(true, false);
if (($viewer['kind'] ?? '') !== 'user') {
    painel_api_json_response([
        'ok' => false,
        'message' => 'Apenas usuarios ativos podem votar.',
    ], 403);
}

$payload = painel_api_read_json_body();
$suggestionId = (int) ($payload['suggestionId'] ?? 0);
$voteType = (string) ($payload['voteType'] ?? '');

try {
    $summary = painel_suggestion_cast_vote($suggestionId, (int) $viewer['id'], $voteType);
    painel_log('info', 'suggestions', 'Voto registrado em sugestao', [
        'suggestion_id' => $suggestionId,
        'user_id' => (int) $viewer['id'],
        'vote_type' => $voteType,
        'viewer_vote' => $summary['viewer_vote'],
    ]);

    painel_api_json_response([
        'ok' => true,
        'summary' => $summary,
    ]);
} catch (InvalidArgumentException $e) {
    painel_api_json_response([
        'ok' => false,
        'message' => $e->getMessage(),
    ], 400);
} catch (Throwable $e) {
    painel_api_json_response([
        'ok' => false,
        'message' => 'Falha ao registrar voto.',
    ], 500);
}
