<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/_bootstrap.php';
$manifest = json_decode(file_get_contents(dirname(__DIR__, 2) . '/studio-assets/manifest.json'), true, 32, JSON_THROW_ON_ERROR);
$entry = $manifest['studio/main.tsx'];
// React and the node editor use inline styles; public forms keep their own CSP.
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
?><!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Bādon Flow · Da primeira conversa à entrega</title><link rel="icon" href="/maintenance-assets/favicon.svg">
<?php foreach ($entry['css'] ?? [] as $css): ?><link rel="stylesheet" href="/studio-assets/<?= h($css) ?>"><?php endforeach; ?>
</head><body><div id="root"><p>Carregando Bādon Flow…</p></div><noscript>Ative o JavaScript para usar o editor. Seus formulários públicos continuam disponíveis.</noscript><script type="module" src="/studio-assets/<?= h($entry['file']) ?>"></script></body></html>
