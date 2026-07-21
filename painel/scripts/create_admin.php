<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/src/db.php';

if (PHP_SAPI !== 'cli') {
    echo "Execute via CLI.\n";
    exit(1);
}

$email = $argv[1] ?? null;
$password = $argv[2] ?? null;

if (!$email || !$password) {
    echo "Uso: php scripts/create_admin.php <email> <senha>\n";
    exit(1);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo "E-mail invalido.\n";
    exit(1);
}

$pdo = painel_db();
$stmt = $pdo->prepare('INSERT INTO admins (email, password_hash) VALUES (:email, :password_hash)');
$stmt->execute([
    'email' => mb_strtolower(trim($email)),
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
]);

echo "Admin criado com sucesso.\n";

