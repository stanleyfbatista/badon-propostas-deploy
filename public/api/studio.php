<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
require BADON_APP . '/studio.php';
require_once BADON_APP . '/mail.php';
header('Content-Type: application/json; charset=utf-8');
if (!studio_ready()) studio_error(503, 'A nova versão precisa da migração studio:migrate no cPanel. O site e os formulários atuais continuam disponíveis.');
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) studio_error(405, 'Método não permitido.');
$in = [];
if ($method === 'POST') {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 200000) studio_error(413, 'O formulário excede 200 KB. Reduza descrições ou quantidade de opções.');
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? text_value($_POST['csrf'] ?? ''))) studio_error(403, 'Sessão expirada. Atualize a página.');
    if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        try { $in = json_decode(file_get_contents('php://input'), true, 32, JSON_THROW_ON_ERROR); }
        catch (JsonException $e) { studio_error(400, 'Dados inválidos.'); }
        if (!is_array($in)) studio_error(400, 'Dados inválidos.');
    } else $in = $_POST;
}
$action = text_value($_GET['action'] ?? 'boot');
if ($method !== 'POST' && !in_array($action, ['boot', 'forms', 'form', 'leads', 'members'], true)) studio_error(405, 'Esta ação exige POST.');
$u = studio_user();
try {
    if ($action === 'login') {
        $email = strtolower(studio_text($in['email'] ?? '', 190));
        $ip = rate_allowed('studio-login-ip', client_identity(), 30, 900);
        $account = rate_allowed('studio-login-account', $email, 10, 900);
        if (!$ip || !$account) studio_error(429, 'Aguarde 15 minutos antes de tentar novamente.');
        $q = db()->prepare('SELECT * FROM admins WHERE email = ?'); $q->execute([$email]); $user = $q->fetch(); $agency = (bool)$user;
        if (!$user) { $q = db()->prepare('SELECT * FROM bf_users WHERE email = ?'); $q->execute([$email]); $user = $q->fetch(); }
        $password = is_string($in['password'] ?? null) ? $in['password'] : '';
        $valid = password_verify($password, $user['password_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (!$user || !$valid) studio_error(401, 'E-mail ou senha incorretos.');
        studio_login($user, $agency); studio_json(['ok' => true]);
    }
    if ($action === 'magic') {
        $email = strtolower(studio_text($in['email'] ?? '', 190));
        if (!rate_allowed('magic-ip', client_identity(), 10, 3600) || !rate_allowed('magic-email', $email, 3, 3600)) studio_error(429, 'Aguarde antes de pedir outro link.');
        $q = db()->prepare('SELECT email FROM admins WHERE email = ? UNION SELECT email FROM bf_users WHERE email = ?'); $q->execute([$email, $email]);
        if ($q->fetchColumn()) {
            $token = bin2hex(random_bytes(32));
            db()->prepare("INSERT INTO bf_tokens (token_hash, kind, email, expires_at) VALUES (?, 'magic', ?, ?)")->execute([hash('sha256', $token), $email, gmdate('Y-m-d H:i:s', time() + 900)]);
            if (!studio_send_mail($email, 'Seu acesso ao Bādon Forms', "Acesse em até 15 minutos. O link funciona uma vez.\n\n" . $config['base_url'] . '/admin/studio/#token=' . $token)) db()->prepare('DELETE FROM bf_tokens WHERE token_hash = ?')->execute([hash('sha256', $token)]);
        }
        studio_json(['ok' => true, 'message' => 'Se este e-mail tiver acesso, enviaremos um link válido por 15 minutos.']);
    }
    if ($action === 'accept') {
        if (!rate_allowed('token-accept', client_identity(), 20, 900)) studio_error(429, 'Aguarde antes de tentar novamente.');
        $hash = hash('sha256', text_value($in['token'] ?? ''));
        db()->beginTransaction();
        $q = db()->prepare('SELECT * FROM bf_tokens WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > ? FOR UPDATE'); $q->execute([$hash, utc_now()]); $token = $q->fetch();
        if (!$token) { db()->rollBack(); studio_error(422, 'Link inválido, expirado ou já utilizado.'); }
        $q = db()->prepare('SELECT * FROM admins WHERE email = ?'); $q->execute([$token['email']]); $user = $q->fetch(); $agency = (bool)$user;
        if (!$user) { $q = db()->prepare('SELECT * FROM bf_users WHERE email = ?'); $q->execute([$token['email']]); $user = $q->fetch(); }
        if (!$user && $token['kind'] === 'invite') {
            $password = is_string($in['password'] ?? null) ? $in['password'] : '';
            if (strlen($password) < 12 || strlen($password) > 72) { db()->rollBack(); studio_error(422, 'Defina sua senha com 12 a 72 bytes para aceitar o convite.'); }
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            db()->prepare('INSERT INTO bf_users (email, password_hash) VALUES (?, ?)')->execute([$token['email'], $passwordHash]);
            $user = ['id' => db()->lastInsertId(), 'password_hash' => $passwordHash];
        }
        if (!$user) { db()->rollBack(); studio_error(422, 'Conta indisponível.'); }
        if ($token['kind'] === 'invite' && !$agency) db()->prepare('INSERT INTO bf_members (workspace_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)')->execute([$token['workspace_id'], $user['id'], $token['role']]);
        db()->prepare('UPDATE bf_tokens SET accepted_at = ? WHERE token_hash = ?')->execute([utc_now(), $hash]);
        db()->commit(); studio_login($user, $agency); studio_json(['ok' => true]);
    }
    if ($action === 'boot') {
        $workspaces = [];
        if ($u) {
            if ($u['agency']) $workspaces = db()->query("SELECT *, 'agency' AS role FROM bf_workspaces ORDER BY name")->fetchAll();
            else { $q = db()->prepare('SELECT w.*, m.role FROM bf_workspaces w JOIN bf_members m ON m.workspace_id = w.id WHERE m.user_id = ? ORDER BY w.name'); $q->execute([$u['id']]); $workspaces = $q->fetchAll(); }
        }
        studio_json(['user' => $u, 'workspaces' => $workspaces, 'csrf' => $_SESSION['csrf']]);
    }
    if (!$u) studio_error(401, 'Entre na sua conta para continuar.');
    if ($action === 'logout') { $_SESSION = []; session_regenerate_id(true); $_SESSION['csrf'] = bin2hex(random_bytes(32)); studio_json(['ok' => true]); }
    if ($action === 'workspace-create') {
        if (!$u['agency']) studio_error(403, 'Somente a agência pode criar espaços de clientes.');
        $name = studio_text($in['name'] ?? '', 150, true); $slug = text_value($in['slug'] ?? '');
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) || strlen($slug) > 100) studio_error(422, 'Slug inválido.');
        db()->prepare('INSERT INTO bf_workspaces (name, slug) VALUES (?, ?)')->execute([$name, $slug]); studio_json(['id' => (int)db()->lastInsertId()]);
    }
    $workspace = (int)($in['workspace'] ?? $_GET['workspace'] ?? 0);
    if (in_array($action, ['forms', 'folder-create', 'form-create', 'members', 'invite', 'member-remove'], true)) {
        studio_access($u, $workspace, in_array($action, ['invite', 'member-remove'], true) ? 'admin' : (in_array($action, ['folder-create', 'form-create'], true) ? 'edit' : 'read'));
    }
    if ($action === 'forms') {
        $q = db()->prepare('SELECT f.id, f.title, f.slug, f.active, b.draft_json, b.folder_id, b.revision, b.published_revision, b.published_at, (SELECT COUNT(*) FROM leads l WHERE l.form_id = f.id) AS lead_count FROM forms f JOIN bf_forms b ON b.form_id = f.id WHERE b.workspace_id = ? ORDER BY f.id DESC'); $q->execute([$workspace]); $forms = $q->fetchAll();
        foreach ($forms as &$f) { $f['draft_title'] = json_decode($f['draft_json'], true)['title']; unset($f['draft_json']); } unset($f);
        $q = db()->prepare('SELECT * FROM bf_folders WHERE workspace_id = ? ORDER BY name'); $q->execute([$workspace]);
        studio_json(['forms' => $forms, 'folders' => $q->fetchAll()]);
    }
    if ($action === 'folder-create') {
        db()->prepare('INSERT INTO bf_folders (workspace_id, name) VALUES (?, ?)')->execute([$workspace, studio_text($in['name'] ?? '', 100, true)]); studio_json(['ok' => true]);
    }
    if ($action === 'members') {
        studio_access($u, $workspace, 'admin');
        $q = db()->prepare('SELECT u.id, u.email, m.role FROM bf_members m JOIN bf_users u ON u.id = m.user_id WHERE m.workspace_id = ? ORDER BY u.email'); $q->execute([$workspace]);
        studio_json(['members' => $q->fetchAll()]);
    }
    if ($action === 'invite') {
        $email = strtolower(studio_text($in['email'] ?? '', 190)); $role = text_value($in['role'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($role, ['admin', 'editor', 'reader'], true)) studio_error(422, 'Confira o e-mail e o papel do membro.');
        if (!rate_allowed('invite', ($u['agency'] ? 'a' : 'u') . $u['id'], 20, 3600)) studio_error(429, 'Limite de convites atingido nesta hora.');
        $token = bin2hex(random_bytes(32));
        db()->prepare("DELETE FROM bf_tokens WHERE kind = 'invite' AND email = ? AND workspace_id = ?")->execute([$email, $workspace]);
        db()->prepare("INSERT INTO bf_tokens (token_hash, kind, email, workspace_id, role, expires_at) VALUES (?, 'invite', ?, ?, ?, ?)")->execute([hash('sha256', $token), $email, $workspace, $role, gmdate('Y-m-d H:i:s', time() + 172800)]);
        if (!studio_send_mail($email, 'Convite para o Bādon Forms', "Você recebeu um convite. Abra o link em até 48 horas para aceitar.\n\n" . $config['base_url'] . '/admin/studio/#token=' . $token)) { db()->prepare('DELETE FROM bf_tokens WHERE token_hash = ?')->execute([hash('sha256', $token)]); studio_error(502, 'O SMTP não entregou o convite. Confira a hospedagem e tente novamente.'); }
        studio_json(['ok' => true]);
    }
    if ($action === 'member-remove') {
        $id = (int)($in['id'] ?? 0);
        if (!$u['agency'] && $id === $u['id']) studio_error(422, 'Não é possível remover seu próprio acesso.');
        $q = db()->prepare('SELECT email FROM bf_users WHERE id = ?'); $q->execute([$id]); $email = $q->fetchColumn();
        db()->beginTransaction();
        db()->prepare('DELETE FROM bf_members WHERE workspace_id = ? AND user_id = ?')->execute([$workspace, $id]);
        db()->prepare("DELETE FROM bf_tokens WHERE kind = 'invite' AND workspace_id = ? AND email = ?")->execute([$workspace, $email]); db()->commit(); studio_json(['ok' => true]);
    }
    if ($action === 'form-create' || $action === 'duplicate') {
        if ($action === 'duplicate') { $source = studio_form($u, (int)($in['id'] ?? 0), 'edit'); $workspace = (int)$source['workspace_id']; $draft = json_decode($source['draft_json'], true); $draft['title'] = mb_substr($draft['title'], 0, 140) . ' (cópia)'; $draft['slug'] = rtrim(substr($draft['slug'], 0, 90), '-') . '-' . bin2hex(random_bytes(3)); }
        else $draft = ['title' => $in['title'] ?? '', 'slug' => $in['slug'] ?? '', 'description' => '', 'whatsapp_message' => '', 'definition' => ['fields' => [], 'completion' => default_ending()], 'settings' => ['tracking' => true]];
        $draft = studio_clean($draft);
        db()->beginTransaction();
        db()->prepare('INSERT INTO forms (title, slug, fields_json, whatsapp_message, active) VALUES (?, ?, ?, ?, 0)')->execute([$draft['title'], $draft['slug'], json_encode($draft['definition'], JSON_THROW_ON_ERROR), $draft['whatsapp_message']]); $id = (int)db()->lastInsertId();
        db()->prepare('INSERT INTO bf_forms (form_id, workspace_id, draft_json, published_settings) VALUES (?, ?, ?, ?)')->execute([$id, $workspace, json_encode($draft, JSON_THROW_ON_ERROR), '{}']); db()->commit(); studio_json(['id' => $id]);
    }
    $id = (int)($in['id'] ?? $_GET['id'] ?? 0);
    $level = in_array($action, ['save', 'publish', 'status'], true) ? 'edit' : 'read';
    if (in_array($action, ['save', 'publish', 'status'], true)) db()->beginTransaction();
    $f = studio_form($u, $id, $level, in_array($action, ['save', 'publish', 'status'], true));
    if ($action === 'form') studio_json(['form' => ['id' => (int)$f['id'], 'workspace_id' => (int)$f['workspace_id'], 'folder_id' => $f['folder_id'], 'draft' => json_decode($f['draft_json'], true), 'revision' => (int)$f['revision'], 'published_revision' => $f['published_revision'], 'published_at' => $f['published_at'], 'slug' => $f['slug'], 'active' => (bool)$f['active']]]);
    if ($action === 'save' || $action === 'publish') {
        if ((int)($in['revision'] ?? 0) !== (int)$f['revision']) throw new InvalidArgumentException('Outra pessoa alterou este formulário. Reabra antes de salvar; suas alterações não foram sobrescritas.');
        $draft = studio_clean($action === 'save' ? ($in['draft'] ?? []) : json_decode($f['draft_json'], true), $action === 'publish');
        if ($draft['settings']['webhook_url'] !== '' && !function_exists('curl_init')) throw new InvalidArgumentException('Ative a extensão cURL do PHP na hospedagem antes de configurar webhooks.');
        $folder = (int)($in['folder_id'] ?? $f['folder_id'] ?? 0);
        if ($folder) { $q = db()->prepare('SELECT id FROM bf_folders WHERE id = ? AND workspace_id = ?'); $q->execute([$folder, $f['workspace_id']]); if (!$q->fetchColumn()) throw new InvalidArgumentException('Pasta inválida para este espaço.'); }
        if ($action === 'save') db()->prepare('UPDATE bf_forms SET draft_json = ?, folder_id = ?, revision = revision + 1 WHERE form_id = ?')->execute([json_encode($draft, JSON_THROW_ON_ERROR), $folder ?: null, $id]);
        else {
            db()->prepare('UPDATE forms SET title = ?, slug = ?, fields_json = ?, whatsapp_message = ?, active = 1 WHERE id = ?')->execute([$draft['title'], $draft['slug'], json_encode($draft['definition'], JSON_THROW_ON_ERROR), $draft['whatsapp_message'], $id]);
            db()->prepare('UPDATE bf_forms SET published_settings = ?, published_revision = revision, published_at = ? WHERE form_id = ?')->execute([json_encode($draft['settings'], JSON_THROW_ON_ERROR), utc_now(), $id]);
        }
        db()->commit(); studio_json(['ok' => true, 'revision' => (int)$f['revision'] + ($action === 'save' ? 1 : 0)]);
    }
    if ($action === 'status') {
        if (!$f['published_at']) throw new InvalidArgumentException('Publique o formulário antes de ativá-lo.');
        db()->prepare('UPDATE forms SET active = ? WHERE id = ?')->execute([empty($in['active']) ? 0 : 1, $id]); db()->commit(); studio_json(['ok' => true]);
    }
    if ($action === 'leads') {
        $page = max(1, min(1000000, (int)($_GET['page'] ?? 1)));
        $q = db()->prepare('SELECT COUNT(*) FROM leads WHERE form_id = ?'); $q->execute([$id]); $count = (int)$q->fetchColumn();
        $q = db()->prepare('SELECT id, form_title, values_json, reply_email, consent_text, privacy_url, created_at, email_status FROM leads WHERE form_id = ? ORDER BY id DESC LIMIT 30 OFFSET ?'); $q->execute([$id, ($page - 1) * 30]);
        studio_json(['leads' => $q->fetchAll(), 'total' => $count, 'page' => $page]);
    }
    if ($action === 'export') { require BADON_APP . '/admin.php'; export_leads($id); }
    studio_error(404, 'Ação não encontrada.');
} catch (InvalidArgumentException $e) {
    if (db()->inTransaction()) db()->rollBack(); studio_error(422, $e->getMessage());
} catch (PDOException $e) {
    if (db()->inTransaction()) db()->rollBack();
    if ($e->getCode() === '23000') studio_error(422, 'Este nome, slug ou e-mail já está em uso. Confira os dados.');
    throw $e;
}
