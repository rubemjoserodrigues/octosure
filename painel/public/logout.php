<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
painel_require_src('auth.php');

painel_logout();
header('Location: index.php');
exit;
