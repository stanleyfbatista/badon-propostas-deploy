<?php
declare(strict_types=1);

function form_version(array $form): string
{
    return hash('sha256', implode('|', [$form['updated_at'] ?? '', $form['fields_json'] ?? '', $form['title'] ?? '', $form['slug'] ?? '', $form['whatsapp_message'] ?? '', (string)($form['active'] ?? '')]));
}
function save_form(array $input): int
{
    $title = text_value($input['title'] ?? ''); $slug = text_value($input['slug'] ?? '');
    $message = text_value($input['whatsapp_message'] ?? '');
    if ($title === '' || mb_strlen($title) > 150 || preg_match('/[\x00-\x1F]/u', $title)) throw new InvalidArgumentException('Título inválido: use até 150 caracteres, sem quebras de linha.');
    if (strlen($slug) > 100 || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) throw new InvalidArgumentException('Slug inválido. Use letras minúsculas, números e hífens.');
    if (mb_strlen($message) > 2000) throw new InvalidArgumentException('A mensagem de WhatsApp pode ter até 2.000 caracteres.');
    $fields = clean_fields(is_array($input['fields'] ?? null) ? $input['fields'] : []);
    $json = json_encode($fields, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $id = (int)($input['id'] ?? 0); $active = empty($input['active']) ? 0 : 1;
    db()->beginTransaction();
    try {
        if ($id) {
            $stmt = db()->prepare('SELECT * FROM forms WHERE id = ? FOR UPDATE'); $stmt->execute([$id]); $old = $stmt->fetch();
            if (!$old || !hash_equals(form_version($old), text_value($input['version'] ?? ''))) throw new InvalidArgumentException('Este formulário mudou em outra janela. Reabra a página antes de salvar.');
            db()->prepare('UPDATE forms SET title = ?, slug = ?, fields_json = ?, whatsapp_message = ?, active = ? WHERE id = ?')->execute([$title, $slug, $json, $message, $active, $id]);
        } else {
            db()->prepare('INSERT INTO forms (title, slug, fields_json, whatsapp_message, active) VALUES (?, ?, ?, ?, ?)')->execute([$title, $slug, $json, $message, $active]);
            $id = (int)db()->lastInsertId();
        }
        db()->commit();
        return $id;
    } catch (Throwable $e) {
        db()->rollBack();
        if ($e instanceof PDOException && $e->getCode() === '23000') throw new InvalidArgumentException('Este slug já está em uso. Escolha outro.');
        throw $e;
    }
}

function render_field_editor(string $index, array $field): void
{
    $name = 'fields[' . $index . ']';
    $options = $field['options'] ?? [];
    $options = is_array($options) ? implode("\n", array_filter($options, 'is_string')) : text_value($options);
    echo '<fieldset class="field-editor"><legend>Campo</legend><div class="two-columns"><label>Título do campo<input name="' . $name . '[label]" value="' . h(text_value($field['label'] ?? '')) . '" maxlength="100" required></label><label>Identificador<input name="' . $name . '[key]" value="' . h(text_value($field['key'] ?? '')) . '" maxlength="40" pattern="[a-z][a-z0-9_]*" required placeholder="nome_do_campo"></label><label>Tipo<select name="' . $name . '[type]">';
    foreach (['text' => 'Texto', 'email' => 'E-mail', 'tel' => 'Telefone', 'select' => 'Seleção', 'textarea' => 'Texto longo'] as $type => $label) {
        echo '<option value="' . $type . '"' . (($field['type'] ?? '') === $type ? ' selected' : '') . '>' . $label . '</option>';
    }
    echo '</select></label><label>Opções (para seleção, uma por linha)<textarea name="' . $name . '[options]" rows="3" maxlength="8000">' . h($options) . '</textarea></label></div><div class="heading"><label class="check"><input type="checkbox" name="' . $name . '[required]" value="1"' . (!empty($field['required']) ? ' checked' : '') . '>Obrigatório</label><div class="actions"><button type="button" class="text-button" data-move="up">Subir</button><button type="button" class="text-button" data-move="down">Descer</button><button type="button" class="text-button danger" data-remove>Remover campo</button></div></div></fieldset>';
}

function leads_filter(int $formId): array
{
    return $formId > 0 ? [' WHERE form_id = ?', [$formId]] : ['', []];
}
function export_leads(int $formId): void
{
    [$where, $params] = leads_filter($formId);
    $stmt = db()->prepare('SELECT * FROM leads' . $where . ' ORDER BY id DESC'); $stmt->execute($params);
    header('Content-Type: text/csv; charset=UTF-8');
    header('Content-Disposition: attachment; filename="leads-' . gmdate('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'wb'); fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, ['ID', 'Formulário', 'Data e hora', 'Fuso horário', 'E-mail', 'Respostas', 'Consentimento aceito', 'Texto do consentimento', 'Política', 'Notificação'], ';', '"', '');
    global $config;
    while ($lead = $stmt->fetch()) {
        $answers = [];
        foreach (json_decode($lead['values_json'], true, 512, JSON_THROW_ON_ERROR) as $field) $answers[] = $field['label'] . ': ' . $field['value'];
        $row = [(string)$lead['id'], $lead['form_title'], local_date($lead['created_at']), $config['timezone'], $lead['reply_email'] ?? '', implode("\n", $answers), 'Sim', $lead['consent_text'], $lead['privacy_url'], $lead['email_status']];
        fputcsv($out, array_map('csv_safe', $row), ';', '"', '');
    }
    fclose($out); exit;
}
function render_leads(): void
{
    $filter = max(0, (int)($_GET['form_id'] ?? 0));
    $page = max(1, min(1000000, (int)($_GET['page'] ?? 1))); $offset = ($page - 1) * 30;
    [$where, $params] = leads_filter($filter);
    $count = db()->prepare('SELECT COUNT(*) FROM leads' . $where); $count->execute($params); $total = (int)$count->fetchColumn();
    $stmt = db()->prepare('SELECT id, form_title, reply_email, created_at, email_status FROM leads' . $where . ' ORDER BY id DESC LIMIT 30 OFFSET ?');
    foreach ($params as $index => $param) $stmt->bindValue($index + 1, $param, PDO::PARAM_INT);
    $stmt->bindValue(count($params) + 1, $offset, PDO::PARAM_INT); $stmt->execute();
    $forms = db()->query('SELECT id, title FROM forms ORDER BY title')->fetchAll();
    echo '<h1>Leads</h1><section class="panel"><div class="heading"><form method="get" action="/admin/" class="filter"><input type="hidden" name="view" value="leads"><label>Formulário<select name="form_id"><option value="0">Todos</option>';
    foreach ($forms as $form) echo '<option value="' . (int)$form['id'] . '"' . ($filter === (int)$form['id'] ? ' selected' : '') . '>' . h($form['title']) . '</option>';
    echo '</select></label><button class="button secondary">Filtrar</button></form><form method="post" action="/admin/">' . csrf_input() . '<input type="hidden" name="action" value="export"><input type="hidden" name="form_id" value="' . $filter . '"><button class="button secondary">Exportar CSV</button></form></div><p>' . $total . ' contatos · horários em America/Sao_Paulo (ou fuso configurado).</p><div class="table-wrap"><table><thead><tr><th>Formulário</th><th>E-mail</th><th>Recebido</th><th>E-mail ao administrador</th><th>Detalhes</th></tr></thead><tbody>';
    foreach ($stmt as $lead) echo '<tr><td>' . h($lead['form_title']) . '</td><td>' . h($lead['reply_email'] ?? 'Não informado') . '</td><td>' . h(local_date($lead['created_at'])) . '</td><td>' . h(mail_label($lead['email_status'])) . '</td><td><a href="/admin/?view=lead&id=' . (int)$lead['id'] . '">Abrir #' . (int)$lead['id'] . '</a></td></tr>';
    echo '</tbody></table></div><nav class="pagination" aria-label="Paginação">';
    if ($page > 1) echo '<a href="/admin/?view=leads&form_id=' . $filter . '&page=' . ($page - 1) . '">Anterior</a>';
    if ($page * 30 < $total) echo '<a href="/admin/?view=leads&form_id=' . $filter . '&page=' . ($page + 1) . '">Próxima</a>';
    echo '</nav></section>';
}
function mail_label(string $status): string
{
    return ['sent' => 'Enviado', 'failed' => 'Falha — lead salvo', 'pending' => 'Pendente', 'sending' => 'Em envio'][$status] ?? $status;
}
function render_lead(int $id): void
{
    $stmt = db()->prepare('SELECT * FROM leads WHERE id = ?'); $stmt->execute([$id]); $lead = $stmt->fetch();
    if (!$lead) { echo '<p>Lead não encontrado.</p>'; return; }
    echo '<section class="panel"><p><a href="/admin/?view=leads">← Leads</a></p><h1>' . h($lead['form_title']) . '</h1><p>Recebido em ' . h(local_date($lead['created_at'])) . '</p><dl>';
    foreach (json_decode($lead['values_json'], true, 512, JSON_THROW_ON_ERROR) as $field) echo '<dt>' . h($field['label']) . '</dt><dd>' . nl2br(h($field['value'] !== '' ? $field['value'] : 'Não informado')) . '</dd>';
    echo '<dt>Consentimento aceito</dt><dd>' . h($lead['consent_text']) . '</dd><dt>Política apresentada</dt><dd>' . h($lead['privacy_url']) . '</dd></dl><h2>Notificação por e-mail</h2><p>' . h(mail_label($lead['email_status'])) . ' · ' . (int)$lead['email_attempts'] . ' tentativa(s).</p>';
    if ($lead['email_status'] !== 'sent') echo '<form method="post" action="/admin/">' . csrf_input() . '<input type="hidden" name="action" value="retry-mail"><input type="hidden" name="id" value="' . $id . '"><button class="button secondary">Reenviar notificação</button></form>';
    echo '<details class="deletion"><summary>Excluir dados deste lead</summary><p>Exclusão definitiva do banco, útil para atender pedidos de remoção. E-mails, backups e CSVs precisam ser tratados separadamente.</p><form method="post" action="/admin/">' . csrf_input() . '<input type="hidden" name="action" value="delete-lead"><input type="hidden" name="id" value="' . $id . '"><label>Digite EXCLUIR<input name="confirm" required pattern="EXCLUIR" autocomplete="off"></label><button class="button danger">Excluir lead definitivamente</button></form></details></section>';
}
