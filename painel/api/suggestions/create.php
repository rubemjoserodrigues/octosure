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
        'message' => 'Apenas usuarios ativos podem enviar sugestoes.',
    ], 403);
}

$payload = painel_api_read_json_body();
$title = (string) ($payload['title'] ?? '');
$details = (string) ($payload['details'] ?? '');

try {
    $suggestionId = painel_suggestion_create_from_user($viewer, $title, $details);
    painel_log('info', 'suggestions', 'Sugestao criada por usuario', [
        'suggestion_id' => $suggestionId,
        'user_id' => (int) $viewer['id'],
    ]);

    painel_api_json_response([
        'ok' => true,
        'message' => 'Sugestao enviada para aprovacao.',
        'suggestionId' => $suggestionId,
    ], 201);
} catch (InvalidArgumentException $e) {
    painel_api_json_response([
        'ok' => false,
        'message' => $e->getMessage(),
    ], 400);
} catch (Throwable $e) {
    painel_api_json_response([
        'ok' => false,
        'message' => 'Falha ao enviar sugestao.',
    ], 500);
}
