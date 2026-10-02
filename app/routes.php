<?php
declare(strict_types=1);

/** Redirect only navigation, never submissions, APIs or session-bound receipts. */
function forms_navigation_redirect(array $config, array $server): ?string
{
    if (!in_array($server['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) return null;
    $uri = $server['REQUEST_URI'] ?? '/';
    if (!is_string($uri) || preg_match('/[\x00-\x20\x7f\\\\]/', $uri)) return null;
    $path = explode('?', $uri, 2)[0];
    $query = str_contains($uri, '?') ? '?' . explode('?', $uri, 2)[1] : '';
    $legacy = in_array($path, ['/admin/studio', '/admin/studio/', '/admin/studio/index.php'], true);
    $studio = $legacy || in_array($path, ['/entrar', '/entrar/', '/painel', '/painel/'], true);
    $form = preg_match('#^/f/[a-z0-9]+(?:-[a-z0-9]+)*/?$#D', $path) === 1 || $path === '/f/index.php';
    $target = $legacy ? '/entrar' : $path;

    // Activation is an explicit private-config change AFTER DNS + TLS validation.
    // Restrict the source hosts; never derive a redirect destination from Host.
    if (($config['environment'] ?? '') === 'production'
        && ($config['base_url'] ?? '') === 'https://forms.produtorabadon.com'
        && in_array(strtolower($server['HTTP_HOST'] ?? ''), ['produtorabadon.com', 'www.produtorabadon.com'], true)
        && ($studio || $form)) {
        return $config['base_url'] . $target . $query;
    }
    return $legacy ? $target . $query : null;
}
