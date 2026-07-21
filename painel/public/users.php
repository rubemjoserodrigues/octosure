<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
painel_require_src('auth.php');
painel_require_src('repo_users.php');
painel_require_src('repo_admins.php');
painel_require_src('repo_settings.php');
painel_require_src('repo_logs.php');
painel_require_src('repo_finance.php');
painel_require_src('repo_reports.php');
painel_require_src('repo_suggestions.php');
painel_require_src('repo_updates.php');
painel_require_src('repo_plans.php');

painel_require_auth();
painel_updates_install_schema();
painel_updates_publish_due();
painel_plans_install_schema();

function h(string $v): string
{
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

function moeda(float $v): string
{
    return 'R$ ' . number_format($v, 2, ',', '.');
}

function dt_local_value(?string $value): string
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return '';
    }
    $ts = strtotime($raw);
    if ($ts === false) {
        return '';
    }
    return date('Y-m-d\TH:i', $ts);
}

function suggestion_entry_label(string $value): string
{
    $options = painel_suggestion_entry_options();
    return (string) ($options[$value] ?? $value);
}

function suggestion_approval_label(string $value): string
{
    $options = painel_suggestion_approval_options();
    return (string) ($options[$value] ?? $value);
}

function suggestion_status_label(string $value): string
{
    $options = painel_suggestion_status_options();
    return (string) ($options[$value] ?? $value);
}

function bytes_label(int $bytes): string
{
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2, ',', '.') . ' GB';
    }
    if ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2, ',', '.') . ' MB';
    }
    if ($bytes >= 1024) {
        return number_format($bytes / 1024, 2, ',', '.') . ' KB';
    }
    return $bytes . ' B';
}

function csv_out(string $filename, array $headers, array $rows): void
{
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $out = fopen('php://output', 'w');
    if ($out === false) {
        exit;
    }
    fputcsv($out, $headers, ';');
    foreach ($rows as $row) {
        fputcsv($out, $row, ';');
    }
    fclose($out);
    exit;
}

$allowedTabs = ['overview', 'users', 'finance', 'plans', 'reports', 'suggestions', 'updates', 'admins', 'settings', 'logs'];
$tab = (string) ($_GET['tab'] ?? 'overview');
if (!in_array($tab, $allowedTabs, true)) {
    $tab = 'overview';
}

if (isset($_GET['export'])) {
    $type = (string) $_GET['export'];
    if ($type === 'monthly_users') {
        $data = painel_reports_monthly_user_registrations(12);
        $rows = [];
        foreach ($data as $r) {
            $rows[] = [$r['label'], $r['total']];
        }
        csv_out('relatorio_usuarios_mensal.csv', ['Mes', 'Usuarios'], $rows);
    }
    if ($type === 'monthly_finance') {
        $data = painel_reports_monthly_financial(12);
        $rows = [];
        foreach ($data as $r) {
            $rows[] = [$r['label'], number_format((float) $r['income'], 2, '.', ''), number_format((float) $r['expense'], 2, '.', ''), number_format((float) $r['net'], 2, '.', '')];
        }
        csv_out('relatorio_financeiro_mensal.csv', ['Mes', 'Receita', 'Despesa', 'Liquido'], $rows);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $redirectTab = (string) ($_POST['tab'] ?? $tab);
    if (!in_array($redirectTab, $allowedTabs, true)) {
        $redirectTab = 'overview';
    }

    try {
        if ($action === 'create_user') {
            $email = (string) ($_POST['email'] ?? '');
            $days = (int) ($_POST['subscription_days'] ?? 0);
            $password = (string) ($_POST['password'] ?? '');
            painel_create_user($email, $days, $password);
            painel_log('info', 'users', 'Usuario criado', ['email' => $email, 'days' => $days]);
            painel_set_flash('ok', 'Usuario adicionado com sucesso.');
        } elseif ($action === 'update_subscription') {
            $id = (int) ($_POST['user_id'] ?? 0);
            $days = (int) ($_POST['subscription_days'] ?? 0);
            painel_update_subscription($id, $days);
            painel_log('info', 'users', 'Assinatura atualizada', ['user_id' => $id, 'days' => $days]);
            painel_set_flash('ok', 'Assinatura atualizada com sucesso.');
        } elseif ($action === 'toggle_user_status') {
            $id = (int) ($_POST['user_id'] ?? 0);
            $status = (string) ($_POST['status'] ?? 'inactive');
            painel_set_user_status($id, $status);
            painel_log('info', 'users', 'Status de usuario alterado', ['user_id' => $id, 'status' => $status]);
            painel_set_flash('ok', 'Status do usuario atualizado.');
        } elseif ($action === 'update_user_password') {
            $id = (int) ($_POST['user_id'] ?? 0);
            $password = (string) ($_POST['password'] ?? '');
            painel_update_user_password($id, $password);
            painel_log('warn', 'users', 'Senha de usuario alterada', ['user_id' => $id]);
            painel_set_flash('ok', 'Senha do usuario atualizada.');
        } elseif ($action === 'create_admin') {
            $email = (string) ($_POST['email'] ?? '');
            $password = (string) ($_POST['password'] ?? '');
            painel_create_admin($email, $password);
            painel_log('warn', 'admins', 'Novo admin criado', ['email' => $email]);
            painel_set_flash('ok', 'Admin criado com sucesso.');
        } elseif ($action === 'update_admin_password') {
            $adminId = (int) ($_POST['admin_id'] ?? 0);
            $password = (string) ($_POST['password'] ?? '');
            painel_update_admin_password($adminId, $password);
            painel_log('warn', 'admins', 'Senha de admin alterada', ['admin_id' => $adminId]);
            painel_set_flash('ok', 'Senha do admin atualizada.');
        } elseif ($action === 'save_settings') {
            $appName = trim((string) ($_POST['app_name'] ?? 'Painel Surebet'));
            $timezone = trim((string) ($_POST['timezone'] ?? 'America/Sao_Paulo'));
            $houses = isset($_POST['houses_filter_enabled']) ? '1' : '0';
            $retention = max(1, (int) ($_POST['logs_retention_days'] ?? 30));
            $pagouEnvironment = (string) ($_POST['pagou_environment'] ?? 'sandbox');
            if (!in_array($pagouEnvironment, ['sandbox', 'production'], true)) {
                $pagouEnvironment = 'sandbox';
            }
            painel_setting_set('app_name', $appName === '' ? 'Painel Surebet' : $appName);
            painel_setting_set('timezone', $timezone === '' ? 'America/Sao_Paulo' : $timezone);
            painel_setting_set('houses_filter_enabled', $houses);
            painel_setting_set('logs_retention_days', (string) $retention);
            painel_setting_set('pagou_environment', $pagouEnvironment);
            painel_setting_set('pagou_token', trim((string) ($_POST['pagou_token'] ?? '')));
            painel_setting_set('pagou_base_url', trim((string) ($_POST['pagou_base_url'] ?? '')));
            painel_setting_set('pagou_webhook_url', trim((string) ($_POST['pagou_webhook_url'] ?? '')));
            painel_setting_set('pagou_webhook_security_token', trim((string) ($_POST['pagou_webhook_security_token'] ?? '')));
            painel_log('info', 'settings', 'Configuracoes atualizadas', ['timezone' => $timezone, 'houses_filter_enabled' => $houses]);
            painel_set_flash('ok', 'Configuracoes salvas com sucesso.');
        } elseif ($action === 'save_plan') {
            $planId = painel_plan_save($_POST);
            painel_log('info', 'plans', 'Plano salvo', [
                'plan_id' => $planId,
                'name' => (string) ($_POST['name'] ?? ''),
                'duration_days' => (int) ($_POST['duration_days'] ?? 0),
            ]);
            painel_set_flash('ok', 'Plano salvo com sucesso.');
        } elseif ($action === 'toggle_plan') {
            $planId = (int) ($_POST['plan_id'] ?? 0);
            $active = (string) ($_POST['is_active'] ?? '0') === '1';
            painel_plan_toggle($planId, $active);
            painel_log('info', 'plans', 'Status de plano alterado', ['plan_id' => $planId, 'active' => $active]);
            painel_set_flash('ok', 'Status do plano atualizado.');
        } elseif ($action === 'create_transaction') {
            $userIdRaw = trim((string) ($_POST['user_id'] ?? ''));
            $userId = $userIdRaw === '' ? null : (int) $userIdRaw;
            $description = (string) ($_POST['description'] ?? '');
            $amount = (float) ($_POST['amount'] ?? 0);
            $type = (string) ($_POST['type'] ?? 'income');
            $status = (string) ($_POST['status'] ?? 'paid');
            $paidAt = (string) ($_POST['paid_at'] ?? '');
            painel_finance_create_transaction($userId, $description, $amount, $type, $status, $paidAt);
            painel_log('info', 'finance', 'Transacao registrada', ['description' => $description, 'amount' => $amount, 'type' => $type, 'status' => $status]);
            painel_set_flash('ok', 'Transacao registrada com sucesso.');
        } elseif ($action === 'save_suggestion') {
            $adminId = (int) ($_SESSION['admin_id'] ?? 0);
            $adminEmail = (string) ($_SESSION['admin_email'] ?? '');
            $suggestionId = painel_suggestion_save_admin($_POST, $adminId, $adminEmail);
            painel_log('info', 'suggestions', 'Sugestao salva no painel admin', [
                'suggestion_id' => $suggestionId,
                'admin_id' => $adminId,
            ]);
            painel_set_flash('ok', 'Sugestao atualizada com sucesso.');
        } elseif ($action === 'delete_suggestion') {
            $suggestionId = (int) ($_POST['suggestion_id'] ?? 0);
            painel_suggestion_delete_admin($suggestionId);
            painel_log('warn', 'suggestions', 'Sugestao excluida no painel admin', [
                'suggestion_id' => $suggestionId,
                'admin_id' => (int) ($_SESSION['admin_id'] ?? 0),
            ]);
            painel_set_flash('ok', 'Sugestao excluida com sucesso.');
        } elseif ($action === 'save_release') {
            $adminId = (int) ($_SESSION['admin_id'] ?? 0);
            $releaseId = painel_updates_save_release($_POST, $_FILES, $adminId);
            painel_log('info', 'updates', 'Release salva no painel admin', [
                'release_id' => $releaseId,
                'version' => (string) ($_POST['version'] ?? ''),
                'status' => (string) ($_POST['status'] ?? ''),
            ]);
            painel_set_flash('ok', 'Atualizacao salva com sucesso.');
        } elseif ($action === 'publish_release') {
            $releaseId = (int) ($_POST['release_id'] ?? 0);
            painel_updates_publish_release($releaseId);
            painel_log('warn', 'updates', 'Release publicada', [
                'release_id' => $releaseId,
                'admin_id' => (int) ($_SESSION['admin_id'] ?? 0),
            ]);
            painel_set_flash('ok', 'Atualizacao publicada e latest.yml gerado.');
        } elseif ($action === 'archive_release') {
            $releaseId = (int) ($_POST['release_id'] ?? 0);
            painel_updates_archive_release($releaseId);
            painel_log('warn', 'updates', 'Release arquivada', [
                'release_id' => $releaseId,
                'admin_id' => (int) ($_SESSION['admin_id'] ?? 0),
            ]);
            painel_set_flash('ok', 'Atualizacao arquivada.');
        }
    } catch (Throwable $e) {
        painel_set_flash('error', $e->getMessage());
    }

    header('Location: users.php?tab=' . urlencode($redirectTab));
    exit;
}

$flash = painel_pull_flash();
$flashType = (string) ($flash['type'] ?? 'ok');
$flashMessage = (string) ($flash['message'] ?? '');

$settings = painel_settings_all();
$timezone = trim((string) ($settings['timezone'] ?? 'America/Sao_Paulo'));
if ($timezone === '') {
    $timezone = 'America/Sao_Paulo';
}
@date_default_timezone_set($timezone);

$summary = painel_users_summary();
$admins = painel_admins_list();
$logs = painel_logs_recent(120);
$financeSummary = painel_finance_summary();
$transactions = painel_finance_recent_transactions(120);
$suggestionsSummary = painel_suggestions_summary();
$suggestionsRows = painel_suggestions_admin_list();
$updatesRows = painel_updates_list();
$plansRows = painel_plans_list(true);
$latestRelease = painel_updates_latest_published();
$scriptDir = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/users.php')));
$assetBase = rtrim($scriptDir, '/');
if ($assetBase === '/' || $assetBase === '.') {
    $assetBase = '';
}

$monthlyUsers = painel_reports_monthly_user_registrations(12);
$monthlyFinance = painel_reports_monthly_financial(12);
$expiring7 = painel_reports_subscription_expiring(7);
$expiring30 = painel_reports_subscription_expiring(30);
$statusBreakdown = painel_reports_subscription_status();

$page = max(1, (int) ($_GET['page'] ?? 1));
$usersData = painel_users_paginated($page, 14);
$userRows = $usersData['rows'];
$selectedUserId = max(0, (int) ($_GET['user_id'] ?? 0));
$selectedUser = $selectedUserId > 0 ? painel_user_by_id($selectedUserId) : null;
$selectedUserFinance = $selectedUser ? painel_user_finance_summary((int) $selectedUser['id']) : null;
$selectedUserTransactions = $selectedUser ? painel_user_transactions((int) $selectedUser['id'], 20) : [];
$selectedUserLogs = $selectedUser ? painel_user_logs((int) $selectedUser['id'], (string) $selectedUser['email'], 30) : [];

$appName = $settings['app_name'] ?? 'Painel Surebet';
$currentAdminEmail = (string) ($_SESSION['admin_email'] ?? 'admin');
$maxUsersMonthly = 1;
foreach ($monthlyUsers as $mu) {
    $maxUsersMonthly = max($maxUsersMonthly, (int) $mu['total']);
}
$maxFinanceMonthly = 1.0;
foreach ($monthlyFinance as $mf) {
    $maxFinanceMonthly = max($maxFinanceMonthly, (float) $mf['income'], (float) $mf['expense'], abs((float) $mf['net']));
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= h((string) $appName) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= h($assetBase . '/assets/css/painel.css?v=6') ?>">
</head>
<body class="panel-body">
  <div class="panel-shell">
    <aside class="side-nav">
      <a class="menu-link <?= $tab === 'overview' ? 'active' : '' ?>" href="?tab=overview"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h7V4H4v9zm9 7h7v-7h-7v7zM4 20h7v-5H4v5zm9-9h7V4h-7v7z"/></svg></span><span>Dashboard</span></a>
      <a class="menu-link <?= $tab === 'users' ? 'active' : '' ?>" href="?tab=users"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></span><span>Usuarios</span></a>
      <a class="menu-link <?= $tab === 'finance' ? 'active' : '' ?>" href="?tab=finance"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.93 8H7.07C7.56 7.28 9.58 5.5 12 5.5S16.44 7.28 16.93 10z"/></svg></span><span>Financeiro</span></a>
      <a class="menu-link <?= $tab === 'plans' ? 'active' : '' ?>" href="?tab=plans"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v4H4V4zm0 6h7v10H4V10zm9 0h7v10h-7V10z"/></svg></span><span>Planos</span></a>
      <a class="menu-link <?= $tab === 'reports' ? 'active' : '' ?>" href="?tab=reports"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v2H3V3zm2 4h14v14H5V7zm3 9h2v3H8v-3zm3-4h2v7h-2v-7zm3 2h2v5h-2v-5z"/></svg></span><span>Relatorios</span></a>
      <a class="menu-link <?= $tab === 'suggestions' ? 'active' : '' ?>" href="?tab=suggestions"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 00-4 12.74V18a1 1 0 001 1h6a1 1 0 001-1v-3.26A7 7 0 0012 2zm-2 18h4v1h-4v-1zm4-3.9V17h-4v-.9l-.39-.28A5 5 0 1114.39 16.1z"/></svg></span><span>Sugestoes</span></a>
      <a class="menu-link <?= $tab === 'updates' ? 'active' : '' ?>" href="?tab=updates"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 00-9 9h2.5l-3.25 3.25L-1 12h2a11 11 0 1111 11v-2a9 9 0 000-18zm1 5v5h4v2h-6V8h2z"/></svg></span><span>Atualizacoes</span></a>
      <a class="menu-link <?= $tab === 'admins' ? 'active' : '' ?>" href="?tab=admins"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg></span><span>Admins</span></a>
      <a class="menu-link <?= $tab === 'settings' ? 'active' : '' ?>" href="?tab=settings"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.07 7.07 0 00-1.63-.94l-.36-2.54A.5.5 0 0013.9 2h-3.8a.5.5 0 00-.49.42L9.25 4.96c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.71 8.48a.5.5 0 00.12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.51.4 1.05.72 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z"/></svg></span><span>Configuracoes</span></a>
      <a class="menu-link <?= $tab === 'logs' ? 'active' : '' ?>" href="?tab=logs"><span class="menu-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 12H7v-2h10v2zm0-4H7V9h10v2zm0-4H7V5h10v2z"/></svg></span><span>Logs</span></a>
    </aside>

    <section class="panel-content">
      <header class="panel-topbar">
        <div class="topbar-app"><?= h((string) $appName) ?></div>
        <div class="top-actions">
          <span class="avatar-mini"></span>
          <span class="top-email"><?= h($currentAdminEmail) ?></span>
          <a href="logout.php" class="btn btn-ghost">Sair</a>
        </div>
      </header>

      <?php if ($flashMessage !== ''): ?>
        <div class="flash flash-<?= h($flashType) ?>"><?= h($flashMessage) ?></div>
      <?php endif; ?>

      <?php if ($tab === 'overview'): ?>
        <main class="section-card">
          <div class="section-header"><h1>Dashboard</h1></div>
          <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Usuarios totais</span><strong><?= (int) $summary['total_users'] ?></strong></div>
            <div class="stat-item"><span class="stat-label">Assinaturas ativas</span><strong><?= (int) $summary['active_users'] ?></strong></div>
            <div class="stat-item"><span class="stat-label">Receita mes</span><strong><?= h(moeda((float) $financeSummary['month_revenue'])) ?></strong></div>
            <div class="stat-item"><span class="stat-label">Liquido mes</span><strong><?= h(moeda((float) $financeSummary['month_net'])) ?></strong></div>
          </div>

          <div class="charts-grid">
            <section class="chart-card">
              <h3>Usuarios por mes (12 meses)</h3>
              <div class="bars-row">
                <?php foreach ($monthlyUsers as $row): ?>
                  <?php $hPct = ((int) $row['total'] / $maxUsersMonthly) * 100; ?>
                  <div class="bar-col" title="<?= h((string) $row['label'] . ': ' . (string) $row['total']) ?>">
                    <div class="bar-fill" style="height: <?= max(4, (int) $hPct) ?>%"></div>
                    <span><?= h((string) $row['label']) ?></span>
                  </div>
                <?php endforeach; ?>
              </div>
            </section>

            <section class="chart-card">
              <h3>Financeiro mensal (12 meses)</h3>
              <div class="bars-row dual">
                <?php foreach ($monthlyFinance as $row): ?>
                  <?php
                    $incPct = ((float) $row['income'] / $maxFinanceMonthly) * 100;
                    $expPct = ((float) $row['expense'] / $maxFinanceMonthly) * 100;
                  ?>
                  <div class="bar-col" title="<?= h((string) $row['label']) ?>">
                    <div class="bar-fill income" style="height: <?= max(4, (int) $incPct) ?>%"></div>
                    <div class="bar-fill expense" style="height: <?= max(4, (int) $expPct) ?>%"></div>
                    <span><?= h((string) $row['label']) ?></span>
                  </div>
                <?php endforeach; ?>
              </div>
            </section>
          </div>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'users'): ?>
        <main class="section-card">
          <div class="section-header">
            <h1>Usuarios</h1>
            <button class="btn btn-primary" data-open-modal="create-user-modal">Adicionar usuario</button>
          </div>
          <div class="table-wrap">
            <table class="users-table">
              <thead><tr><th>ID</th><th>E-mail</th><th>Data de registro</th><th>Vencimento</th><th>Assinatura</th><th></th></tr></thead>
              <tbody>
                <?php if (!$userRows): ?><tr><td colspan="6" class="empty-row">Nenhum usuario cadastrado.</td></tr><?php endif; ?>
                <?php foreach ($userRows as $row): ?>
                  <?php $isActive = ((string) $row['subscription_status']) === 'active'; $expires = $row['subscription_expires_at'] ? date('d/m/Y', strtotime((string) $row['subscription_expires_at'])) : '-'; ?>
                  <tr class="<?= ((int) $row['id'] === $selectedUserId) ? 'row-selected' : '' ?>">
                    <td><?= (int) $row['id'] ?></td>
                    <td><a class="user-link" href="?tab=users&page=<?= (int) $usersData['page'] ?>&user_id=<?= (int) $row['id'] ?>"><?= h((string) $row['email']) ?></a></td>
                    <td><?= date('d/m/Y', strtotime((string) $row['created_at'])) ?></td>
                    <td><?= h($expires) ?></td>
                    <td>
                      <form method="post" class="inline-form">
                        <input type="hidden" name="action" value="toggle_user_status">
                        <input type="hidden" name="tab" value="users">
                        <input type="hidden" name="user_id" value="<?= (int) $row['id'] ?>">
                        <input type="hidden" name="status" value="<?= $isActive ? 'inactive' : 'active' ?>">
                        <button type="submit" class="status-pill <?= $isActive ? 'active' : 'inactive' ?> clickable"><?= $isActive ? 'Ativo' : 'Inativo' ?></button>
                      </form>
                    </td>
                    <td class="actions-col">
                      <a class="kebab-btn" href="?tab=users&page=<?= (int) $usersData['page'] ?>&user_id=<?= (int) $row['id'] ?>">Detalhes</a>
                      <button class="kebab-btn" data-open-modal="manage-sub-modal" data-user-id="<?= (int) $row['id'] ?>" data-user-email="<?= h((string) $row['email']) ?>">Plano</button>
                      <button class="kebab-btn" data-open-modal="manage-user-password-modal" data-user-id="<?= (int) $row['id'] ?>" data-user-email="<?= h((string) $row['email']) ?>">Senha</button>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
          <nav class="pagination">
            <?php $prev = max(1, $usersData['page'] - 1); $next = min($usersData['pages'], $usersData['page'] + 1); ?>
            <a class="page-btn <?= $usersData['page'] <= 1 ? 'disabled' : '' ?>" href="?tab=users&page=<?= $prev ?>">&lt;&lt;</a>
            <?php for ($i = 1; $i <= $usersData['pages']; $i++): ?><a class="page-btn <?= $i === $usersData['page'] ? 'active' : '' ?>" href="?tab=users&page=<?= $i ?><?= $selectedUserId > 0 ? '&user_id=' . (int) $selectedUserId : '' ?>"><?= $i ?></a><?php endfor; ?>
            <a class="page-btn <?= $usersData['page'] >= $usersData['pages'] ? 'disabled' : '' ?>" href="?tab=users&page=<?= $next ?><?= $selectedUserId > 0 ? '&user_id=' . (int) $selectedUserId : '' ?>">&gt;&gt;</a>
          </nav>

          <section class="user-detail-card">
            <div class="section-header">
              <h2>Detalhes do usuario</h2>
            </div>

            <?php if (!$selectedUser): ?>
              <div class="detail-empty">Clique em um usuario para ver todas as informacoes, plano, financeiro e logs.</div>
            <?php else: ?>
              <?php
                $selStatusActive = ((string) $selectedUser['subscription_status']) === 'active';
                $selExpires = $selectedUser['subscription_expires_at'] ? date('d/m/Y H:i', strtotime((string) $selectedUser['subscription_expires_at'])) : '-';
                $selCreated = date('d/m/Y H:i', strtotime((string) $selectedUser['created_at']));
              ?>
              <div class="detail-kpis">
                <div class="stat-item"><span class="stat-label">ID</span><strong>#<?= (int) $selectedUser['id'] ?></strong></div>
                <div class="stat-item"><span class="stat-label">E-mail</span><strong><?= h((string) $selectedUser['email']) ?></strong></div>
                <div class="stat-item"><span class="stat-label">Status</span><strong><?= $selStatusActive ? 'Ativo' : 'Inativo' ?></strong></div>
                <div class="stat-item"><span class="stat-label">Criado em</span><strong><?= h($selCreated) ?></strong></div>
                <div class="stat-item"><span class="stat-label">Vencimento</span><strong><?= h($selExpires) ?></strong></div>
                <div class="stat-item"><span class="stat-label">Dias de assinatura</span><strong><?= (int) $selectedUser['subscription_days'] ?></strong></div>
                <div class="stat-item"><span class="stat-label">Valor plano (ultimo)</span><strong><?= h(moeda((float) ($selectedUserFinance['last_plan_value'] ?? 0))) ?></strong></div>
                <div class="stat-item"><span class="stat-label">Transacoes</span><strong><?= (int) ($selectedUserFinance['transactions_count'] ?? 0) ?></strong></div>
              </div>

              <div class="detail-kpis">
                <div class="stat-item"><span class="stat-label">Receita paga</span><strong><?= h(moeda((float) ($selectedUserFinance['income_paid'] ?? 0))) ?></strong></div>
                <div class="stat-item"><span class="stat-label">Despesa paga</span><strong><?= h(moeda((float) ($selectedUserFinance['expense_paid'] ?? 0))) ?></strong></div>
                <div class="stat-item"><span class="stat-label">Pendente</span><strong><?= h(moeda((float) ($selectedUserFinance['income_pending'] ?? 0))) ?></strong></div>
                <div class="stat-item"><span class="stat-label">Liquido</span><strong><?= h(moeda((float) ($selectedUserFinance['net_paid'] ?? 0))) ?></strong></div>
              </div>

              <div class="detail-grid">
                <div class="table-wrap">
                  <h3 class="detail-title">Historico financeiro do usuario</h3>
                  <table class="users-table">
                    <thead><tr><th>ID</th><th>Descricao</th><th>Valor</th><th>Tipo</th><th>Status</th><th>Pagamento</th></tr></thead>
                    <tbody>
                      <?php if (!$selectedUserTransactions): ?><tr><td colspan="6" class="empty-row">Sem transacoes para este usuario.</td></tr><?php endif; ?>
                      <?php foreach ($selectedUserTransactions as $tr): ?>
                        <tr>
                          <td><?= (int) $tr['id'] ?></td>
                          <td><?= h((string) $tr['description']) ?></td>
                          <td><?= h(moeda((float) $tr['amount'])) ?></td>
                          <td><?= h((string) $tr['type']) ?></td>
                          <td><?= h((string) $tr['status']) ?></td>
                          <td><?= $tr['paid_at'] ? date('d/m/Y H:i', strtotime((string) $tr['paid_at'])) : '-' ?></td>
                        </tr>
                      <?php endforeach; ?>
                    </tbody>
                  </table>
                </div>

                <div class="table-wrap">
                  <h3 class="detail-title">Logs relacionados ao usuario</h3>
                  <table class="users-table">
                    <thead><tr><th>Data</th><th>Nivel</th><th>Categoria</th><th>Mensagem</th></tr></thead>
                    <tbody>
                      <?php if (!$selectedUserLogs): ?><tr><td colspan="4" class="empty-row">Sem logs para este usuario.</td></tr><?php endif; ?>
                      <?php foreach ($selectedUserLogs as $log): ?>
                        <tr>
                          <td><?= date('d/m/Y H:i:s', strtotime((string) $log['created_at'])) ?></td>
                          <td><?= h((string) $log['level']) ?></td>
                          <td><?= h((string) $log['category']) ?></td>
                          <td><?= h((string) $log['message']) ?></td>
                        </tr>
                      <?php endforeach; ?>
                    </tbody>
                  </table>
                </div>
              </div>
            <?php endif; ?>
          </section>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'plans'): ?>
        <main class="section-card">
          <div class="section-header">
            <h1>Planos</h1>
            <button class="btn btn-primary" data-open-modal="manage-plan-modal">Novo plano</button>
          </div>
          <div class="overview-meta">
            <span>Esses planos ficam disponiveis para cadastro, renovacao e upgrade no app e no site.</span>
          </div>
          <div class="table-wrap">
            <table class="users-table">
              <thead><tr><th>Ordem</th><th>Plano</th><th>Acesso</th><th>Duracao</th><th>Valor</th><th>Incluso</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <?php foreach ($plansRows as $plan): ?>
                  <?php
                    $features = painel_plan_features($plan);
                    $featuresText = implode("\n", $features);
                    $active = (int) ($plan['is_active'] ?? 0) === 1;
                  ?>
                  <tr>
                    <td><?= (int) $plan['sort_order'] ?></td>
                    <td>
                      <div class="suggestion-admin-title"><?= h((string) $plan['name']) ?></div>
                      <div class="suggestion-admin-subtitle"><?= h((string) $plan['code']) ?></div>
                      <div class="suggestion-admin-subtitle"><?= h((string) ($plan['description'] ?? '')) ?></div>
                    </td>
                    <td><?= h((string) $plan['access_type']) ?></td>
                    <td><?= (int) $plan['duration_days'] ?> dias</td>
                    <td><strong><?= h(moeda(((int) $plan['price_cents']) / 100)) ?></strong></td>
                    <td class="plans-features-cell"><?= h(implode(' | ', $features)) ?></td>
                    <td><span class="suggestion-pill <?= $active ? 'approval-approved' : 'approval-rejected' ?>"><?= $active ? 'Ativo' : 'Inativo' ?></span></td>
                    <td class="actions-col suggestion-actions-col">
                      <button
                        class="kebab-btn"
                        data-open-modal="manage-plan-modal"
                        data-plan-id="<?= (int) $plan['id'] ?>"
                        data-plan-code="<?= h((string) $plan['code']) ?>"
                        data-plan-name="<?= h((string) $plan['name']) ?>"
                        data-plan-access-type="<?= h((string) $plan['access_type']) ?>"
                        data-plan-duration-days="<?= (int) $plan['duration_days'] ?>"
                        data-plan-price="<?= h(number_format(((int) $plan['price_cents']) / 100, 2, '.', '')) ?>"
                        data-plan-description="<?= h((string) ($plan['description'] ?? '')) ?>"
                        data-plan-features="<?= h(base64_encode($featuresText)) ?>"
                        data-plan-active="<?= $active ? '1' : '0' ?>"
                        data-plan-sort-order="<?= (int) $plan['sort_order'] ?>"
                      >Editar</button>
                      <form method="post" class="inline-form">
                        <input type="hidden" name="action" value="toggle_plan">
                        <input type="hidden" name="tab" value="plans">
                        <input type="hidden" name="plan_id" value="<?= (int) $plan['id'] ?>">
                        <input type="hidden" name="is_active" value="<?= $active ? '0' : '1' ?>">
                        <button type="submit" class="kebab-btn"><?= $active ? 'Desativar' : 'Ativar' ?></button>
                      </form>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'finance'): ?>
        <main class="section-card">
          <div class="section-header">
            <h1>Financeiro</h1>
            <button class="btn btn-primary" data-open-modal="create-transaction-modal">Nova transacao</button>
          </div>
          <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Receita total</span><strong><?= h(moeda((float) $financeSummary['total_revenue'])) ?></strong></div>
            <div class="stat-item"><span class="stat-label">Despesa total</span><strong><?= h(moeda((float) $financeSummary['total_expenses'])) ?></strong></div>
            <div class="stat-item"><span class="stat-label">Liquido total</span><strong><?= h(moeda((float) $financeSummary['net_total'])) ?></strong></div>
            <div class="stat-item"><span class="stat-label">Receita pendente</span><strong><?= h(moeda((float) $financeSummary['pending_income'])) ?></strong></div>
          </div>
          <div class="table-wrap">
            <table class="users-table">
              <thead><tr><th>ID</th><th>Usuario</th><th>Descricao</th><th>Valor</th><th>Tipo</th><th>Status</th><th>Data pagamento</th></tr></thead>
              <tbody>
                <?php if (!$transactions): ?><tr><td colspan="7" class="empty-row">Nenhuma transacao registrada.</td></tr><?php endif; ?>
                <?php foreach ($transactions as $tr): ?>
                  <tr>
                    <td><?= (int) $tr['id'] ?></td>
                    <td><?= h((string) ($tr['user_email'] ?? '-')) ?></td>
                    <td><?= h((string) $tr['description']) ?></td>
                    <td><?= h(moeda((float) $tr['amount'])) ?></td>
                    <td><?= h((string) $tr['type']) ?></td>
                    <td><?= h((string) $tr['status']) ?></td>
                    <td><?= $tr['paid_at'] ? date('d/m/Y H:i', strtotime((string) $tr['paid_at'])) : '-' ?></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'reports'): ?>
        <main class="section-card">
          <div class="section-header">
            <h1>Relatorios</h1>
            <div class="inline-actions">
              <a class="btn btn-ghost" href="?tab=reports&export=monthly_users">Exportar usuarios CSV</a>
              <a class="btn btn-ghost" href="?tab=reports&export=monthly_finance">Exportar financeiro CSV</a>
            </div>
          </div>
          <div class="report-grid">
            <section class="report-box">
              <h3>Status de assinatura</h3>
              <p>Ativos: <strong><?= (int) $statusBreakdown['active'] ?></strong></p>
              <p>Inativos: <strong><?= (int) $statusBreakdown['inactive'] ?></strong></p>
            </section>
            <section class="report-box">
              <h3>Vencendo em 7 dias</h3>
              <p>Total: <strong><?= count($expiring7) ?></strong></p>
            </section>
            <section class="report-box">
              <h3>Vencendo em 30 dias</h3>
              <p>Total: <strong><?= count($expiring30) ?></strong></p>
            </section>
          </div>

          <div class="table-wrap">
            <table class="users-table">
              <thead><tr><th>Usuario</th><th>Status</th><th>Vencimento</th></tr></thead>
              <tbody>
                <?php if (!$expiring30): ?><tr><td colspan="3" class="empty-row">Nenhuma assinatura para vencer em 30 dias.</td></tr><?php endif; ?>
                <?php foreach ($expiring30 as $row): ?>
                  <tr>
                    <td><?= h((string) $row['email']) ?></td>
                    <td><?= h((string) $row['subscription_status']) ?></td>
                    <td><?= date('d/m/Y H:i', strtotime((string) $row['subscription_expires_at'])) ?></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'suggestions'): ?>
        <main class="section-card">
          <div class="section-header">
            <h1>Sugestoes e Atualizacoes</h1>
            <button class="btn btn-primary" data-open-modal="manage-suggestion-modal">Nova publicacao</button>
          </div>

          <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Total</span><strong><?= (int) $suggestionsSummary['total_items'] ?></strong></div>
            <div class="stat-item"><span class="stat-label">Pendentes</span><strong><?= (int) $suggestionsSummary['pending_items'] ?></strong></div>
            <div class="stat-item"><span class="stat-label">Online</span><strong><?= (int) $suggestionsSummary['visible_items'] ?></strong></div>
            <div class="stat-item"><span class="stat-label">Votes Up / Down</span><strong><?= (int) $suggestionsSummary['upvotes'] ?> / <?= (int) $suggestionsSummary['downvotes'] ?></strong></div>
          </div>

          <div class="overview-meta">
            <span>Somente itens aprovados e visiveis aparecem no Electron.</span>
            <span>Defina status publico e janela online para controlar o mural em tempo real.</span>
          </div>

          <div class="table-wrap">
            <table class="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Titulo</th>
                  <th>Enviado por</th>
                  <th>Aprovacao</th>
                  <th>Status publico</th>
                  <th>Online</th>
                  <th>Votos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <?php if (!$suggestionsRows): ?>
                  <tr><td colspan="9" class="empty-row">Nenhuma sugestao cadastrada ainda.</td></tr>
                <?php endif; ?>
                <?php foreach ($suggestionsRows as $row): ?>
                  <?php
                    $publishAtLabel = $row['publish_at'] ? date('d/m/Y H:i', strtotime((string) $row['publish_at'])) : '-';
                    $publishUntilLabel = $row['publish_until'] ? date('d/m/Y H:i', strtotime((string) $row['publish_until'])) : 'Sem limite';
                    $visibleLabel = ((int) ($row['is_visible'] ?? 0) === 1 && (string) ($row['approval_status'] ?? '') === 'approved') ? 'Publico' : 'Oculto';
                  ?>
                  <tr>
                    <td>#<?= (int) $row['id'] ?></td>
                    <td><?= h(suggestion_entry_label((string) $row['entry_type'])) ?></td>
                    <td>
                      <div class="suggestion-admin-title"><?= h((string) $row['title']) ?></div>
                      <div class="suggestion-admin-subtitle"><?= h(mb_strimwidth((string) $row['details'], 0, 120, '...')) ?></div>
                    </td>
                    <td><?= h((string) ($row['created_by_email'] ?: 'Admin')) ?></td>
                    <td><span class="suggestion-pill approval-<?= h((string) $row['approval_status']) ?>"><?= h(suggestion_approval_label((string) $row['approval_status'])) ?></span></td>
                    <td><span class="suggestion-pill status-<?= h((string) $row['public_status']) ?>"><?= h(suggestion_status_label((string) $row['public_status'])) ?></span></td>
                    <td>
                      <div class="suggestion-admin-subtitle"><?= h($visibleLabel) ?></div>
                      <div class="suggestion-admin-subtitle"><?= h($publishAtLabel) ?> ate <?= h($publishUntilLabel) ?></div>
                    </td>
                    <td>
                      <div class="suggestion-admin-votes">+<?= (int) ($row['upvotes'] ?? 0) ?> / -<?= (int) ($row['downvotes'] ?? 0) ?></div>
                      <div class="suggestion-admin-subtitle">Score <?= (int) ($row['score'] ?? 0) ?></div>
                    </td>
                    <td class="actions-col suggestion-actions-col">
                      <button
                        class="kebab-btn"
                        data-open-modal="manage-suggestion-modal"
                        data-suggestion-id="<?= (int) $row['id'] ?>"
                        data-suggestion-entry-type="<?= h((string) $row['entry_type']) ?>"
                        data-suggestion-title="<?= h((string) $row['title']) ?>"
                        data-suggestion-details="<?= h(base64_encode((string) $row['details'])) ?>"
                        data-suggestion-approval="<?= h((string) $row['approval_status']) ?>"
                        data-suggestion-status="<?= h((string) $row['public_status']) ?>"
                        data-suggestion-visible="<?= (int) ($row['is_visible'] ?? 0) ?>"
                        data-suggestion-publish-at="<?= h(dt_local_value((string) ($row['publish_at'] ?? ''))) ?>"
                        data-suggestion-publish-until="<?= h(dt_local_value((string) ($row['publish_until'] ?? ''))) ?>"
                        data-suggestion-notes="<?= h(base64_encode((string) ($row['admin_notes'] ?? ''))) ?>"
                      >Editar</button>
                      <form method="post" class="inline-form" onsubmit="return confirm('Excluir esta sugestao?');">
                        <input type="hidden" name="action" value="delete_suggestion">
                        <input type="hidden" name="tab" value="suggestions">
                        <input type="hidden" name="suggestion_id" value="<?= (int) $row['id'] ?>">
                        <button type="submit" class="kebab-btn suggestion-delete-btn">Excluir</button>
                      </form>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'updates'): ?>
        <main class="section-card">
          <div class="section-header">
            <h1>Atualizacoes do app</h1>
            <button class="btn btn-primary" data-open-modal="manage-release-modal">Nova versao</button>
          </div>

          <div class="stats-grid">
            <div class="stat-item"><span class="stat-label">Versao publicada</span><strong><?= h((string) ($latestRelease['version'] ?? '-')) ?></strong></div>
            <div class="stat-item"><span class="stat-label">Status</span><strong><?= $latestRelease ? h(painel_updates_status_label((string) $latestRelease['status'])) : '-' ?></strong></div>
            <div class="stat-item update-path-card"><span class="stat-label">Pasta de arquivos</span><strong><?= h(painel_updates_public_dir()) ?></strong></div>
            <div class="stat-item update-path-card"><span class="stat-label">Feed publico</span><strong><?= h(painel_updates_public_url() . '/latest.yml') ?></strong></div>
          </div>

          <div class="overview-meta">
            <span>Publique uma versao para gerar automaticamente o latest.yml usado pelo Electron.</span>
            <span>Para agendamento automatico sem abrir o painel, configure um cron chamando esta pagina ou um endpoint de publicacao futura.</span>
          </div>

          <div class="table-wrap">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Versao</th>
                  <th>Titulo</th>
                  <th>Status</th>
                  <th>Publicacao</th>
                  <th>Instalador</th>
                  <th>Downloads</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <?php if (!$updatesRows): ?>
                  <tr><td colspan="7" class="empty-row">Nenhuma atualizacao cadastrada ainda.</td></tr>
                <?php endif; ?>
                <?php foreach ($updatesRows as $row): ?>
                  <?php
                    $status = (string) ($row['status'] ?? 'draft');
                    $scheduleLabel = '-';
                    if ($status === 'published' && $row['published_at']) {
                        $scheduleLabel = 'Publicada em ' . date('d/m/Y H:i', strtotime((string) $row['published_at']));
                    } elseif ($status === 'scheduled' && $row['publish_at']) {
                        $scheduleLabel = 'Agendada para ' . date('d/m/Y H:i', strtotime((string) $row['publish_at']));
                    } elseif ($row['created_at']) {
                        $scheduleLabel = 'Criada em ' . date('d/m/Y H:i', strtotime((string) $row['created_at']));
                    }
                    $installerDownloads = (int) ($row['installer_downloads'] ?? 0);
                    $blockmapDownloads = (int) ($row['blockmap_downloads'] ?? 0);
                    $latestHits = (int) ($row['latest_hits'] ?? 0);
                  ?>
                  <tr>
                    <td><strong><?= h((string) $row['version']) ?></strong></td>
                    <td>
                      <div class="suggestion-admin-title"><?= h((string) $row['title']) ?></div>
                      <div class="suggestion-admin-subtitle"><?= h(mb_strimwidth((string) ($row['changelog'] ?? ''), 0, 120, '...')) ?></div>
                    </td>
                    <td><span class="suggestion-pill status-<?= h($status) ?>"><?= h(painel_updates_status_label($status)) ?></span></td>
                    <td><?= h($scheduleLabel) ?></td>
                    <td>
                      <div class="suggestion-admin-subtitle"><?= h((string) ($row['installer_filename'] ?: '-')) ?></div>
                      <div class="suggestion-admin-subtitle"><?= h(bytes_label((int) ($row['installer_size'] ?? 0))) ?></div>
                    </td>
                    <td>
                      <div class="suggestion-admin-subtitle">EXE: <?= $installerDownloads ?></div>
                      <div class="suggestion-admin-subtitle">Blockmap: <?= $blockmapDownloads ?></div>
                      <div class="suggestion-admin-subtitle">latest.yml: <?= $latestHits ?></div>
                    </td>
                    <td class="actions-col suggestion-actions-col">
                      <button
                        class="kebab-btn"
                        data-open-modal="manage-release-modal"
                        data-release-id="<?= (int) $row['id'] ?>"
                        data-release-version="<?= h((string) $row['version']) ?>"
                        data-release-title="<?= h((string) $row['title']) ?>"
                        data-release-changelog="<?= h(base64_encode((string) ($row['changelog'] ?? ''))) ?>"
                        data-release-status="<?= h($status === 'archived' ? 'draft' : $status) ?>"
                        data-release-publish-at="<?= h(dt_local_value((string) ($row['publish_at'] ?? ''))) ?>"
                      >Editar</button>
                      <?php if ($status !== 'published'): ?>
                        <form method="post" class="inline-form">
                          <input type="hidden" name="action" value="publish_release">
                          <input type="hidden" name="tab" value="updates">
                          <input type="hidden" name="release_id" value="<?= (int) $row['id'] ?>">
                          <button type="submit" class="kebab-btn">Publicar</button>
                        </form>
                      <?php endif; ?>
                      <?php if ($status !== 'archived'): ?>
                        <form method="post" class="inline-form" onsubmit="return confirm('Arquivar esta versao?');">
                          <input type="hidden" name="action" value="archive_release">
                          <input type="hidden" name="tab" value="updates">
                          <input type="hidden" name="release_id" value="<?= (int) $row['id'] ?>">
                          <button type="submit" class="kebab-btn suggestion-delete-btn">Arquivar</button>
                        </form>
                      <?php endif; ?>
                    </td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'admins'): ?>
        <main class="section-card">
          <div class="section-header"><h1>Administradores</h1><button class="btn btn-primary" data-open-modal="create-admin-modal">Cadastrar admin</button></div>
          <div class="table-wrap">
            <table class="users-table">
              <thead><tr><th>ID</th><th>E-mail</th><th>Criado em</th><th></th></tr></thead>
              <tbody>
                <?php foreach ($admins as $row): ?>
                  <tr>
                    <td><?= (int) $row['id'] ?></td>
                    <td><?= h((string) $row['email']) ?></td>
                    <td><?= date('d/m/Y H:i', strtotime((string) $row['created_at'])) ?></td>
                    <td class="actions-col"><button class="kebab-btn" data-open-modal="manage-admin-modal" data-admin-id="<?= (int) $row['id'] ?>" data-admin-email="<?= h((string) $row['email']) ?>">...</button></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'settings'): ?>
        <main class="section-card">
          <div class="section-header"><h1>Configuracoes</h1></div>
          <form method="post" class="settings-form">
            <input type="hidden" name="action" value="save_settings">
            <input type="hidden" name="tab" value="settings">
            <label for="app_name">Nome do painel</label>
            <input id="app_name" name="app_name" type="text" value="<?= h((string) ($settings['app_name'] ?? 'Painel Surebet')) ?>">
            <label for="timezone">Timezone</label>
            <input id="timezone" name="timezone" type="text" value="<?= h((string) ($settings['timezone'] ?? 'America/Sao_Paulo')) ?>">
            <label class="check-line"><input type="checkbox" name="houses_filter_enabled" value="1" <?= ($settings['houses_filter_enabled'] ?? '1') === '1' ? 'checked' : '' ?>>Filtro de casas habilitado no sistema</label>
            <label for="logs_retention_days">Retencao de logs (dias)</label>
            <input id="logs_retention_days" name="logs_retention_days" type="number" min="1" max="3650" value="<?= (int) ($settings['logs_retention_days'] ?? 30) ?>">
            <h3 class="settings-subtitle">Pagou.ai</h3>
            <label for="pagou_environment">Ambiente</label>
            <select id="pagou_environment" name="pagou_environment">
              <option value="sandbox" <?= ($settings['pagou_environment'] ?? 'sandbox') === 'sandbox' ? 'selected' : '' ?>>Sandbox</option>
              <option value="production" <?= ($settings['pagou_environment'] ?? '') === 'production' ? 'selected' : '' ?>>Producao</option>
            </select>
            <label for="pagou_token">Token secreto da Pagou</label>
            <input id="pagou_token" name="pagou_token" type="password" autocomplete="off" value="<?= h((string) ($settings['pagou_token'] ?? '')) ?>" placeholder="Bearer token da Pagou.ai">
            <label for="pagou_webhook_url">Webhook publico</label>
            <input id="pagou_webhook_url" name="pagou_webhook_url" type="url" value="<?= h((string) ($settings['pagou_webhook_url'] ?? 'https://octosure.net/painel/api/webhooks/pagou.php')) ?>">
            <label for="pagou_webhook_security_token">Token de seguranca do webhook</label>
            <input id="pagou_webhook_security_token" name="pagou_webhook_security_token" type="password" autocomplete="off" value="<?= h((string) ($settings['pagou_webhook_security_token'] ?? '')) ?>" placeholder="Mesmo token criado na Pagou">
            <label for="pagou_base_url">Base URL customizada (opcional)</label>
            <input id="pagou_base_url" name="pagou_base_url" type="url" value="<?= h((string) ($settings['pagou_base_url'] ?? '')) ?>" placeholder="Deixe vazio para usar sandbox/producao automaticamente">
            <button class="btn btn-primary" type="submit">Salvar configuracoes</button>
          </form>
        </main>
      <?php endif; ?>

      <?php if ($tab === 'logs'): ?>
        <main class="section-card">
          <div class="section-header"><h1>Logs do Sistema</h1></div>
          <div class="table-wrap">
            <table class="users-table">
              <thead><tr><th>Data</th><th>Nivel</th><th>Categoria</th><th>Mensagem</th><th>Contexto</th></tr></thead>
              <tbody>
                <?php if (!$logs): ?><tr><td colspan="5" class="empty-row">Nenhum log registrado.</td></tr><?php endif; ?>
                <?php foreach ($logs as $log): ?>
                  <tr>
                    <td><?= date('d/m/Y H:i:s', strtotime((string) $log['created_at'])) ?></td>
                    <td><?= h((string) $log['level']) ?></td>
                    <td><?= h((string) $log['category']) ?></td>
                    <td><?= h((string) $log['message']) ?></td>
                    <td class="log-context"><?= h((string) ($log['context_json'] ?? '')) ?></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        </main>
      <?php endif; ?>
    </section>
  </div>

  <div id="manage-plan-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card suggestion-modal-card">
      <h2>Plano</h2>
      <p class="modal-subtitle">Defina valor, duracao e o que fica incluso para cadastro, renovacao e upgrade.</p>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="save_plan">
        <input type="hidden" name="tab" value="plans">
        <input type="hidden" id="manage-plan-id" name="plan_id" value="0">

        <div class="suggestion-admin-grid">
          <div>
            <label for="manage-plan-name">Nome</label>
            <input id="manage-plan-name" name="name" type="text" maxlength="120" placeholder="Prematch + LIVE" required>
          </div>
          <div>
            <label for="manage-plan-code">Codigo interno</label>
            <input id="manage-plan-code" name="code" type="text" maxlength="80" placeholder="full_30d">
          </div>
        </div>

        <div class="suggestion-admin-grid">
          <div>
            <label for="manage-plan-access-type">Tipo de acesso</label>
            <select id="manage-plan-access-type" name="access_type">
              <option value="prematch">Prematch</option>
              <option value="live">Live</option>
              <option value="full">Prematch + LIVE</option>
            </select>
          </div>
          <div>
            <label for="manage-plan-duration-days">Duracao em dias</label>
            <input id="manage-plan-duration-days" name="duration_days" type="number" min="1" max="3650" required>
          </div>
        </div>

        <div class="suggestion-admin-grid">
          <div>
            <label for="manage-plan-price">Valor</label>
            <input id="manage-plan-price" name="price" type="number" min="0.01" step="0.01" placeholder="149.90" required>
          </div>
          <div>
            <label for="manage-plan-sort-order">Ordem</label>
            <input id="manage-plan-sort-order" name="sort_order" type="number" step="1" value="0">
          </div>
        </div>

        <label for="manage-plan-description">Descricao</label>
        <input id="manage-plan-description" name="description" type="text" maxlength="500" placeholder="Resumo curto do plano">

        <label for="manage-plan-features">O que esta incluso</label>
        <textarea id="manage-plan-features" name="features" rows="6" placeholder="Uma linha por item"></textarea>

        <label class="check-line">
          <input name="is_active" type="hidden" value="0">
          <input id="manage-plan-active" name="is_active" type="checkbox" value="1" checked>
          Plano ativo para venda
        </label>

        <button class="btn btn-primary btn-full" type="submit">Salvar plano</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="create-user-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card">
      <h2>Adicionar usuario</h2>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="create_user"><input type="hidden" name="tab" value="users">
        <label for="create-email">E-mail</label><input id="create-email" name="email" type="email" placeholder="Insira o e-mail" required>
        <label for="create-password">Senha</label><input id="create-password" name="password" type="password" minlength="6" placeholder="Minimo 6 caracteres" required>
        <label for="create-days">Tempo de assinatura</label>
        <div class="days-group"><input id="create-days" name="subscription_days" type="number" min="0" max="3650" placeholder="00" required><span>dias</span></div>
        <button class="btn btn-primary btn-full" type="submit">Adicionar</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="manage-sub-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card">
      <h2>Gerenciar assinatura</h2><p id="manage-user-email" class="modal-subtitle">-</p>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="update_subscription"><input type="hidden" name="tab" value="users"><input type="hidden" id="manage-user-id" name="user_id" value="">
        <label for="manage-days">Tempo de assinatura</label>
        <div class="days-group"><input id="manage-days" name="subscription_days" type="number" min="0" max="3650" placeholder="00" required><span>dias</span></div>
        <button class="btn btn-primary btn-full" type="submit">Atualizar</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="create-admin-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card">
      <h2>Novo admin</h2>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="create_admin"><input type="hidden" name="tab" value="admins">
        <label for="admin-email">E-mail</label><input id="admin-email" name="email" type="email" placeholder="admin@email.com" required>
        <label for="admin-password">Senha</label><input id="admin-password" name="password" type="password" minlength="6" placeholder="Minimo 6 caracteres" required>
        <button class="btn btn-primary btn-full" type="submit">Criar admin</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="manage-admin-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card">
      <h2>Senha do admin</h2><p id="manage-admin-email" class="modal-subtitle">-</p>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="update_admin_password"><input type="hidden" name="tab" value="admins"><input type="hidden" id="manage-admin-id" name="admin_id" value="">
        <label for="manage-admin-password">Nova senha</label><input id="manage-admin-password" name="password" type="password" minlength="6" placeholder="Nova senha" required>
        <button class="btn btn-primary btn-full" type="submit">Atualizar senha</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="manage-user-password-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card">
      <h2>Senha do usuario</h2><p id="manage-user-password-email" class="modal-subtitle">-</p>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="update_user_password"><input type="hidden" name="tab" value="users"><input type="hidden" id="manage-user-password-id" name="user_id" value="">
        <label for="manage-user-password">Nova senha</label><input id="manage-user-password" name="password" type="password" minlength="6" placeholder="Nova senha" required>
        <button class="btn btn-primary btn-full" type="submit">Atualizar senha</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="create-transaction-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card">
      <h2>Nova transacao</h2>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="create_transaction"><input type="hidden" name="tab" value="finance">
        <label for="tr-user">ID do usuario (opcional)</label><input id="tr-user" name="user_id" type="number" min="1" placeholder="Ex: 12">
        <label for="tr-desc">Descricao</label><input id="tr-desc" name="description" type="text" placeholder="Pagamento assinatura mensal" required>
        <label for="tr-amount">Valor</label><input id="tr-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="49.90" required>
        <label for="tr-type">Tipo</label>
        <select id="tr-type" name="type">
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>
        <label for="tr-status">Status</label>
        <select id="tr-status" name="status">
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="canceled">Cancelado</option>
        </select>
        <label for="tr-paid-at">Data pagamento</label><input id="tr-paid-at" name="paid_at" type="datetime-local">
        <button class="btn btn-primary btn-full" type="submit">Registrar</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="manage-suggestion-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card suggestion-modal-card">
      <h2>Central de sugestoes</h2>
      <p class="modal-subtitle">Aprovacao, status publico, janela online e visibilidade do mural.</p>
      <form method="post" class="modal-form">
        <input type="hidden" name="action" value="save_suggestion">
        <input type="hidden" name="tab" value="suggestions">
        <input type="hidden" id="manage-suggestion-id" name="suggestion_id" value="0">

        <label for="manage-suggestion-type">Tipo</label>
        <select id="manage-suggestion-type" name="entry_type">
          <?php foreach (painel_suggestion_entry_options() as $value => $label): ?>
            <option value="<?= h((string) $value) ?>"><?= h((string) $label) ?></option>
          <?php endforeach; ?>
        </select>

        <label for="manage-suggestion-title">Titulo</label>
        <input id="manage-suggestion-title" name="title" type="text" maxlength="200" placeholder="Ex: Mostrar lucro por cruzamento de casas" required>

        <label for="manage-suggestion-details">Detalhes</label>
        <textarea id="manage-suggestion-details" name="details" rows="6" placeholder="Descreva a ideia ou a atualizacao que sera publicada." required></textarea>

        <div class="suggestion-admin-grid">
          <div>
            <label for="manage-suggestion-approval">Aprovacao</label>
            <select id="manage-suggestion-approval" name="approval_status">
              <?php foreach (painel_suggestion_approval_options() as $value => $label): ?>
                <option value="<?= h((string) $value) ?>"><?= h((string) $label) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div>
            <label for="manage-suggestion-status">Status publico</label>
            <select id="manage-suggestion-status" name="public_status">
              <?php foreach (painel_suggestion_status_options() as $value => $label): ?>
                <option value="<?= h((string) $value) ?>"><?= h((string) $label) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>

        <div class="suggestion-admin-grid">
          <div>
            <label for="manage-suggestion-publish-at">Publicar em</label>
            <input id="manage-suggestion-publish-at" name="publish_at" type="datetime-local">
          </div>
          <div>
            <label for="manage-suggestion-publish-until">Online ate</label>
            <input id="manage-suggestion-publish-until" name="publish_until" type="datetime-local">
          </div>
        </div>

        <label class="check-line">
          <input name="is_visible" type="hidden" value="0">
          <input id="manage-suggestion-visible" name="is_visible" type="checkbox" value="1">
          Disponivel para aparecer no painel do usuario
        </label>

        <label for="manage-suggestion-notes">Observacoes internas</label>
        <textarea id="manage-suggestion-notes" name="admin_notes" rows="4" placeholder="Notas internas do admin (nao aparecem para o usuario)."></textarea>

        <button class="btn btn-primary btn-full" type="submit">Salvar sugestao</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <div id="manage-release-modal" class="modal-backdrop" aria-hidden="true">
    <section class="modal-card suggestion-modal-card">
      <h2>Central de atualizacoes</h2>
      <p class="modal-subtitle">Envie o instalador gerado pelo electron-builder, preencha changelog e publique ou agende.</p>
      <form method="post" class="modal-form" enctype="multipart/form-data">
        <input type="hidden" name="action" value="save_release">
        <input type="hidden" name="tab" value="updates">
        <input type="hidden" id="manage-release-id" name="release_id" value="0">

        <div class="suggestion-admin-grid">
          <div>
            <label for="manage-release-version">Versao</label>
            <input id="manage-release-version" name="version" type="text" maxlength="50" placeholder="1.0.1" required>
          </div>
          <div>
            <label for="manage-release-status">Status</label>
            <select id="manage-release-status" name="status">
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendada</option>
              <option value="published">Publicar agora</option>
            </select>
          </div>
        </div>

        <label for="manage-release-title">Nome da atualizacao</label>
        <input id="manage-release-title" name="title" type="text" maxlength="200" placeholder="Melhorias de estabilidade e filtros" required>

        <label for="manage-release-changelog">Changelog</label>
        <textarea id="manage-release-changelog" name="changelog" rows="7" placeholder="Liste o que mudou nesta versao."></textarea>

        <label for="manage-release-publish-at">Publicar em</label>
        <input id="manage-release-publish-at" name="publish_at" type="datetime-local">

        <label for="manage-release-installer">Instalador .exe</label>
        <input id="manage-release-installer" name="installer_file" type="file" accept=".exe">
        <p class="modal-subtitle">Para nova versao, envie o arquivo tipo Octosure Setup 1.0.1.exe. Ao editar, envie apenas se quiser trocar o arquivo.</p>

        <label for="manage-release-blockmap">Blockmap .blockmap</label>
        <input id="manage-release-blockmap" name="blockmap_file" type="file" accept=".blockmap">

        <button class="btn btn-primary btn-full" type="submit">Salvar atualizacao</button>
      </form>
      <button class="modal-close" data-close-modal>x</button>
    </section>
  </div>

  <script src="<?= h($assetBase . '/assets/js/painel.js?v=6') ?>"></script>
</body>
</html>
