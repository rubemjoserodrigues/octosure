<?php
declare(strict_types=1);

function painel_env_path(): string
{
    $custom = getenv('PAINEL_ENV_PATH');
    if (is_string($custom) && trim($custom) !== '' && is_file($custom)) {
        return $custom;
    }

    if (defined('PAINEL_BASE_DIR')) {
        $fromBootstrap = rtrim((string) PAINEL_BASE_DIR, '/\\') . DIRECTORY_SEPARATOR . '.env';
        if (is_file($fromBootstrap)) {
            return $fromBootstrap; // cPanel: /surebet/.env
        }
    }

    $default = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env'; // fallback local dev
    return $default;
}

function painel_load_env_file(?string $path = null): void
{
    $path = $path ?? painel_env_path();
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || substr($line, 0, 1) === '#') {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);
        $value = trim($value, "\"'");
        if ($key === '') {
            continue;
        }

        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

function painel_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false) {
        return $default;
    }
    return $value;
}

painel_load_env_file();
