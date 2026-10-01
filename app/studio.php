<?php
declare(strict_types=1);
require_once __DIR__ . '/media.php';

function studio_ready(): bool
{
    static $ready;
    if ($ready === null) {
        $q = db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('bf_workspaces','bf_users','bf_members','bf_folders','bf_forms','bf_tokens','bf_deliveries')");
        $ready = (int)$q->fetchColumn() === 7;
    }
    return $ready;
}
function studio_json($data, int $code = 200): never
{
    http_response_code($code); header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit;
}
function studio_error(int $code, string $message): never { studio_json(['error' => $message], $code); }
function studio_user(): ?array
{
    if (authenticated()) {
        $q = db()->prepare('SELECT email FROM admins WHERE id = ?'); $q->execute([$_SESSION['admin_id']]);
        return ['id' => (int)$_SESSION['admin_id'], 'email' => $q->fetchColumn(), 'agency' => true];
    }
    if (empty($_SESSION['studio_user'])) return null;
    $q = db()->prepare('SELECT * FROM bf_users WHERE id = ?'); $q->execute([$_SESSION['studio_user']]); $u = $q->fetch();
    if (!$u || !hash_equals(hash('sha256', $u['password_hash']), $_SESSION['studio_hash'] ?? '') || time() - ($_SESSION['studio_active'] ?? 0) > 1800 || time() - ($_SESSION['studio_login'] ?? 0) > 28800) {
        unset($_SESSION['studio_user'], $_SESSION['studio_hash']); return null;
    }
    $_SESSION['studio_active'] = time();
    return ['id' => (int)$u['id'], 'email' => $u['email'], 'agency' => false];
}
function studio_login(array $u, bool $agency): void
{
    session_regenerate_id(true);
    $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
    if ($agency) $_SESSION += ['admin_id' => (int)$u['id'], 'auth_hash' => hash('sha256', $u['password_hash']), 'last_active' => time(), 'login_at' => time()];
    else $_SESSION += ['studio_user' => (int)$u['id'], 'studio_hash' => hash('sha256', $u['password_hash']), 'studio_active' => time(), 'studio_login' => time()];
}
function studio_access(array $u, int $workspace, string $level = 'read'): string
{
    $q = db()->prepare('SELECT id FROM bf_workspaces WHERE id = ?'); $q->execute([$workspace]);
    if (!$q->fetchColumn()) studio_error(404, 'Espaço não encontrado.');
    if ($u['agency']) return 'agency';
    $q = db()->prepare('SELECT role FROM bf_members WHERE user_id = ? AND workspace_id = ?'); $q->execute([$u['id'], $workspace]); $role = $q->fetchColumn();
    $rank = ['reader' => 1, 'editor' => 2, 'admin' => 3];
    if (($rank[$role] ?? 0) < (['read' => 1, 'edit' => 2, 'admin' => 3][$level] ?? 99)) studio_error(403, 'Você não tem permissão para esta ação neste espaço.');
    return $role;
}
function studio_form(array $u, int $id, string $level = 'read', bool $lock = false): array
{
    $q = db()->prepare('SELECT f.*, b.workspace_id, b.folder_id, b.draft_json, b.published_settings, b.revision, b.published_revision, b.published_at FROM forms f JOIN bf_forms b ON b.form_id = f.id WHERE f.id = ?' . ($lock ? ' FOR UPDATE' : ''));
    $q->execute([$id]); $f = $q->fetch();
    if (!$f) studio_error(404, 'Formulário não encontrado.');
    studio_access($u, (int)$f['workspace_id'], $level);
    return $f;
}
function studio_draft(array $f): array
{
    $definition = form_definition($f['fields_json']);
    $definition['fields'] = array_map(static fn(array $field): array => $field + ['rules' => [], 'otherwise' => ['target' => 'next'], 'options' => []], $definition['fields']);
    return ['title' => $f['title'], 'slug' => $f['slug'], 'description' => '', 'whatsapp_message' => $f['whatsapp_message'], 'definition' => $definition, 'settings' => ['notify_emails' => [], 'minimum_seconds' => 3, 'tracking' => true, 'hidden_fields' => []]];
}
function studio_migrate(): void
{
    db()->exec(file_get_contents(__DIR__ . '/studio-schema.sql'));
    db()->prepare("INSERT IGNORE INTO bf_workspaces (name, slug) VALUES (?, ?)")->execute(['Produtora Bādon', 'badon']);
    $workspace = db()->query("SELECT id FROM bf_workspaces WHERE slug = 'badon'")->fetchColumn();
    // Importação aditiva: o JSON público e os leads não são modificados.
    $forms = db()->query('SELECT f.* FROM forms f LEFT JOIN bf_forms b ON b.form_id = f.id WHERE b.form_id IS NULL')->fetchAll();
    foreach ($forms as $f) db()->prepare('INSERT IGNORE INTO bf_forms (form_id, workspace_id, draft_json, published_settings, published_revision, published_at) VALUES (?, ?, ?, ?, 1, ?)')->execute([$f['id'], $workspace, json_encode(studio_draft($f), JSON_THROW_ON_ERROR), '{}', utc_now()]);
}
function studio_text($raw, int $max, bool $required = false): string
{
    $value = text_value($raw);
    if (!mb_check_encoding($value, 'UTF-8') || mb_strlen($value) > $max || ($required && $value === '') || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) throw new InvalidArgumentException('Preencha os textos dentro do limite indicado.');
    return $value;
}
function studio_clean($raw, bool $publish = false): array
{
    if (!is_array($raw)) throw new InvalidArgumentException('Rascunho inválido.');
    $title = studio_text($raw['title'] ?? '', 150, true);
    if (preg_match('/[\r\n]/', $title)) throw new InvalidArgumentException('O título precisa estar em uma linha.');
    $slug = text_value($raw['slug'] ?? '');
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) || strlen($slug) > 100) throw new InvalidArgumentException('Slug: use letras minúsculas, números e hífens.');
    $d = $raw['definition'] ?? [];
    if (!is_array($d) || !is_array($d['fields'] ?? null)) throw new InvalidArgumentException('Perguntas inválidas.');
    // Rascunhos vazios são permitidos; a publicação exige ao menos uma pergunta.
    $definition = !$d['fields'] && !$publish ? ['version' => 2, 'mode' => 'steps', 'fields' => [], 'completion' => clean_ending($d['completion'] ?? default_ending())] : clean_definition($d['fields'], 'steps', $d['completion'] ?? default_ending());
    $definition['welcome'] = clean_welcome($d['welcome'] ?? []);
    $t = $d['theme'] ?? [];
    if (!is_array($t)) throw new InvalidArgumentException('Tema inválido.');
    foreach (['primary' => '#075bc5', 'text' => '#12243d', 'background' => '#f5f7fb'] as $key => $default) {
        $color = text_value($t[$key] ?? $default);
        if (!preg_match('/^#[a-f0-9]{6}$/iD', $color)) throw new InvalidArgumentException('Cor inválida.');
        $definition['theme'][$key] = $color;
    }
    $definition['theme']['font'] = in_array($t['font'] ?? '', ['sans', 'serif', 'mono'], true) ? $t['font'] : 'sans';
    $definition['theme']['buttons'] = in_array($t['buttons'] ?? '', ['round', 'pill', 'square'], true) ? $t['buttons'] : 'round';
    $definition['theme']['progress'] = !isset($t['progress']) || (bool)$t['progress'];
    // Somente imagens já hospedadas no próprio site; sem rastreadores externos.
    $background = studio_text($t['image'] ?? '', 300);
    if ($background !== '' && !preg_match('#^/(?:maintenance-assets|links/assets|forms-media)/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp)$#D', $background)) throw new InvalidArgumentException('Imagem: use um caminho local PNG, JPG ou WebP de /forms-media/, /links/assets/ ou /maintenance-assets/.');
    $definition['theme']['image'] = $background;
    $s = $raw['settings'] ?? [];
    if (!is_array($s)) throw new InvalidArgumentException('Configurações inválidas.');
    $emails = $s['notify_emails'] ?? [];
    if (!is_array($emails) || count($emails) > 10) throw new InvalidArgumentException('Use até 10 e-mails de notificação.');
    foreach ($emails as &$email) { $email = strtolower(text_value($email)); if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) throw new InvalidArgumentException('Confira os e-mails de notificação.'); } unset($email);
    $hidden = $s['hidden_fields'] ?? [];
    if (!is_array($hidden) || count($hidden) > 20) throw new InvalidArgumentException('Use até 20 parâmetros personalizados.');
    foreach ($hidden as $key) if (!is_string($key) || !preg_match('/^[a-z][a-z0-9_]{0,39}$/D', $key)) throw new InvalidArgumentException('Parâmetros: letras minúsculas, números e sublinhado.');
    $webhook = studio_text($s['webhook_url'] ?? '', 1000);
    if ($webhook !== '') studio_webhook_host($webhook);
    // Map positions belong to the draft, never to the public schema or submission ticket.
    $layout = $raw['layout'] ?? [];
    if (!is_array($layout) || count($layout) > 2202) throw new InvalidArgumentException('Organização do mapa inválida.');
    $validNodes = ['start' => true, 'end' => true];
    foreach ($definition['fields'] as $field) {
        $validNodes['q:' . $field['key']] = true;
        if ($field['otherwise']['target'] === 'finish') $validNodes['stop:' . $field['key'] . ':default'] = true;
        foreach ($field['rules'] as $i => $rule) if ($rule['target'] === 'finish') $validNodes['stop:' . $field['key'] . ':rule:' . $i] = true;
    }
    $positions = [];
    foreach ($layout as $id => $position) {
        if (!isset($validNodes[$id])) continue; // Discard removed nodes and unknown keys.
        if (!is_array($position)) throw new InvalidArgumentException('Posição inválida no mapa.');
        foreach (['x', 'y'] as $axis) {
            $n = $position[$axis] ?? null;
            if ((!is_int($n) && !is_float($n)) || !is_finite((float)$n) || abs($n) > 1000000) throw new InvalidArgumentException('Posição inválida no mapa.');
        }
        $positions[$id] = ['x' => round((float)$position['x'], 2), 'y' => round((float)$position['y'], 2)];
    }
    return ['title' => $title, 'slug' => $slug, 'description' => studio_text($raw['description'] ?? '', 2000), 'whatsapp_message' => studio_text($raw['whatsapp_message'] ?? '', 2000), 'definition' => $definition, 'layout' => (object)$positions,
        'settings' => ['notify_emails' => array_values(array_unique($emails)), 'webhook_url' => $webhook, 'tracking' => !empty($s['tracking']), 'hidden_fields' => array_values(array_unique($hidden)), 'minimum_seconds' => max(3, min(60, (int)($s['minimum_seconds'] ?? 3)))]];
}
function studio_webhook_host(string $url): string
{
    $p = parse_url($url);
    if (!$p || ($p['scheme'] ?? '') !== 'https' || empty($p['host']) || isset($p['user']) || isset($p['pass']) || isset($p['fragment']) || (isset($p['port']) && $p['port'] !== 443) || !preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/iD', $p['host'])) throw new InvalidArgumentException('Webhook: use HTTPS com domínio público, sem credenciais, fragmento ou porta alternativa.');
    return $p['host'];
}
function studio_interpolate(string $text, array $values): string
{
    $map = array_column($values, 'value', 'key');
    return preg_replace_callback('/@([a-z][a-z0-9_]{0,39})/', fn($m) => $map[$m[1]] ?? $m[0], $text);
}
