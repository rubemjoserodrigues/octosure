<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function painel_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = painel_env('DB_HOST', 'localhost');
    $port = painel_env('DB_PORT', '3306');
    $name = painel_env('DB_NAME');
    $user = painel_env('DB_USER');
    $pass = painel_env('DB_PASS');

    if (!$name || !$user || $pass === null) {
        throw new RuntimeException(
            'Configuracao de banco ausente. Verifique o arquivo /surebet/.env (DB_NAME, DB_USER, DB_PASS).'
        );
    }

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    $pdo = new PDO($dsn, $user, $pass, $opts);
    return $pdo;
}
