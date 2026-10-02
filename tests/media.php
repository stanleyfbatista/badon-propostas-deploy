<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/domain.php';
require dirname(__DIR__) . '/app/studio.php';
function check_media(bool $ok): void { if (!$ok) throw new RuntimeException('Media assertion failed'); }
function reject_media(callable $fn): void { try { $fn(); } catch (InvalidArgumentException $e) { return; } throw new RuntimeException('Unsafe media accepted'); }
$src = '/forms-media/uploads/1/' . str_repeat('a', 32) . '.png';
check_media(clean_welcome([])['enabled'] === true);
check_media(clean_welcome(['title' => 'Legado'])['enabled'] === true);
check_media(clean_welcome(['title' => 'Legado', 'enabled' => false])['enabled'] === true);
foreach (['left', 'right', 'top', 'background'] as $layout) foreach (['cover', 'contain'] as $fit) {
    $w = clean_welcome(['enabled' => true, 'title' => 'Olá', 'media' => ['type' => 'image', 'src' => $src], 'layout' => $layout, 'fit' => $fit, 'x' => 10, 'y' => 90, 'button_text' => 'Quero começar']);
    check_media($w['layout'] === $layout && $w['fit'] === $fit && $w['x'] === 10 && $w['y'] === 90);
    check_media($w['media']['src'] === $src && $w['button_text'] === 'Quero começar');
}
foreach (['https://example.com/a.png', 'javascript:alert(1)', '/forms-media/uploads/1/../../config.php', $src . '?x=1', str_replace('.png', '.svg', $src)] as $bad) reject_media(fn() => clean_welcome(['media' => ['src' => $bad, 'type' => 'image']]));
reject_media(fn() => clean_welcome(['media' => ['src' => $src, 'type' => 'video']]));
foreach ([['x' => -1], ['y' => 101], ['x' => NAN], ['fit' => 'bad'], ['layout' => 'bad'], ['button_text' => ''], ['media' => 'invalid']] as $bad) reject_media(fn() => clean_welcome($bad));
check_media(media_ini_bytes('2M') === 2097152 && media_ini_bytes('1G') === 1073741824 && media_ini_bytes('0') === PHP_INT_MAX);
$tmp = tempnam(sys_get_temp_dir(), 'badon-media-unit-');
try {
    file_put_contents($tmp, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
    $limits = ['image' => 5000000, 'video' => 20000000];
    check_media(inspect_media($tmp, 'Minha foto.png', $limits)['type'] === 'image');
    reject_media(fn() => inspect_media($tmp, 'exploit.php', $limits));
    reject_media(fn() => inspect_media($tmp, 'fake.mp4', $limits));
    reject_media(fn() => inspect_media($tmp, 'large.png', ['image' => 1, 'video' => 1]));
    file_put_contents($tmp, '<svg onload="alert(1)"></svg>');
    reject_media(fn() => inspect_media($tmp, 'fake.png', $limits));
    reject_media(fn() => inspect_media($tmp, 'script.svg', $limits));
} finally { unlink($tmp); }
echo "OK: configuração da capa, legado, enquadramento, tipos reais de mídia e rejeição de arquivos/caminhos inválidos.\n";
