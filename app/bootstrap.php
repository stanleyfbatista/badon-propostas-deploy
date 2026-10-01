<?php
declare(strict_types=1);
define('BADON_APP', __DIR__);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
require_once __DIR__ . '/domain.php';
require_once __DIR__ . '/web.php';

set_exception_handler(function (Throwable $error): void {
    // Não registrar senhas, dados do lead, consultas ou mensagens do SMTP.
    $reference = bin2hex(random_bytes(6));
    error_log('Badon incident ' . $reference . ': ' . get_class($error));
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, "Operação interrompida. Confira a configuração. Referência: $reference\n");
        exit(1);
    }
    http_response_code(503);
    echo '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Temporariamente indisponível</title><h1>Não foi possível concluir agora.</h1><p>Tente novamente em alguns instantes.</p><p>Referência: ' . $reference . '</p></html>';
});

$configPath = dirname(__DIR__) . '/badon-config/config.php';
if (!is_file($configPath)) {
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, "Crie o arquivo privado badon-config/config.php antes de continuar.\n");
        exit(1);
    }
    http_response_code(503);
    exit('Sistema de formulários em configuração. Tente novamente em breve.');
}
$config = require $configPath;
validate_config($config);
date_default_timezone_set($config['timezone']);

function db(): PDO
{
    static $pdo;
    global $config;
    if (!$pdo) {
        $d = $config['db'];
        $pdo = new PDO('mysql:host=' . $d['host'] . ';port=' . (int)$d['port'] . ';dbname=' . $d['name'] . ';charset=utf8mb4', $d['user'], $d['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}

if (PHP_SAPI !== 'cli') {
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    if ($config['environment'] === 'production' && !$secure) {
        // Não confiar em Host ou X-Forwarded-Proto enviados pelo visitante.
        header('Location: ' . $config['base_url'] . ($_SERVER['REQUEST_URI'] ?? '/admin/'), true, 308);
        exit;
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', '28800');
    session_name('badon_forms_session');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $config['environment'] === 'production', 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
    if (!isset($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}
