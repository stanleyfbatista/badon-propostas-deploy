<?php
require __DIR__ . '/../app/routes.php';
$active = ['environment' => 'production', 'base_url' => 'https://forms.produtorabadon.com'];
$old = ['environment' => 'production', 'base_url' => 'https://produtorabadon.com'];
$checks = 0;
function check_route(array $config, string $method, string $host, string $uri, ?string $expected): void {
    global $checks;
    $actual = forms_navigation_redirect($config, ['REQUEST_METHOD' => $method, 'HTTP_HOST' => $host, 'REQUEST_URI' => $uri]);
    if ($actual !== $expected) throw new RuntimeException("Unexpected route: $method $host $uri");
    $checks++;
}
foreach (['GET', 'HEAD'] as $method) {
    foreach (['produtorabadon.com', 'www.produtorabadon.com'] as $host) {
        check_route($active, $method, $host, '/f/teste-01?utm_source=meta&fbclid=abc', $active['base_url'] . '/f/teste-01?utm_source=meta&fbclid=abc');
        check_route($active, $method, $host, '/painel', $active['base_url'] . '/painel');
        check_route($active, $method, $host, '/admin/studio/', $active['base_url'] . '/entrar');
        foreach (['/', '/links/', '/admin/', '/api/enviar.php', '/api/studio.php', '/f/confirmacao.php?r=secret', '/privacidade/'] as $path)
            check_route($active, $method, $host, $path, null);
    }
}
foreach (['POST', 'PUT', 'DELETE'] as $method)
    foreach (['/admin/studio/', '/f/teste', '/api/enviar.php'] as $path)
        check_route($active, $method, 'produtorabadon.com', $path, null);
check_route($old, 'GET', 'produtorabadon.com', '/f/teste', null);
check_route($old, 'GET', 'forms.produtorabadon.com', '/entrar', null);
check_route($old, 'GET', 'produtorabadon.com', '/admin/studio/', '/entrar');
check_route($active, 'GET', 'forms.produtorabadon.com', '/f/teste', null);
check_route($active, 'GET', 'forms.produtorabadon.com', '/entrar', null);
check_route($active, 'GET', 'forms.produtorabadon.com', '/admin/studio/', '/entrar');
check_route($active, 'GET', 'produtorabadon.com.evil.invalid', '/f/teste', null);
check_route($active, 'GET', 'produtorabadon.com', "//evil.invalid/f/teste", null);
check_route($active, 'GET', 'produtorabadon.com', "/f/teste?x=\r\nInjected: yes", null);
check_route($active, 'GET', 'produtorabadon.com', '/f/teste?x=\\evil', null);
$app = ['environment' => 'production', 'base_url' => 'https://app.produtorabadon.com'];
foreach (['GET', 'HEAD'] as $method) {
    foreach (['produtorabadon.com', 'www.produtorabadon.com', 'forms.produtorabadon.com'] as $host) {
        check_route($app, $method, $host, '/painel?workspace=4', $app['base_url'] . '/painel?workspace=4');
        check_route($app, $method, $host, '/entrar', $app['base_url'] . '/entrar');
        check_route($app, $method, $host, '/admin/studio/', $app['base_url'] . '/entrar');
        foreach (['/api/studio.php', '/api/enviar.php', '/f/confirmacao.php?r=private', '/privacidade/'] as $path)
            check_route($app, $method, $host, $path, null);
    }
    check_route($app, $method, 'forms.produtorabadon.com', '/', $app['base_url'] . '/');
    check_route($app, $method, 'produtorabadon.com', '/', null);
    check_route($app, $method, 'www.produtorabadon.com', '/', null);
    check_route($app, $method, 'produtorabadon.com', '/f/teste?utm_source=meta', 'https://forms.produtorabadon.com/f/teste?utm_source=meta');
    foreach (['forms.produtorabadon.com', 'app.produtorabadon.com'] as $host)
        check_route($app, $method, $host, '/f/teste?utm_source=meta', null);
    check_route($app, $method, 'app.produtorabadon.com', '/painel', null);
    check_route($app, $method, 'app.produtorabadon.com', '/', null);
    check_route($app, $method, 'forms.produtorabadon.com.evil.invalid', '/painel', null);
}
foreach (['POST', 'PUT', 'DELETE'] as $method)
    foreach (['produtorabadon.com', 'forms.produtorabadon.com', 'app.produtorabadon.com'] as $host)
        foreach (['/entrar', '/painel', '/', '/api/enviar.php', '/f/teste', '/f/confirmacao.php?r=x'] as $path)
            check_route($app, $method, $host, $path, null);
check_route($app, 'GET', 'forms.produtorabadon.com', "//evil.invalid/painel", null);
check_route($app, 'GET', 'forms.produtorabadon.com', "/painel?x=\r\nInjected: yes", null);
echo "OK: $checks verificações de rotas, ativação explícita e preservação de envios/recibos.\n";
