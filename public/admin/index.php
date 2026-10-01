<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
require BADON_APP . '/admin.php';
$action = text_value($_POST['action'] ?? '');
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    limit_body(); csrf_check();
    if ($action === 'login') {
        $email = strtolower(text_value($_POST['email'] ?? ''));
        $ipAllowed = rate_allowed('login-ip', client_identity(), 30, 900);
        $accountAllowed = rate_allowed('login-account', $email, 10, 900);
        if (!$ipAllowed || !$accountAllowed) fail_page(429, 'Muitas tentativas de acesso. Aguarde 15 minutos.');
        $stmt = db()->prepare('SELECT * FROM admins WHERE email = ?'); $stmt->execute([$email]); $admin = $stmt->fetch();
        $password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';
        $dummy = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        $valid = password_verify($password, $admin['password_hash'] ?? $dummy);
        if ($admin && $valid) {
            session_regenerate_id(true);
            if (password_needs_rehash($admin['password_hash'], PASSWORD_DEFAULT)) {
                $admin['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
                db()->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([$admin['password_hash'], $admin['id']]);
            }
            $_SESSION = ['admin_id' => (int)$admin['id'], 'auth_hash' => hash('sha256', $admin['password_hash']), 'last_active' => time(), 'login_at' => time(), 'csrf' => bin2hex(random_bytes(32))];
            redirect('/admin/');
        }
        http_response_code(401); $error = 'E-mail ou senha incorretos.';
    } else {
        require_admin();
        if ($action === 'logout') {
            $_SESSION = []; session_destroy();
            setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $config['environment'] === 'production', 'httponly' => true, 'samesite' => 'Lax']);
            redirect('/admin/');
        }
        if ($action === 'export') export_leads((int)($_POST['form_id'] ?? 0));
        if ($action === 'retry-mail') {
            if (!rate_allowed('mail-retry', (string)$_SESSION['admin_id'], 30, 3600)) fail_page(429, 'Aguarde antes de reenviar mais notificações.');
            require BADON_APP . '/mail.php';
            $id = (int)($_POST['id'] ?? 0);
            $_SESSION['flash'] = notify_lead($id) ? 'Notificação enviada.' : 'Não foi possível reenviar. Confira o status e as configurações SMTP.';
            redirect('/admin/?view=lead&id=' . $id);
        }
        if ($action === 'delete-lead') {
            if (($_POST['confirm'] ?? '') !== 'EXCLUIR') fail_page(422, 'Digite EXCLUIR para confirmar a remoção do lead.');
            db()->prepare('DELETE FROM leads WHERE id = ?')->execute([(int)($_POST['id'] ?? 0)]);
            $_SESSION['flash'] = 'Lead excluído do banco. Cópias exportadas e e-mails devem ser removidos separadamente.';
            redirect('/admin/?view=leads');
        }
        if ($action === 'save-form') {
            try {
                $id = save_form($_POST);
                $_SESSION['flash'] = 'Formulário salvo. Copie o link para compartilhar.';
                redirect('/admin/?view=form&id=' . $id);
            } catch (InvalidArgumentException $e) {
                http_response_code(422); $error = $e->getMessage();
            }
        } elseif (!in_array($action, ['logout', 'export', 'retry-mail', 'delete-lead'], true)) {
            fail_page(400, 'Ação inválida.');
        }
    }
}

if (!authenticated()) {
    page_start('Acesso ao painel');
    echo '<section class="panel"><p class="eyebrow">Área reservada</p><h1>Formulários & leads</h1>';
    if ($error) alert_box($error);
    echo '<form action="/admin/" method="post">' . csrf_input() . '<input type="hidden" name="action" value="login"><div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" maxlength="190" required autocomplete="username"></div><div class="field"><label for="password">Senha</label><input id="password" name="password" type="password" required autocomplete="current-password" maxlength="200"></div><button class="button">Entrar</button></form></section>';
    page_end(); exit;
}

$view = $action === 'save-form' && $error ? 'form' : text_value($_GET['view'] ?? 'forms');
page_start('Painel de formulários', true);
if (!empty($_SESSION['flash'])) { alert_box($_SESSION['flash'], 'success'); unset($_SESSION['flash']); }
if ($error) alert_box($error);
if ($view === 'form') {
    $id = (int)($error ? ($_POST['id'] ?? 0) : ($_GET['id'] ?? 0));
    $form = $id ? get_form($id) : null;
    if ($id && !$form) { echo '<p>Formulário não encontrado.</p>'; page_end(); exit; }
    $version = $error ? text_value($_POST['version'] ?? '') : ($form ? form_version($form) : '');
    if ($error) {
        $form = array_merge($form ?? [], ['id' => $id, 'title' => text_value($_POST['title'] ?? ''), 'slug' => text_value($_POST['slug'] ?? ''), 'whatsapp_message' => text_value($_POST['whatsapp_message'] ?? ''), 'active' => !empty($_POST['active'])]);
        $fields = is_array($_POST['fields'] ?? null) ? array_slice($_POST['fields'], 0, 30) : [];
    } else {
        $fields = $form ? json_decode($form['fields_json'], true, 512, JSON_THROW_ON_ERROR) : [
            ['key' => 'nome', 'label' => 'Nome', 'type' => 'text', 'required' => true, 'options' => []],
            ['key' => 'email', 'label' => 'E-mail', 'type' => 'email', 'required' => true, 'options' => []],
            ['key' => 'telefone', 'label' => 'Telefone', 'type' => 'tel', 'required' => false, 'options' => []],
        ];
    }
    echo '<section class="panel"><h1>' . ($id ? 'Editar formulário' : 'Novo formulário') . '</h1>';
    if ($id) echo '<p>Link público: <a href="/f/' . h($form['slug']) . '" target="_blank" rel="noopener">' . h($config['base_url']) . '/f/' . h($form['slug']) . '</a></p>';
    echo '<form action="/admin/" method="post" id="form-editor">' . csrf_input() . '<input type="hidden" name="action" value="save-form"><input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="version" value="' . h($version) . '"><div class="two-columns"><div class="field"><label for="title">Título</label><input id="title" name="title" maxlength="150" required value="' . h($form['title'] ?? '') . '"></div><div class="field"><label for="slug">Slug do link</label><input id="slug" name="slug" maxlength="100" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="trafego-negocios-locais" value="' . h($form['slug'] ?? '') . '"><small>Use letras minúsculas, números e hífens. Alterar o slug muda o link.</small></div></div><label class="check"><input name="active" type="checkbox" value="1"' . (!$form || !empty($form['active']) ? ' checked' : '') . '>Publicado (desmarque para pausar novos envios)</label><h2>Campos</h2><p class="muted">Adicione até 30 campos. Inclua um e-mail para poder responder ao lead diretamente. Identificadores são internos: mantenha-os estáveis.</p><div id="fields">';
    foreach (array_values($fields) as $index => $field) if (is_array($field)) render_field_editor((string)$index, $field);
    echo '</div><button class="button secondary" type="button" id="add-field">Adicionar campo</button><div class="field"><label for="whatsapp-message">Mensagem de WhatsApp (opcional)</label><textarea id="whatsapp-message" name="whatsapp_message" maxlength="2000" rows="3">' . h($form['whatsapp_message'] ?? '') . '</textarea><small>Sem mensagem, será usado: “Oi, acabei de preencher o formulário {título}”. O botão só aparece após o envio.</small></div><button class="button">Salvar formulário</button></form><template id="field-template">';
    render_field_editor('__INDEX__', ['key' => '', 'label' => '', 'type' => 'text', 'required' => false, 'options' => []]);
    echo '</template><script src="/forms-assets/admin.js" defer></script></section>';
} elseif ($view === 'leads') {
    render_leads();
} elseif ($view === 'lead') {
    render_lead((int)($_GET['id'] ?? 0));
} else {
    $forms = db()->query('SELECT f.*, (SELECT COUNT(*) FROM leads l WHERE l.form_id = f.id) AS lead_count FROM forms f ORDER BY f.id DESC')->fetchAll();
    echo '<div class="heading"><h1>Formulários</h1><a class="button" href="/admin/?view=form">Novo formulário</a></div><section class="panel">';
    if (!$forms) echo '<p>Crie seu primeiro formulário para começar a receber contatos.</p>';
    foreach ($forms as $form) {
        echo '<article class="form-card"><div><h2>' . h($form['title']) . '</h2><p>' . ((int)$form['active'] ? 'Publicado' : 'Pausado') . ' · ' . (int)$form['lead_count'] . ' leads</p><a href="/f/' . h($form['slug']) . '">/f/' . h($form['slug']) . '</a></div><div class="actions"><a href="/admin/?view=form&id=' . (int)$form['id'] . '">Editar</a><a href="/admin/?view=leads&form_id=' . (int)$form['id'] . '">Ver leads</a></div></article>';
    }
    echo '</section>';
}
page_end();
