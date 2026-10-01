<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/_bootstrap.php';
$manifest = json_decode(file_get_contents(dirname(__DIR__, 2) . '/studio-assets/manifest.json'), true, 32, JSON_THROW_ON_ERROR);
$entry = $manifest['studio/main.tsx'];
?><!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Bādon Forms · Seu próximo contato começa aqui</title><link rel="icon" href="/maintenance-assets/favicon.svg">
<?php foreach ($entry['css'] ?? [] as $css): ?><link rel="stylesheet" href="/studio-assets/<?= h($css) ?>"><?php endforeach; ?>
</head><body><div id="root"><p>Carregando Bādon Forms…</p></div><noscript>Ative o JavaScript para usar o editor. Seus formulários públicos continuam disponíveis.</noscript><script type="module" src="/studio-assets/<?= h($entry['file']) ?>"></script></body></html>
