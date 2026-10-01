<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
post_only(); limit_body(); csrf_check();
if (!rate_allowed('submit', client_identity(), 20, 3600)) fail_page(429, 'Muitos envios. Aguarde uma hora e tente novamente.');
if (!is_string($_POST['website_url'] ?? '') || trim($_POST['website_url'] ?? '') !== '') fail_page(400, 'Não foi possível processar este envio.');
$nonce = text_value($_POST['submission'] ?? '');
$ticket = $_SESSION['tickets'][$nonce] ?? null;
$id = filter_var($_POST['form_id'] ?? null, FILTER_VALIDATE_INT);
if (!$ticket || $ticket['time'] < time() - 3600 || $ticket['form_id'] !== $id) fail_page(400, 'Formulário expirado. Abra o link do formulário novamente.');
if (isset($ticket['receipt'])) redirect('/f/confirmacao.php?r=' . $ticket['receipt']);
if (isset($ticket['settings']) && time() - $ticket['time'] < (int)($ticket['settings']['minimum_seconds'] ?? 3)) fail_page(429, 'Aguarde alguns segundos antes de enviar.');
$form = get_form($id);
if (!$form || !(int)$form['active']) fail_page(404, 'Formulário indisponível.');
if (!hash_equals($ticket['schema'], hash('sha256', $form['fields_json'])) || $ticket['title'] !== $form['title']) fail_page(409, 'O formulário foi atualizado. Abra o link novamente para preencher a versão atual.');
$input = $_POST['fields'] ?? [];
if (!is_array($input)) fail_page(422, 'Campos inválidos.');
$definition = form_definition($form['fields_json']);
[$values, $errors, $email, $outcome] = validate_flow($definition, $input);
if (($_POST['consent'] ?? '') !== '1') $errors['consent'] = 'É necessário aceitar o tratamento dos dados para enviar.';
if ($errors) { http_response_code(422); render_form($form, $input, $errors, $nonce); exit; }
$values[] = outcome_value($outcome);
$values = array_merge($values, $ticket['tracking'] ?? []);
if (isset($ticket['settings'])) $values[] = ['key' => '_duration_seconds', 'label' => 'Tempo de preenchimento (segundos)', 'value' => (string)(time() - $ticket['time'])];
$submissionHash = hash('sha256', $nonce);
try {
    db()->beginTransaction();
    $stmt = db()->prepare('INSERT INTO leads (form_id, form_title, values_json, reply_email, consent_text, consent_accepted, privacy_url, created_at, submission_hash) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)');
    $stmt->execute([$id, $form['title'], json_encode($values, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), $email, $ticket['consent'], $ticket['privacy_url'], utc_now(), $submissionHash]);
    $leadId = (int)db()->lastInsertId();
    if (isset($ticket['settings'])) db()->prepare('INSERT INTO bf_deliveries (lead_id, settings_json) VALUES (?, ?)')->execute([$leadId, json_encode($ticket['settings'], JSON_THROW_ON_ERROR)]);
    db()->commit();
} catch (PDOException $e) {
    if (db()->inTransaction()) db()->rollBack();
    if ($e->getCode() !== '23000') throw $e;
    $stmt = db()->prepare('SELECT id FROM leads WHERE submission_hash = ?'); $stmt->execute([$submissionHash]);
    $leadId = (int)$stmt->fetchColumn();
    if (!$leadId) throw $e;
}
$receipt = bin2hex(random_bytes(24));
$_SESSION['tickets'][$nonce]['receipt'] = $receipt;
// Não colocar respostas nem ID do lead na URL pública.
$_SESSION['receipts'][$receipt] = ['title' => $form['title'], 'message' => $form['whatsapp_message'], 'ending' => $outcome['ending'], 'time' => time()];
require_once BADON_APP . '/studio-public.php';
$_SESSION['receipts'][$receipt]['message'] = studio_interpolate($form['whatsapp_message'], $values);
foreach (['title', 'message'] as $key) $_SESSION['receipts'][$receipt]['ending'][$key] = studio_interpolate($outcome['ending'][$key], $values);
foreach ($_SESSION['receipts'] as $key => $value) if ($value['time'] < time() - 3600) unset($_SESSION['receipts'][$key]);
if (count($_SESSION['receipts']) > 20) array_shift($_SESSION['receipts']);
session_write_close();
require BADON_APP . '/mail.php';
notify_lead($leadId);
if (isset($ticket['settings'])) studio_webhook($leadId);
redirect('/f/confirmacao.php?r=' . $receipt);
