<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (!is_string($path) || !preg_match('#^/f/([a-z0-9]+(?:-[a-z0-9]+)*)/?$#', $path, $match)) fail_page(404, 'Formulário não encontrado.');
$stmt = db()->prepare('SELECT * FROM forms WHERE slug = ? AND active = 1'); $stmt->execute([$match[1]]);
$form = $stmt->fetch();
if (!$form) fail_page(404, 'Este formulário não existe ou não está disponível.');
render_form($form);
