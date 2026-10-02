<?php
declare(strict_types=1);

function h($value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function utc_now(): string { return gmdate('Y-m-d H:i:s'); }
function local_date(string $utc): string
{
    global $config;
    return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone($config['timezone']))->format('d/m/Y H:i:s');
}
function redirect(string $path): void { header('Location: ' . $path, true, 303); exit; }
function csrf_input(): string { return '<input type="hidden" name="csrf" value="' . h($_SESSION['csrf']) . '">'; }
function csrf_check(): void
{
    $token = $_POST['csrf'] ?? null;
    if (!is_string($token) || !hash_equals($_SESSION['csrf'] ?? '', $token)) {
        fail_page(403, 'Sua sessão expirou. Volte à página, atualize e tente novamente.');
    }
}
function post_only(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST'); fail_page(405, 'Este endereço aceita apenas envio de formulário.');
    }
}
function limit_body(): void
{
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 200000) fail_page(413, 'O envio excede o tamanho permitido.');
}
function page_start(string $title, bool $admin = false): void
{
    echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . h($title) . ' · Bādon Forms</title><link rel="icon" href="/maintenance-assets/favicon.svg"><link rel="stylesheet" href="/forms-assets/forms.css?v=2"><link rel="stylesheet" href="/forms-assets/flow.css?v=3"><link rel="stylesheet" href="/forms-assets/welcome.css?v=1"></head><body><main class="' . ($admin ? 'admin-shell' : 'shell') . '"><header class="top"><a class="brand" href="' . ($admin ? '/admin/' : '/') . '">Bādon<span>.</span><small class="brand-product">Forms</small></a>';
    if ($admin && !empty($_SESSION['admin_id'])) {
        echo '<nav aria-label="Painel"><a href="/admin/">Formulários</a><a href="/admin/?view=leads">Leads</a><form action="/admin/" method="post">' . csrf_input() . '<input type="hidden" name="action" value="logout"><button class="text-button">Sair</button></form></nav>';
    }
    echo '</header>' . ($GLOBALS['studio_theme_css'] ?? '');
}
function page_end(): void { echo '<footer>Produtora Bādon · <a href="/privacidade/">Privacidade</a></footer></main></body></html>'; }
function fail_page(int $status, string $message): void
{
    http_response_code($status); page_start('Não foi possível continuar');
    echo '<section class="panel"><h1>Vamos tentar novamente?</h1><p>' . h($message) . '</p><a href="/">Voltar ao site</a></section>';
    page_end(); exit;
}
function alert_box(string $message, string $type = 'error'): void
{
    echo '<div class="notice ' . ($type === 'success' ? 'success' : '') . '" role="alert">' . h($message) . '</div>';
}
function authenticated(): bool
{
    if (empty($_SESSION['admin_id'])) return false;
    $stmt = db()->prepare('SELECT password_hash FROM admins WHERE id = ?');
    $stmt->execute([$_SESSION['admin_id']]);
    $hash = $stmt->fetchColumn();
    if (!$hash || !hash_equals(hash('sha256', $hash), $_SESSION['auth_hash'] ?? '') || time() - ($_SESSION['last_active'] ?? 0) > 1800 || time() - ($_SESSION['login_at'] ?? 0) > 28800) {
        unset($_SESSION['admin_id'], $_SESSION['auth_hash'], $_SESSION['last_active'], $_SESSION['login_at']);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        return false;
    }
    $_SESSION['last_active'] = time();
    return true;
}
function require_admin(): void { if (!authenticated()) redirect('/admin/'); }
function rate_allowed(string $scope, string $identity, int $max, int $seconds): bool
{
    global $config;
    $bucket = hash_hmac('sha256', $scope . ':' . $identity, $config['app_key']);
    $window = intdiv(time(), $seconds) * $seconds;
    $sql = 'INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE hits = IF(window_start = VALUES(window_start), hits + 1, 1), window_start = VALUES(window_start)';
    db()->prepare($sql)->execute([$bucket, $window]);
    $stmt = db()->prepare('SELECT hits FROM rate_limits WHERE bucket = ?'); $stmt->execute([$bucket]);
    return (int)$stmt->fetchColumn() <= $max;
}
function client_identity(): string { return $_SERVER['REMOTE_ADDR'] ?? 'unknown'; }
function get_form(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM forms WHERE id = ?'); $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}
function submission_ticket(array $form): string
{
    global $config;
    // Tokens ficam apenas na sessão, limitados e com validade de uma hora.
    foreach (($_SESSION['tickets'] ?? []) as $key => $ticket) {
        if ($ticket['time'] < time() - 3600) unset($_SESSION['tickets'][$key]);
    }
    if (count($_SESSION['tickets'] ?? []) >= 20) array_shift($_SESSION['tickets']);
    $nonce = bin2hex(random_bytes(32));
    $_SESSION['tickets'][$nonce] = ['form_id' => (int)$form['id'], 'time' => time(), 'schema' => hash('sha256', $form['fields_json']), 'title' => $form['title'], 'consent' => consent_text($form['title']), 'privacy_url' => $config['privacy_url']];
    require_once __DIR__ . '/studio-public.php';
    $settings = studio_settings((int)$form['id']);
    if ($settings !== null) $_SESSION['tickets'][$nonce] += ['settings' => $settings, 'tracking' => studio_tracking($settings)];
    return $nonce;
}
function render_form(array $form, array $old = [], array $errors = [], ?string $nonce = null): void
{
    global $config;
    $definition = form_definition($form['fields_json']);
    $fields = $definition['fields'];
    $nonce = $nonce ?? submission_ticket($form);
    require_once __DIR__ . '/studio-public.php';
    studio_theme($definition['theme'] ?? []);
    // Sempre iniciar pela capa, sem alterar o JSON publicado ou os tickets.
    $definition['welcome'] = clean_welcome($definition['welcome'] ?? []);
    page_start($form['title']);
    echo '<section class="panel public-flow"><div class="flow-introduction"><p class="eyebrow">Vamos conversar</p><h1>' . h($form['title']) . '</h1><p class="muted">Responda no seu ritmo. As perguntas com * são obrigatórias. Seus dados só serão enviados ao confirmar no final.</p></div>';
    if ($errors) alert_box('Confira os campos destacados e confirme seu consentimento para enviar.');
    echo '<form action="/api/enviar.php" method="post" id="public-flow" data-definition="' . h(json_encode($definition, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)) . '">' . csrf_input() . '<input type="hidden" name="form_id" value="' . (int)$form['id'] . '"><input type="hidden" name="submission" value="' . h($nonce) . '"><p id="flow-progress" class="eyebrow" aria-live="polite" hidden></p><noscript><p>Sem JavaScript, todas as perguntas aparecem juntas. Responda às que se aplicam; o servidor verificará o caminho e desconsiderará as perguntas puladas.</p></noscript>';
    foreach ($fields as $field) {
        $key = $field['key']; $id = 'field-' . $key; $value = text_value($old[$key] ?? '');
        $attrs = ' id="' . h($id) . '" name="fields[' . h($key) . ']" data-answer="' . h($key) . '"' . (isset($errors[$key]) ? ' aria-invalid="true" aria-describedby="error-' . h($key) . '"' : '');
        echo '<div class="field flow-question" data-question="' . h($key) . '"><label for="' . h($id) . '">' . h($field['label']) . ($field['required'] ? ' <span aria-hidden="true">*</span>' : '') . '</label>';
        if (in_array($field['type'], ['select', 'single', 'yesno', 'multiple'], true)) {
            if ($field['type'] === 'multiple') $attrs = str_replace('name="fields[' . h($key) . ']"', 'name="fields[' . h($key) . '][]"', $attrs);
            echo '<select' . $attrs . ($field['type'] === 'multiple' ? ' multiple size="' . min(6, count($field['options'])) . '"' : '') . '>' . ($field['type'] === 'multiple' ? '' : '<option value="">Selecione</option>');
            foreach ($field['options'] as $option) echo '<option value="' . h($option) . '"' . (($field['type'] === 'multiple' ? in_array($option, is_array($old[$key] ?? null) ? $old[$key] : [], true) : $value === $option) ? ' selected' : '') . '>' . h($option) . '</option>';
            echo '</select>';
        } elseif (in_array($field['type'], ['textarea', 'address'], true)) {
            echo '<textarea' . $attrs . ' rows="5" maxlength="5000">' . h($value) . '</textarea>';
        } else {
            $auto = $field['type'] === 'email' ? 'email' : ($field['type'] === 'tel' ? 'tel' : 'off');
            echo '<input' . $attrs . ' type="' . h(in_array($field['type'], ['number', 'name'], true) ? 'text' : $field['type']) . '"' . ($field['type'] === 'number' ? ' inputmode="decimal"' : '') . ' autocomplete="' . $auto . '" maxlength="' . ($field['type'] === 'email' ? '254' : '250') . '" value="' . h($value) . '">';
            if ($field['type'] === 'number') echo '<small>Digite somente o número, sem R$ e sem separador de milhar. Ex.: 1500 ou 1500,50.</small>';
        }
        if (isset($errors[$key])) echo '<small class="error-text" id="error-' . h($key) . '">' . h($errors[$key]) . '</small>';
        echo '</div>';
    }
    echo '<div class="honeypot" aria-hidden="true"><label for="website-url">Deixe vazio</label><input id="website-url" name="website_url" type="text" tabindex="-1" autocomplete="off"></div>';
    // Nunca marcado automaticamente, nem ao reapresentar erros.
    echo '<section id="flow-review"><h2>Confirmar envio</h2><div id="flow-summary" hidden></div><label class="check"><input type="checkbox" name="consent" value="1" required><span>' . h($_SESSION['tickets'][$nonce]['consent']) . ' <a href="' . h($_SESSION['tickets'][$nonce]['privacy_url']) . '" target="_blank" rel="noopener">Ler Política de Privacidade</a></span></label>';
    if (isset($errors['consent'])) echo '<p class="error-text">' . h($errors['consent']) . '</p>';
    echo '<button class="button" type="submit" id="flow-submit">Confirmar e enviar</button></section><div class="actions flow-navigation" id="flow-navigation" hidden><button class="button secondary" type="button" id="flow-back">Voltar</button><button class="button" type="button" id="flow-next">Continuar →</button></div></form><script src="/forms-assets/flow-engine.js?v=3" defer></script><script src="/forms-assets/public-flow.js?v=5" defer></script></section>';
    page_end();
}
