<?php
// Somente servidor local de testes. Não é copiado para public_html.
if (getenv('BADON_TEST_HTTPS') === '1') $_SERVER['HTTPS'] = 'on';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = $_SERVER['DOCUMENT_ROOT'];
if (is_file($root . $path)) return false;
if ($path === '/admin/' || $path === '/admin') { require $root . '/admin/index.php'; return true; }
if ($path === '/privacidade/' || $path === '/privacidade') { require $root . '/privacidade/index.php'; return true; }
if (preg_match('#^/f/[a-z0-9]+(?:-[a-z0-9]+)*/?$#', $path)) { require $root . '/f/index.php'; return true; }
return false;
