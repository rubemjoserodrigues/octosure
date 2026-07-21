<?php
declare(strict_types=1);

define('PAINEL_BASE_DIR', __DIR__);
define('PAINEL_DEFAULT_SRC_DIR', PAINEL_BASE_DIR . '/src');

// Permite override explicito apenas se necessario.
$customSrc = getenv('PAINEL_SRC_PATH');
if (is_string($customSrc) && trim($customSrc) !== '') {
    define('PAINEL_SRC_DIR', rtrim($customSrc, '/\\'));
} else {
    define('PAINEL_SRC_DIR', PAINEL_DEFAULT_SRC_DIR);
}

function painel_require_src(string $file): void
{
    $path = PAINEL_SRC_DIR . '/' . ltrim($file, '/\\');
    if (is_file($path)) {
        require_once $path;
        return;
    }

    http_response_code(500);
    echo 'Erro: arquivo interno nao encontrado em PAINEL_SRC_DIR. Verifique /surebet/src. Arquivo: '
        . htmlspecialchars($file, ENT_QUOTES, 'UTF-8');
    exit;
}
