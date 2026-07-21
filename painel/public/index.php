<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
painel_require_src('auth.php');

if (painel_is_logged_in()) {
    header('Location: users.php');
    exit;
}

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = (string) ($_POST['email'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    if (painel_login($email, $password)) {
        header('Location: users.php');
        exit;
    }
    $error = 'Usuario ou senha invalidos.';
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel - Login</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/surebet/public/assets/css/painel.css?v=3">
</head>
<body class="login-body">
  <main class="login-shell">
    <div class="login-card">
      <div class="avatar-circle" aria-hidden="true"></div>
      <form method="post" class="login-form" autocomplete="off">
        <label for="email">Usuario</label>
        <input id="email" name="email" type="email" placeholder="Ex: admin@email.com" required>

        <label for="password">Senha</label>
        <input id="password" name="password" type="password" placeholder="Ex: 11242563467" required>

        <?php if ($error): ?>
          <p class="error-text"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
        <?php endif; ?>

        <button type="submit" class="btn btn-primary btn-full">Entrar</button>
      </form>
    </div>
  </main>
</body>
</html>
