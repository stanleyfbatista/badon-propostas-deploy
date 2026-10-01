<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
require_once BADON_APP . '/studio.php';
header('Content-Type: application/json; charset=utf-8');
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) studio_error(405, 'Método não permitido.');
if (!studio_ready()) studio_error(503, 'Inicialize o painel de formulários antes de enviar mídia.');
$user = studio_user();
if (!$user) studio_error(401, 'Entre no painel para enviar mídia.');
$workspace = (int)($_GET['workspace'] ?? 0);
studio_access($user, $workspace, $method === 'POST' ? 'edit' : 'read');
if (!class_exists('finfo') || !filter_var(ini_get('file_uploads'), FILTER_VALIDATE_BOOLEAN)) studio_error(503, 'Ative file_uploads e a extensão Fileinfo do PHP na hospedagem para enviar arquivos.');
$limits = media_limits();
if ($method === 'GET') studio_json(['limits' => $limits]);
if (!is_string($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null) || !hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'])) studio_error(403, 'Sessão expirada. Atualize a página.');
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $limits['video'] + 65536) studio_error(413, 'O arquivo excede o limite da hospedagem. Reduza-o ou ajuste upload_max_filesize e post_max_size no cPanel.');
if (!rate_allowed('media-upload', ($user['agency'] ? 'a' : 'u') . $user['id'], 30, 3600)) studio_error(429, 'Limite de uploads atingido nesta hora. Aguarde para tentar novamente.');
try {
    if (!is_array($_FILES['file'] ?? null) || count($_FILES) !== 1) throw new InvalidArgumentException('Selecione um arquivo para enviar.');
    studio_json(['media' => store_media_upload($_FILES['file'], $workspace), 'limits' => $limits], 201);
} catch (InvalidArgumentException $error) { studio_error(422, $error->getMessage()); }
catch (RuntimeException $error) { studio_error(503, 'Não foi possível guardar o arquivo. Confira as permissões de forms-media/uploads e o espaço em disco da hospedagem.'); }
