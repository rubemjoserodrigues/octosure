<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function painel_suggestions_bootstrap(): void
{
    static $bootstrapped = false;
    if ($bootstrapped) {
        return;
    }

    $pdo = painel_db();

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS panel_suggestions (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            entry_type ENUM('suggestion', 'update') NOT NULL DEFAULT 'suggestion',
            title VARCHAR(200) NOT NULL,
            details TEXT NOT NULL,
            approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
            public_status ENUM('em_votacao', 'em_desenvolvimento', 'lancado', 'pausado', 'arquivado') NOT NULL DEFAULT 'em_votacao',
            is_visible TINYINT(1) NOT NULL DEFAULT 0,
            publish_at DATETIME NULL,
            publish_until DATETIME NULL,
            created_by_user_id BIGINT UNSIGNED NULL,
            created_by_email VARCHAR(255) NULL,
            approved_by_admin_id BIGINT UNSIGNED NULL,
            approved_at DATETIME NULL,
            admin_notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_panel_suggestions_public (approval_status, is_visible, public_status, publish_at, publish_until),
            INDEX idx_panel_suggestions_type (entry_type, public_status),
            INDEX idx_panel_suggestions_created_by_user (created_by_user_id),
            CONSTRAINT fk_panel_suggestions_user FOREIGN KEY (created_by_user_id) REFERENCES panel_users(id) ON DELETE SET NULL,
            CONSTRAINT fk_panel_suggestions_admin FOREIGN KEY (approved_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS panel_suggestion_votes (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            suggestion_id BIGINT UNSIGNED NOT NULL,
            panel_user_id BIGINT UNSIGNED NOT NULL,
            vote_type ENUM('up', 'down') NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_panel_suggestion_vote (suggestion_id, panel_user_id),
            INDEX idx_panel_suggestion_votes_user (panel_user_id),
            CONSTRAINT fk_panel_suggestion_votes_suggestion FOREIGN KEY (suggestion_id) REFERENCES panel_suggestions(id) ON DELETE CASCADE,
            CONSTRAINT fk_panel_suggestion_votes_user FOREIGN KEY (panel_user_id) REFERENCES panel_users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    $bootstrapped = true;
}

function painel_suggestion_entry_options(): array
{
    return [
        'suggestion' => 'Sugestao',
        'update' => 'Atualizacao',
    ];
}

function painel_suggestion_approval_options(): array
{
    return [
        'pending' => 'Pendente',
        'approved' => 'Aprovada',
        'rejected' => 'Rejeitada',
    ];
}

function painel_suggestion_status_options(): array
{
    return [
        'em_votacao' => 'Em votacao',
        'em_desenvolvimento' => 'Em desenvolvimento',
        'lancado' => 'Lancado',
        'pausado' => 'Pausado',
        'arquivado' => 'Arquivado',
    ];
}

function painel_suggestion_clean_text(string $value, int $maxLen): string
{
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    return mb_substr($value, 0, $maxLen);
}

function painel_suggestion_clean_details(string $value, int $maxLen = 4000): string
{
    $value = trim((string) $value);
    $value = preg_replace("/\r\n?/", "\n", $value) ?? '';
    $value = preg_replace("/\n{3,}/", "\n\n", $value) ?? $value;
    return mb_substr(trim($value), 0, $maxLen);
}

function painel_suggestion_normalize_datetime(?string $value): ?string
{
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }

    $formats = ['Y-m-d\TH:i', 'Y-m-d H:i:s', 'Y-m-d H:i'];
    foreach ($formats as $format) {
        $dt = DateTimeImmutable::createFromFormat($format, $value);
        if ($dt instanceof DateTimeImmutable) {
            return $dt->format('Y-m-d H:i:s');
        }
    }

    $parsed = strtotime($value);
    if ($parsed === false) {
        throw new InvalidArgumentException('Data/hora invalida informada para publicacao.');
    }
    return date('Y-m-d H:i:s', $parsed);
}

function painel_suggestion_is_truthy($value): bool
{
    if (is_bool($value)) {
        return $value;
    }
    $txt = strtolower(trim((string) $value));
    return in_array($txt, ['1', 'true', 'yes', 'on'], true);
}

function painel_suggestion_validate_payload(array $payload): array
{
    $entryOptions = painel_suggestion_entry_options();
    $approvalOptions = painel_suggestion_approval_options();
    $statusOptions = painel_suggestion_status_options();

    $entryType = (string) ($payload['entry_type'] ?? 'suggestion');
    if (!isset($entryOptions[$entryType])) {
        $entryType = 'suggestion';
    }

    $title = painel_suggestion_clean_text((string) ($payload['title'] ?? ''), 200);
    if ($title === '') {
        throw new InvalidArgumentException('Informe o titulo da sugestao.');
    }

    $details = painel_suggestion_clean_details((string) ($payload['details'] ?? ''));
    if ($details === '') {
        throw new InvalidArgumentException('Informe os detalhes da sugestao.');
    }

    $approvalStatus = (string) ($payload['approval_status'] ?? 'pending');
    if (!isset($approvalOptions[$approvalStatus])) {
        $approvalStatus = 'pending';
    }

    $publicStatus = (string) ($payload['public_status'] ?? 'em_votacao');
    if (!isset($statusOptions[$publicStatus])) {
        $publicStatus = 'em_votacao';
    }

    $publishAt = painel_suggestion_normalize_datetime((string) ($payload['publish_at'] ?? ''));
    $publishUntil = painel_suggestion_normalize_datetime((string) ($payload['publish_until'] ?? ''));
    if ($publishAt !== null && $publishUntil !== null && strtotime($publishAt) > strtotime($publishUntil)) {
        throw new InvalidArgumentException('A data inicial nao pode ser maior que a data final.');
    }

    $isVisible = painel_suggestion_is_truthy($payload['is_visible'] ?? false);
    if ($approvalStatus !== 'approved') {
        $isVisible = false;
    }

    $adminNotes = painel_suggestion_clean_details((string) ($payload['admin_notes'] ?? ''), 3000);

    return [
        'entry_type' => $entryType,
        'title' => $title,
        'details' => $details,
        'approval_status' => $approvalStatus,
        'public_status' => $publicStatus,
        'is_visible' => $isVisible ? 1 : 0,
        'publish_at' => $publishAt,
        'publish_until' => $publishUntil,
        'admin_notes' => $adminNotes !== '' ? $adminNotes : null,
    ];
}

function painel_suggestions_summary(): array
{
    painel_suggestions_bootstrap();
    $pdo = painel_db();

    $summary = $pdo->query(
        "SELECT
            COUNT(*) AS total_items,
            SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_items,
            SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved_items,
            SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_items,
            SUM(CASE WHEN approval_status = 'approved' AND is_visible = 1 THEN 1 ELSE 0 END) AS visible_items
         FROM panel_suggestions"
    )->fetch() ?: [];

    $votes = $pdo->query(
        "SELECT
            SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
            SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
         FROM panel_suggestion_votes"
    )->fetch() ?: [];

    return [
        'total_items' => (int) ($summary['total_items'] ?? 0),
        'pending_items' => (int) ($summary['pending_items'] ?? 0),
        'approved_items' => (int) ($summary['approved_items'] ?? 0),
        'rejected_items' => (int) ($summary['rejected_items'] ?? 0),
        'visible_items' => (int) ($summary['visible_items'] ?? 0),
        'upvotes' => (int) ($votes['upvotes'] ?? 0),
        'downvotes' => (int) ($votes['downvotes'] ?? 0),
    ];
}

function painel_suggestions_admin_list(): array
{
    painel_suggestions_bootstrap();
    $pdo = painel_db();

    $sql = "
        SELECT
            s.*,
            COALESCE(vt.upvotes, 0) AS upvotes,
            COALESCE(vt.downvotes, 0) AS downvotes,
            (COALESCE(vt.upvotes, 0) - COALESCE(vt.downvotes, 0)) AS score
        FROM panel_suggestions s
        LEFT JOIN (
            SELECT
                suggestion_id,
                SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
                SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
            FROM panel_suggestion_votes
            GROUP BY suggestion_id
        ) vt ON vt.suggestion_id = s.id
        ORDER BY
            CASE s.approval_status
                WHEN 'pending' THEN 0
                WHEN 'approved' THEN 1
                ELSE 2
            END ASC,
            s.updated_at DESC,
            s.id DESC";

    return $pdo->query($sql)->fetchAll();
}

function painel_suggestion_find_admin(int $suggestionId): ?array
{
    painel_suggestions_bootstrap();
    if ($suggestionId <= 0) {
        return null;
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT
            s.*,
            COALESCE(vt.upvotes, 0) AS upvotes,
            COALESCE(vt.downvotes, 0) AS downvotes,
            (COALESCE(vt.upvotes, 0) - COALESCE(vt.downvotes, 0)) AS score
         FROM panel_suggestions s
         LEFT JOIN (
            SELECT
                suggestion_id,
                SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
                SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
            FROM panel_suggestion_votes
            GROUP BY suggestion_id
         ) vt ON vt.suggestion_id = s.id
         WHERE s.id = :id
         LIMIT 1"
    );
    $stmt->execute(['id' => $suggestionId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function painel_suggestion_save_admin(array $payload, int $adminId, string $adminEmail): int
{
    painel_suggestions_bootstrap();
    if ($adminId <= 0) {
        throw new InvalidArgumentException('Admin invalido para salvar sugestao.');
    }

    $data = painel_suggestion_validate_payload($payload);
    $suggestionId = (int) ($payload['suggestion_id'] ?? 0);
    $pdo = painel_db();

    if ($suggestionId > 0) {
        $existing = painel_suggestion_find_admin($suggestionId);
        if (!$existing) {
            throw new InvalidArgumentException('Sugestao nao encontrada.');
        }

        $approvedAt = $existing['approved_at'] ?? null;
        $approvedByAdminId = $existing['approved_by_admin_id'] ?? null;
        if ($data['approval_status'] === 'approved') {
            if (!$approvedAt) {
                $approvedAt = date('Y-m-d H:i:s');
            }
            $approvedByAdminId = $adminId;
        } else {
            $approvedAt = null;
            $approvedByAdminId = null;
        }

        $stmt = $pdo->prepare(
            "UPDATE panel_suggestions
             SET entry_type = :entry_type,
                 title = :title,
                 details = :details,
                 approval_status = :approval_status,
                 public_status = :public_status,
                 is_visible = :is_visible,
                 publish_at = :publish_at,
                 publish_until = :publish_until,
                 approved_by_admin_id = :approved_by_admin_id,
                 approved_at = :approved_at,
                 admin_notes = :admin_notes
             WHERE id = :id"
        );
        $stmt->execute([
            'id' => $suggestionId,
            'entry_type' => $data['entry_type'],
            'title' => $data['title'],
            'details' => $data['details'],
            'approval_status' => $data['approval_status'],
            'public_status' => $data['public_status'],
            'is_visible' => $data['is_visible'],
            'publish_at' => $data['publish_at'],
            'publish_until' => $data['publish_until'],
            'approved_by_admin_id' => $approvedByAdminId,
            'approved_at' => $approvedAt,
            'admin_notes' => $data['admin_notes'],
        ]);

        return $suggestionId;
    }

    $approvedAt = null;
    $approvedByAdminId = null;
    if ($data['approval_status'] === 'approved') {
        $approvedAt = date('Y-m-d H:i:s');
        $approvedByAdminId = $adminId;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO panel_suggestions (
            entry_type,
            title,
            details,
            approval_status,
            public_status,
            is_visible,
            publish_at,
            publish_until,
            created_by_email,
            approved_by_admin_id,
            approved_at,
            admin_notes
        ) VALUES (
            :entry_type,
            :title,
            :details,
            :approval_status,
            :public_status,
            :is_visible,
            :publish_at,
            :publish_until,
            :created_by_email,
            :approved_by_admin_id,
            :approved_at,
            :admin_notes
        )"
    );
    $stmt->execute([
        'entry_type' => $data['entry_type'],
        'title' => $data['title'],
        'details' => $data['details'],
        'approval_status' => $data['approval_status'],
        'public_status' => $data['public_status'],
        'is_visible' => $data['is_visible'],
        'publish_at' => $data['publish_at'],
        'publish_until' => $data['publish_until'],
        'created_by_email' => mb_strtolower(trim($adminEmail)),
        'approved_by_admin_id' => $approvedByAdminId,
        'approved_at' => $approvedAt,
        'admin_notes' => $data['admin_notes'],
    ]);

    return (int) $pdo->lastInsertId();
}

function painel_suggestion_delete_admin(int $suggestionId): void
{
    painel_suggestions_bootstrap();
    if ($suggestionId <= 0) {
        throw new InvalidArgumentException('Sugestao invalida para exclusao.');
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare('DELETE FROM panel_suggestions WHERE id = :id');
    $stmt->execute(['id' => $suggestionId]);
}

function painel_socket_token_ttl_seconds(): int
{
    return 60 * 60 * 24 * 45;
}

function painel_auth_subject_from_socket_token(string $rawToken, bool $allowAdmin = true): ?array
{
    painel_suggestions_bootstrap();
    $rawToken = trim($rawToken);
    if ($rawToken === '') {
        return null;
    }

    $parts = explode(':', $rawToken);
    if (count($parts) !== 3) {
        return null;
    }

    $userId = (int) ($parts[0] ?? 0);
    $issuedAt = (int) ($parts[1] ?? 0);
    $signature = strtolower(trim((string) ($parts[2] ?? '')));
    if ($userId <= 0 || $issuedAt <= 0 || !preg_match('/^[a-f0-9]{32}$/', $signature)) {
        return null;
    }

    if ((time() - $issuedAt) > painel_socket_token_ttl_seconds()) {
        return null;
    }

    $pdo = painel_db();
    $candidates = [];

    if ($allowAdmin) {
        $stmt = $pdo->prepare('SELECT id, email FROM admins WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();
        if ($row) {
            $candidates[] = [
                'id' => (int) $row['id'],
                'email' => (string) $row['email'],
                'kind' => 'admin',
            ];
        }
    }

    $stmt = $pdo->prepare(
        'SELECT id, email, subscription_status, subscription_expires_at
         FROM panel_users
         WHERE id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $userId]);
    $userRow = $stmt->fetch();
    if ($userRow) {
        $candidates[] = [
            'id' => (int) $userRow['id'],
            'email' => (string) $userRow['email'],
            'kind' => 'user',
            'subscription_status' => (string) ($userRow['subscription_status'] ?? 'inactive'),
            'subscription_expires_at' => (string) ($userRow['subscription_expires_at'] ?? ''),
        ];
    }

    foreach ($candidates as $candidate) {
        $expected = substr(hash('sha256', $candidate['kind'] . ':' . $candidate['id'] . ':' . mb_strtolower(trim((string) $candidate['email'])) . ':' . $issuedAt), 0, 32);
        if (!hash_equals($expected, $signature)) {
            continue;
        }

        if (($candidate['kind'] ?? '') === 'user') {
            if (($candidate['subscription_status'] ?? 'inactive') !== 'active') {
                return null;
            }
            $expiresAt = trim((string) ($candidate['subscription_expires_at'] ?? ''));
            if ($expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) <= time()) {
                return null;
            }
        }

        return $candidate;
    }

    return null;
}

function painel_suggestion_create_from_user(array $viewer, string $title, string $details): int
{
    painel_suggestions_bootstrap();
    if (($viewer['kind'] ?? '') !== 'user') {
        throw new InvalidArgumentException('Apenas usuarios ativos podem enviar sugestoes.');
    }

    $data = painel_suggestion_validate_payload([
        'entry_type' => 'suggestion',
        'title' => $title,
        'details' => $details,
        'approval_status' => 'pending',
        'public_status' => 'em_votacao',
        'is_visible' => false,
    ]);

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "INSERT INTO panel_suggestions (
            entry_type,
            title,
            details,
            approval_status,
            public_status,
            is_visible,
            created_by_user_id,
            created_by_email
        ) VALUES (
            :entry_type,
            :title,
            :details,
            'pending',
            'em_votacao',
            0,
            :created_by_user_id,
            :created_by_email
        )"
    );
    $stmt->execute([
        'entry_type' => $data['entry_type'],
        'title' => $data['title'],
        'details' => $data['details'],
        'created_by_user_id' => (int) $viewer['id'],
        'created_by_email' => mb_strtolower(trim((string) $viewer['email'])),
    ]);

    return (int) $pdo->lastInsertId();
}

function painel_suggestions_public_stats(): array
{
    painel_suggestions_bootstrap();
    $pdo = painel_db();

    $summary = $pdo->query(
        "SELECT
            COUNT(*) AS total_items,
            SUM(CASE WHEN entry_type = 'update' THEN 1 ELSE 0 END) AS updates_total,
            SUM(CASE WHEN public_status = 'em_votacao' THEN 1 ELSE 0 END) AS voting_total,
            SUM(CASE WHEN public_status = 'em_desenvolvimento' THEN 1 ELSE 0 END) AS progress_total,
            SUM(CASE WHEN public_status = 'lancado' THEN 1 ELSE 0 END) AS launched_total
         FROM panel_suggestions
         WHERE approval_status = 'approved'
           AND is_visible = 1
           AND (publish_at IS NULL OR publish_at <= NOW())
           AND (publish_until IS NULL OR publish_until >= NOW())
           AND public_status <> 'arquivado'"
    )->fetch() ?: [];

    $votes = $pdo->query(
        "SELECT
            COALESCE(SUM(vt.upvotes), 0) AS upvotes,
            COALESCE(SUM(vt.downvotes), 0) AS downvotes
         FROM (
            SELECT
                suggestion_id,
                SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
                SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
            FROM panel_suggestion_votes
            GROUP BY suggestion_id
         ) vt"
    )->fetch() ?: [];

    return [
        'total_items' => (int) ($summary['total_items'] ?? 0),
        'updates_total' => (int) ($summary['updates_total'] ?? 0),
        'voting_total' => (int) ($summary['voting_total'] ?? 0),
        'progress_total' => (int) ($summary['progress_total'] ?? 0),
        'launched_total' => (int) ($summary['launched_total'] ?? 0),
        'upvotes' => (int) ($votes['upvotes'] ?? 0),
        'downvotes' => (int) ($votes['downvotes'] ?? 0),
    ];
}

function painel_suggestions_public_list(array $options = [], ?int $viewerUserId = null): array
{
    painel_suggestions_bootstrap();
    $pdo = painel_db();

    $entryType = (string) ($options['entry_type'] ?? 'all');
    $publicStatus = (string) ($options['public_status'] ?? 'all');
    $sort = (string) ($options['sort'] ?? 'votes');
    $limit = max(1, min((int) ($options['limit'] ?? 50), 100));

    $entryOptions = painel_suggestion_entry_options();
    if ($entryType !== 'all' && !isset($entryOptions[$entryType])) {
        $entryType = 'all';
    }

    $statusOptions = painel_suggestion_status_options();
    if ($publicStatus !== 'all' && !isset($statusOptions[$publicStatus])) {
        $publicStatus = 'all';
    }

    $sortSql = 'ORDER BY score DESC, s.created_at DESC';
    if ($sort === 'recent') {
        $sortSql = 'ORDER BY s.created_at DESC, score DESC';
    } elseif ($sort === 'oldest') {
        $sortSql = 'ORDER BY s.created_at ASC, score DESC';
    } elseif ($sort === 'status') {
        $sortSql = "ORDER BY
            CASE s.public_status
                WHEN 'em_votacao' THEN 0
                WHEN 'em_desenvolvimento' THEN 1
                WHEN 'lancado' THEN 2
                WHEN 'pausado' THEN 3
                ELSE 4
            END ASC,
            score DESC,
            s.created_at DESC";
    }

    $sql = "
        SELECT
            s.id,
            s.entry_type,
            s.title,
            s.details,
            s.public_status,
            s.created_at,
            s.publish_at,
            s.publish_until,
            COALESCE(vt.upvotes, 0) AS upvotes,
            COALESCE(vt.downvotes, 0) AS downvotes,
            (COALESCE(vt.upvotes, 0) - COALESCE(vt.downvotes, 0)) AS score,
            uv.vote_type AS viewer_vote
        FROM panel_suggestions s
        LEFT JOIN (
            SELECT
                suggestion_id,
                SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
                SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
            FROM panel_suggestion_votes
            GROUP BY suggestion_id
        ) vt ON vt.suggestion_id = s.id
        LEFT JOIN panel_suggestion_votes uv
            ON uv.suggestion_id = s.id
           AND uv.panel_user_id = :viewer_user_id
        WHERE s.approval_status = 'approved'
          AND s.is_visible = 1
          AND (s.publish_at IS NULL OR s.publish_at <= NOW())
          AND (s.publish_until IS NULL OR s.publish_until >= NOW())
          AND s.public_status <> 'arquivado'";

    $params = [
        'viewer_user_id' => (int) ($viewerUserId ?? 0),
    ];

    if ($entryType !== 'all') {
        $sql .= ' AND s.entry_type = :entry_type';
        $params['entry_type'] = $entryType;
    }
    if ($publicStatus !== 'all') {
        $sql .= ' AND s.public_status = :public_status';
        $params['public_status'] = $publicStatus;
    }

    $sql .= " {$sortSql} LIMIT :limit_rows";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit_rows', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function painel_suggestion_vote_summary(int $suggestionId, ?int $viewerUserId = null): array
{
    painel_suggestions_bootstrap();
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT
            COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes,
            COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downvotes
         FROM panel_suggestion_votes
         WHERE suggestion_id = :suggestion_id"
    );
    $stmt->execute(['suggestion_id' => $suggestionId]);
    $row = $stmt->fetch() ?: [];

    $viewerVote = null;
    if (($viewerUserId ?? 0) > 0) {
        $stmt = $pdo->prepare(
            'SELECT vote_type FROM panel_suggestion_votes WHERE suggestion_id = :suggestion_id AND panel_user_id = :panel_user_id LIMIT 1'
        );
        $stmt->execute([
            'suggestion_id' => $suggestionId,
            'panel_user_id' => (int) $viewerUserId,
        ]);
        $viewerVote = $stmt->fetchColumn() ?: null;
    }

    $upvotes = (int) ($row['upvotes'] ?? 0);
    $downvotes = (int) ($row['downvotes'] ?? 0);

    return [
        'upvotes' => $upvotes,
        'downvotes' => $downvotes,
        'score' => $upvotes - $downvotes,
        'viewer_vote' => $viewerVote ? (string) $viewerVote : null,
    ];
}

function painel_suggestion_public_exists(int $suggestionId): bool
{
    painel_suggestions_bootstrap();
    $pdo = painel_db();
    $stmt = $pdo->prepare(
        "SELECT id
         FROM panel_suggestions
         WHERE id = :id
           AND approval_status = 'approved'
           AND is_visible = 1
           AND (publish_at IS NULL OR publish_at <= NOW())
           AND (publish_until IS NULL OR publish_until >= NOW())
           AND public_status <> 'arquivado'
         LIMIT 1"
    );
    $stmt->execute(['id' => $suggestionId]);
    return (bool) $stmt->fetchColumn();
}

function painel_suggestion_cast_vote(int $suggestionId, int $panelUserId, string $voteType): array
{
    painel_suggestions_bootstrap();
    if ($panelUserId <= 0) {
        throw new InvalidArgumentException('Usuario invalido para votar.');
    }
    if (!in_array($voteType, ['up', 'down'], true)) {
        throw new InvalidArgumentException('Tipo de voto invalido.');
    }
    if (!painel_suggestion_public_exists($suggestionId)) {
        throw new InvalidArgumentException('Sugestao nao encontrada para votacao.');
    }

    $pdo = painel_db();
    $stmt = $pdo->prepare(
        'SELECT id, vote_type FROM panel_suggestion_votes WHERE suggestion_id = :suggestion_id AND panel_user_id = :panel_user_id LIMIT 1'
    );
    $stmt->execute([
        'suggestion_id' => $suggestionId,
        'panel_user_id' => $panelUserId,
    ]);
    $existing = $stmt->fetch();

    if ($existing && (string) ($existing['vote_type'] ?? '') === $voteType) {
        $delete = $pdo->prepare('DELETE FROM panel_suggestion_votes WHERE id = :id');
        $delete->execute(['id' => (int) $existing['id']]);
        return painel_suggestion_vote_summary($suggestionId, $panelUserId);
    }

    if ($existing) {
        $update = $pdo->prepare(
            'UPDATE panel_suggestion_votes SET vote_type = :vote_type WHERE id = :id'
        );
        $update->execute([
            'vote_type' => $voteType,
            'id' => (int) $existing['id'],
        ]);
    } else {
        $insert = $pdo->prepare(
            'INSERT INTO panel_suggestion_votes (suggestion_id, panel_user_id, vote_type) VALUES (:suggestion_id, :panel_user_id, :vote_type)'
        );
        $insert->execute([
            'suggestion_id' => $suggestionId,
            'panel_user_id' => $panelUserId,
            'vote_type' => $voteType,
        ]);
    }

    return painel_suggestion_vote_summary($suggestionId, $panelUserId);
}
