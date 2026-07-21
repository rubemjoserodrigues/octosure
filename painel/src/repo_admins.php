<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_admins_list(): array
{
    $pdo = painel_db();
    $stmt = $pdo->query('SELECT id, email, created_at FROM admins ORDER BY id DESC');
    return $stmt->fetchAll();
}

function painel_create_admin(string $email, string $password): void
{
    $email = mb_strtolower(trim($email));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('E-mail de admin invalido.');
    }
    if (mb_strlen($password) < 6) {
        throw new InvalidArgumentException('Senha do admin deve ter ao menos 6 caracteres.');
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare('INSERT INTO admins (email, password_hash) VALUES (:email, :password_hash)');
    $stmt->execute([
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
}

function painel_update_admin_password(int $adminId, string $password): void
{
    if ($adminId <= 0) {
        throw new InvalidArgumentException('Admin invalido.');
    }
    if (mb_strlen($password) < 6) {
        throw new InvalidArgumentException('Nova senha deve ter ao menos 6 caracteres.');
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare('UPDATE admins SET password_hash = :password_hash WHERE id = :id');
    $stmt->execute([
        'id' => $adminId,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
}

