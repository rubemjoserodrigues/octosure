<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

function painel_updates_public_dir(): string
{
    $custom = painel_env('APP_UPDATES_DIR');
    if (is_string($custom) && trim($custom) !== '') {
        return rtrim($custom, '/\\');
    }

    $base = defined('PAINEL_SRC_DIR') ? dirname((string) PAINEL_SRC_DIR) : dirname(__DIR__);
    return rtrim(dirname($base), '/\\') . DIRECTORY_SEPARATOR . 'updates';
}

function painel_updates_public_url(): string
{
    $custom = painel_env('APP_UPDATES_URL', 'https://octosure.net/updates');
    return rtrim((string) $custom, '/');
}

function painel_updates_install_schema(): void
{
    $pdo = painel_db();
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_releases (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          version VARCHAR(50) NOT NULL UNIQUE,
          title VARCHAR(200) NOT NULL,
          changelog TEXT NULL,
          status ENUM('draft', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft',
          installer_filename VARCHAR(255) NULL,
          installer_original_name VARCHAR(255) NULL,
          installer_sha512 VARCHAR(180) NULL,
          installer_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
          blockmap_filename VARCHAR(255) NULL,
          blockmap_original_name VARCHAR(255) NULL,
          blockmap_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
          latest_filename VARCHAR(255) NOT NULL DEFAULT 'latest.yml',
          publish_at DATETIME NULL,
          published_at DATETIME NULL,
          archived_at DATETIME NULL,
          created_by_admin_id BIGINT UNSIGNED NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_app_releases_status_publish (status, publish_at),
          INDEX idx_app_releases_published_at (published_at)
        )
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_release_downloads (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          release_id BIGINT UNSIGNED NULL,
          version VARCHAR(50) NOT NULL,
          file_kind ENUM('installer', 'blockmap', 'latest') NOT NULL DEFAULT 'installer',
          file_name VARCHAR(255) NOT NULL,
          ip_address VARCHAR(64) NULL,
          user_agent VARCHAR(500) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_app_release_downloads_release (release_id),
          INDEX idx_app_release_downloads_version (version),
          INDEX idx_app_release_downloads_created (created_at),
          CONSTRAINT fk_app_release_downloads_release FOREIGN KEY (release_id) REFERENCES app_releases(id) ON DELETE SET NULL
        )
    ");
}

function painel_updates_status_label(string $status): string
{
    $labels = [
        'draft' => 'Rascunho',
        'scheduled' => 'Agendada',
        'published' => 'Publicada',
        'archived' => 'Arquivada',
    ];
    return $labels[$status] ?? $status;
}

function painel_updates_normalize_version(string $version): string
{
    $version = trim($version);
    if (!preg_match('/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9][A-Za-z0-9._-]*)?$/', $version)) {
        throw new InvalidArgumentException('Versao invalida. Use formato como 1.0.1.');
    }
    return $version;
}

function painel_updates_safe_filename(string $filename): string
{
    $filename = str_replace(['\\', '/'], '-', trim($filename));
    $filename = preg_replace('/[^A-Za-z0-9 ._()-]+/', '-', $filename) ?: '';
    $filename = preg_replace('/\s+/', ' ', $filename) ?: '';
    $filename = trim($filename, " .\t\n\r\0\x0B");
    if ($filename === '') {
        throw new InvalidArgumentException('Nome de arquivo invalido.');
    }
    return $filename;
}

function painel_updates_ensure_dir(): string
{
    $dir = painel_updates_public_dir();
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Nao foi possivel criar a pasta de updates: ' . $dir);
    }
    if (!is_writable($dir)) {
        throw new RuntimeException('A pasta de updates nao tem permissao de escrita: ' . $dir);
    }
    return $dir;
}

function painel_updates_move_upload(array $file, string $targetName, array $allowedExts): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return ['', '', 0, ''];
    }
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Falha no upload do arquivo.');
    }

    $original = painel_updates_safe_filename((string) ($file['name'] ?? ''));
    $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExts, true)) {
        throw new InvalidArgumentException('Tipo de arquivo nao permitido: .' . $ext);
    }

    $dir = painel_updates_ensure_dir();
    $target = $dir . DIRECTORY_SEPARATOR . painel_updates_safe_filename($targetName);
    $tmp = (string) ($file['tmp_name'] ?? '');
    if (!is_uploaded_file($tmp) || !move_uploaded_file($tmp, $target)) {
        throw new RuntimeException('Nao foi possivel salvar o arquivo enviado.');
    }

    $size = filesize($target);
    $sha512 = $ext === 'exe' ? base64_encode(hash_file('sha512', $target, true)) : '';
    return [basename($target), $original, (int) ($size ?: 0), $sha512];
}

function painel_updates_release_by_id(int $id): ?array
{
    $stmt = painel_db()->prepare('SELECT * FROM app_releases WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function painel_updates_latest_published(): ?array
{
    $stmt = painel_db()->query("SELECT * FROM app_releases WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT 1");
    $row = $stmt->fetch();
    return is_array($row) ? $row : null;
}

function painel_updates_list(): array
{
    $sql = "
        SELECT r.*,
          (SELECT COUNT(*) FROM app_release_downloads d WHERE d.release_id = r.id AND d.file_kind = 'installer') AS installer_downloads,
          (SELECT COUNT(*) FROM app_release_downloads d WHERE d.release_id = r.id AND d.file_kind = 'blockmap') AS blockmap_downloads,
          (SELECT COUNT(*) FROM app_release_downloads d WHERE d.release_id = r.id AND d.file_kind = 'latest') AS latest_hits
        FROM app_releases r
        ORDER BY
          CASE r.status WHEN 'published' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'draft' THEN 3 ELSE 4 END,
          COALESCE(r.publish_at, r.published_at, r.created_at) DESC,
          r.id DESC
    ";
    $rows = painel_db()->query($sql)->fetchAll();
    return painel_updates_apply_nginx_download_counts($rows);
}

function painel_updates_nginx_log_paths(): array
{
    $custom = painel_env('APP_UPDATES_NGINX_LOGS');
    if (is_string($custom) && trim($custom) !== '') {
        return array_values(array_filter(array_map('trim', explode(',', $custom))));
    }
    return [
        '/var/log/nginx/access.log',
        '/var/log/nginx/access.log.1',
    ];
}

function painel_updates_count_file_in_logs(string $fileName): int
{
    $fileName = trim($fileName);
    if ($fileName === '') {
        return 0;
    }

    $needles = array_unique([
        '/updates/' . $fileName,
        '/updates/' . str_replace(' ', '%20', $fileName),
        rawurlencode($fileName),
    ]);

    $count = 0;
    foreach (painel_updates_nginx_log_paths() as $path) {
        if (!is_file($path) || !is_readable($path)) {
            continue;
        }
        $handle = fopen($path, 'r');
        if ($handle === false) {
            continue;
        }
        while (($line = fgets($handle)) !== false) {
            if (strpos($line, ' 200 ') === false && strpos($line, '" 206 ') === false) {
                continue;
            }
            foreach ($needles as $needle) {
                if ($needle !== '' && strpos($line, $needle) !== false) {
                    $count++;
                    break;
                }
            }
        }
        fclose($handle);
    }
    return $count;
}

function painel_updates_apply_nginx_download_counts(array $rows): array
{
    foreach ($rows as &$row) {
        $installer = (string) ($row['installer_filename'] ?? '');
        $blockmap = (string) ($row['blockmap_filename'] ?? '');
        $row['installer_downloads'] = max(
            (int) ($row['installer_downloads'] ?? 0),
            painel_updates_count_file_in_logs($installer)
        );
        $row['blockmap_downloads'] = max(
            (int) ($row['blockmap_downloads'] ?? 0),
            painel_updates_count_file_in_logs($blockmap)
        );
        $row['latest_hits'] = max(
            (int) ($row['latest_hits'] ?? 0),
            painel_updates_count_file_in_logs('latest.yml')
        );
    }
    unset($row);
    return $rows;
}

function painel_updates_build_latest_yml(array $release): string
{
    $version = (string) $release['version'];
    $installer = (string) $release['installer_filename'];
    $sha512 = (string) $release['installer_sha512'];
    $size = (int) $release['installer_size'];
    if ($installer === '' || $sha512 === '' || $size <= 0) {
        throw new RuntimeException('Release sem instalador valido para publicar.');
    }

    $releaseDate = $release['published_at'] ?: date('c');
    $releaseDate = date('c', strtotime((string) $releaseDate) ?: time());

    return "version: {$version}\n"
        . "files:\n"
        . "  - url: {$installer}\n"
        . "    sha512: {$sha512}\n"
        . "    size: {$size}\n"
        . "path: {$installer}\n"
        . "sha512: {$sha512}\n"
        . "releaseDate: '{$releaseDate}'\n";
}

function painel_updates_write_latest(array $release): void
{
    $dir = painel_updates_ensure_dir();
    $path = $dir . DIRECTORY_SEPARATOR . 'latest.yml';
    $yaml = painel_updates_build_latest_yml($release);
    if (file_put_contents($path, $yaml, LOCK_EX) === false) {
        throw new RuntimeException('Nao foi possivel gravar latest.yml.');
    }
}

function painel_updates_save_release(array $post, array $files, int $adminId): int
{
    $id = max(0, (int) ($post['release_id'] ?? 0));
    $version = painel_updates_normalize_version((string) ($post['version'] ?? ''));
    $title = trim((string) ($post['title'] ?? ''));
    $changelog = trim((string) ($post['changelog'] ?? ''));
    $status = (string) ($post['status'] ?? 'draft');
    $publishAt = trim((string) ($post['publish_at'] ?? ''));

    if ($title === '') {
        throw new InvalidArgumentException('Informe um titulo para a versao.');
    }
    if (!in_array($status, ['draft', 'scheduled', 'published'], true)) {
        $status = 'draft';
    }
    if ($status === 'scheduled' && $publishAt === '') {
        throw new InvalidArgumentException('Informe data e hora para agendar.');
    }
    $publishAtSql = $publishAt !== '' ? date('Y-m-d H:i:s', strtotime($publishAt) ?: time()) : null;

    $installer = ['', '', 0, ''];
    if (isset($files['installer_file']) && is_array($files['installer_file'])) {
        $installer = painel_updates_move_upload(
            $files['installer_file'],
            "Octosure Setup {$version}.exe",
            ['exe']
        );
    }
    $blockmap = ['', '', 0, ''];
    if (isset($files['blockmap_file']) && is_array($files['blockmap_file'])) {
        $blockmap = painel_updates_move_upload(
            $files['blockmap_file'],
            "Octosure Setup {$version}.exe.blockmap",
            ['blockmap']
        );
    }

    $pdo = painel_db();
    if ($id > 0) {
        $current = painel_updates_release_by_id($id);
        if (!$current) {
            throw new InvalidArgumentException('Release nao encontrada.');
        }
        $sql = "
            UPDATE app_releases SET
              version = :version,
              title = :title,
              changelog = :changelog,
              status = :status,
              publish_at = :publish_at,
              installer_filename = COALESCE(NULLIF(:installer_filename, ''), installer_filename),
              installer_original_name = COALESCE(NULLIF(:installer_original_name, ''), installer_original_name),
              installer_sha512 = COALESCE(NULLIF(:installer_sha512, ''), installer_sha512),
              installer_size = IF(:installer_size_check > 0, :installer_size_value, installer_size),
              blockmap_filename = COALESCE(NULLIF(:blockmap_filename, ''), blockmap_filename),
              blockmap_original_name = COALESCE(NULLIF(:blockmap_original_name, ''), blockmap_original_name),
              blockmap_size = IF(:blockmap_size_check > 0, :blockmap_size_value, blockmap_size)
            WHERE id = :id
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'id' => $id,
            'version' => $version,
            'title' => $title,
            'changelog' => $changelog,
            'status' => $status,
            'publish_at' => $publishAtSql,
            'installer_filename' => $installer[0],
            'installer_original_name' => $installer[1],
            'installer_sha512' => $installer[3],
            'installer_size_check' => $installer[2],
            'installer_size_value' => $installer[2],
            'blockmap_filename' => $blockmap[0],
            'blockmap_original_name' => $blockmap[1],
            'blockmap_size_check' => $blockmap[2],
            'blockmap_size_value' => $blockmap[2],
        ]);
        $releaseId = $id;
    } else {
        if ($installer[0] === '') {
            throw new InvalidArgumentException('Envie o instalador .exe da versao.');
        }
        $stmt = $pdo->prepare("
            INSERT INTO app_releases (
              version, title, changelog, status, publish_at,
              installer_filename, installer_original_name, installer_sha512, installer_size,
              blockmap_filename, blockmap_original_name, blockmap_size,
              created_by_admin_id
            ) VALUES (
              :version, :title, :changelog, :status, :publish_at,
              :installer_filename, :installer_original_name, :installer_sha512, :installer_size,
              :blockmap_filename, :blockmap_original_name, :blockmap_size,
              :created_by_admin_id
            )
        ");
        $stmt->execute([
            'version' => $version,
            'title' => $title,
            'changelog' => $changelog,
            'status' => $status,
            'publish_at' => $publishAtSql,
            'installer_filename' => $installer[0],
            'installer_original_name' => $installer[1],
            'installer_sha512' => $installer[3],
            'installer_size' => $installer[2],
            'blockmap_filename' => $blockmap[0],
            'blockmap_original_name' => $blockmap[1],
            'blockmap_size' => $blockmap[2],
            'created_by_admin_id' => $adminId > 0 ? $adminId : null,
        ]);
        $releaseId = (int) $pdo->lastInsertId();
    }

    if ($status === 'published') {
        painel_updates_publish_release($releaseId);
    }

    return $releaseId;
}

function painel_updates_publish_release(int $id): void
{
    $pdo = painel_db();
    $release = painel_updates_release_by_id($id);
    if (!$release) {
        throw new InvalidArgumentException('Release nao encontrada.');
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec("UPDATE app_releases SET status = 'archived', archived_at = NOW() WHERE status = 'published'");
        $stmt = $pdo->prepare("UPDATE app_releases SET status = 'published', published_at = NOW(), archived_at = NULL WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    $published = painel_updates_release_by_id($id);
    if ($published) {
        painel_updates_write_latest($published);
    }
}

function painel_updates_archive_release(int $id): void
{
    $stmt = painel_db()->prepare("UPDATE app_releases SET status = 'archived', archived_at = NOW() WHERE id = :id");
    $stmt->execute(['id' => $id]);
}

function painel_updates_publish_due(): int
{
    $stmt = painel_db()->query("SELECT id FROM app_releases WHERE status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= NOW() ORDER BY publish_at ASC, id ASC");
    $ids = array_map('intval', array_column($stmt->fetchAll(), 'id'));
    $count = 0;
    foreach ($ids as $id) {
        painel_updates_publish_release($id);
        $count++;
    }
    return $count;
}

function painel_updates_record_download(?array $release, string $kind, string $fileName): void
{
    $stmt = painel_db()->prepare("
        INSERT INTO app_release_downloads (release_id, version, file_kind, file_name, ip_address, user_agent)
        VALUES (:release_id, :version, :file_kind, :file_name, :ip_address, :user_agent)
    ");
    $stmt->execute([
        'release_id' => $release ? (int) $release['id'] : null,
        'version' => $release ? (string) $release['version'] : '',
        'file_kind' => $kind,
        'file_name' => $fileName,
        'ip_address' => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64),
        'user_agent' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
    ]);
}
