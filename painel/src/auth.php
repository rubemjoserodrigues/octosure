<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function painel_is_logged_in(): bool
{
    painel_start_session();
    return isset($_SESSION['admin_id']);
}

function painel_login(string $email, string $password): bool
{
    painel_start_session();
    $pdo = painel_db();
    $stmt = $pdo->prepare('SELECT id, email, password_hash FROM admins WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => mb_strtolower(trim($email))]);
    $admin = $stmt->fetch();

    if (!$admin) {
        return false;
    }

    if (!password_verify($password, (string) $admin['password_hash'])) {
        return false;
    }

    $_SESSION['admin_id'] = (int) $admin['id'];
    $_SESSION['admin_email'] = (string) $admin['email'];
    return true;
}

function painel_logout(): void
{
    painel_start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}

function painel_require_auth(): void
{
    if (painel_is_logged_in()) {
        return;
    }
    header('Location: index.php');
    exit;
}

function painel_set_flash(string $type, string $message): void
{
    painel_start_session();
    $_SESSION['flash'] = [
        'type' => $type,
        'message' => $message,
    ];
}

function painel_pull_flash(): ?array
{
    painel_start_session();
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return is_array($flash) ? $flash : null;
}
