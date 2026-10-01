<?php
declare(strict_types=1);
// Em produção, a aplicação e as credenciais ficam fora do public_html.
$parent = dirname(__DIR__);
$bootstrap = is_file($parent . '/app/bootstrap.php')
    ? $parent . '/app/bootstrap.php'
    : $parent . '/badon-app/bootstrap.php';
if (!is_file($bootstrap)) {
    http_response_code(503);
    exit('Sistema de formulários em configuração. Tente novamente em breve.');
}
require $bootstrap;
