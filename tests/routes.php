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
echo "OK: $checks verificações de rotas, ativação explícita e preservação de envios/recibos.\n";
