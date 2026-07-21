<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
painel_require_src('repo_updates.php');

painel_updates_install_schema();
painel_updates_publish_due();

$kind = (string) ($_GET['kind'] ?? 'installer');
if (!in_array($kind, ['installer', 'blockmap', 'latest'], true)) {
    http_response_code(400);
    echo 'Arquivo invalido.';
    exit;
}

$release = painel_updates_latest_published();
if (!$release) {
    http_response_code(404);
    echo 'Nenhuma atualizacao publicada.';
    exit;
}

if ($kind === 'latest') {
    $fileName = 'latest.yml';
} elseif ($kind === 'blockmap') {
    $fileName = (string) ($release['blockmap_filename'] ?? '');
} else {
    $fileName = (string) ($release['installer_filename'] ?? '');
}

if ($fileName === '') {
    http_response_code(404);
    echo 'Arquivo nao publicado.';
    exit;
}

$safeFile = painel_updates_safe_filename($fileName);
$path = painel_updates_public_dir() . DIRECTORY_SEPARATOR . $safeFile;
if (!is_file($path)) {
    http_response_code(404);
    echo 'Arquivo nao encontrado.';
    exit;
}

painel_updates_record_download($release, $kind, $safeFile);

$mime = 'application/octet-stream';
if ($kind === 'latest') {
    $mime = 'text/yaml; charset=utf-8';
}

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($path));
header('Content-Disposition: attachment; filename="' . str_replace('"', '', $safeFile) . '"');
header('Cache-Control: no-cache, no-store, must-revalidate');
readfile($path);
