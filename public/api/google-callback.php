<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
require_once BADON_APP . '/google.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
try {
    $_SESSION['google_notice'] = ['message'=>flow_google_callback($_GET),'ok'=>true];
} catch (InvalidArgumentException $e) {
    $_SESSION['google_notice'] = ['message'=>$e->getMessage(),'ok'=>false];
} catch (Throwable $e) {
    log_incident($e,'google-callback');
    $_SESSION['google_notice'] = ['message'=>'Não foi possível confirmar o Google. Tente novamente. Seu acesso por e-mail continua disponível.','ok'=>false];
}
// Codes are never rendered or forwarded to the front end; application logs contain no query strings.
header('Location: ' . $config['base_url'] . (studio_user() ? '/painel?google=return' : '/entrar?google=return'),true,303);
exit;
