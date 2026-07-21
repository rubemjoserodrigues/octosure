<?php
declare(strict_types=1);

putenv('PAINEL_SRC_PATH=' . __DIR__ . '/src');
putenv('PAINEL_ENV_PATH=' . __DIR__ . '/.env');

require __DIR__ . '/public/index.php';

