<?php
declare(strict_types=1);

function clean_welcome($raw): array
{
    if (!is_array($raw)) throw new InvalidArgumentException('Capa inválida.');
    $title = studio_text($raw['title'] ?? '', 150);
    $media = $raw['media'] ?? null;
    if ($media !== null) {
        if (!is_array($media)) throw new InvalidArgumentException('Mídia da capa inválida.');
        $src = text_value($media['src'] ?? '');
        if (!preg_match('#^/forms-media/uploads/([1-9][0-9]{0,9})/[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$#D', $src, $match)) throw new InvalidArgumentException('Envie a mídia da capa pelo painel.');
        $type = in_array($match[2], ['mp4', 'webm'], true) ? 'video' : 'image';
        if (($media['type'] ?? '') !== $type) throw new InvalidArgumentException('Tipo de mídia inválido.');
        $media = ['type' => $type, 'src' => $src];
    }
    $layout = $raw['layout'] ?? 'left'; $fit = $raw['fit'] ?? 'cover';
    if (!in_array($layout, ['left', 'right', 'top', 'background'], true) || !in_array($fit, ['cover', 'contain'], true)) throw new InvalidArgumentException('Escolha uma posição e um enquadramento válidos.');
    $focal = [];
    foreach (['x', 'y'] as $axis) {
        $n = $raw[$axis] ?? 50;
        if ((!is_int($n) && !is_float($n)) || !is_finite((float)$n) || $n < 0 || $n > 100) throw new InvalidArgumentException('O ponto focal deve ficar entre 0 e 100.');
        $focal[$axis] = (int)round($n);
    }
    return ['enabled' => true,
        'title' => $title, 'message' => studio_text($raw['message'] ?? '', 2000),
        'button_text' => studio_text($raw['button_text'] ?? 'Começar', 60, true),
        'media' => $media, 'layout' => $layout, 'fit' => $fit, 'x' => $focal['x'], 'y' => $focal['y'],
        'alt' => studio_text($raw['alt'] ?? '', 250)];
}

function media_root(): string
{
    $parent = dirname(__DIR__);
    return $parent . (is_dir($parent . '/public') ? '/public' : '/public_html') . '/forms-media/uploads';
}

function studio_check_media(array $draft, int $workspace): void
{
    $media = $draft['definition']['welcome']['media'] ?? null;
    if (!$media) return;
    $prefix = '/forms-media/uploads/' . $workspace . '/';
    if (!str_starts_with($media['src'], $prefix)) throw new InvalidArgumentException('A mídia precisa pertencer ao mesmo espaço do formulário.');
    $root = media_root(); $dir = $root . '/' . $workspace;
    $file = $dir . '/' . basename($media['src']);
    if (is_link($root) || is_link($dir) || is_link($file) || !is_file($file)) throw new InvalidArgumentException('A mídia da capa não está disponível. Envie o arquivo novamente.');
}

function media_ini_bytes(string $value): int
{
    $value = trim($value);
    $n = (float)$value;
    $multiplier = match (strtolower(substr($value, -1))) { 'g' => 1073741824, 'm' => 1048576, 'k' => 1024, default => 1 };
    return $n <= 0 ? PHP_INT_MAX : (int)min(PHP_INT_MAX, $n * $multiplier);
}

function media_limits(): array
{
    $limit = max(0, min(media_ini_bytes((string)ini_get('upload_max_filesize')), media_ini_bytes((string)ini_get('post_max_size')) - 65536));
    return ['image' => min(5 * 1048576, $limit), 'video' => min(20 * 1048576, $limit)];
}

function inspect_media(string $path, string $name, array $limits): array
{
    if (!class_exists('finfo')) throw new RuntimeException('Fileinfo unavailable');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
    $allowed = ['image/jpeg' => ['image', 'jpg', ['jpg', 'jpeg']], 'image/png' => ['image', 'png', ['png']],
        'image/webp' => ['image', 'webp', ['webp']], 'video/mp4' => ['video', 'mp4', ['mp4']], 'video/webm' => ['video', 'webm', ['webm']]];
    $format = $allowed[$mime] ?? null;
    if (!$format || !in_array(strtolower(pathinfo($name, PATHINFO_EXTENSION)), $format[2], true)) throw new InvalidArgumentException('Use JPG, PNG, WebP, MP4 ou WebM válidos. SVG, HTML e arquivos executáveis não são aceitos.');
    $bytes = filesize($path);
    if ($bytes === false || $bytes < 1 || $bytes > $limits[$format[0]]) throw new InvalidArgumentException('O arquivo excede o limite exibido no painel. Reduza o tamanho e tente novamente.');
    if ($format[0] === 'image') {
        $info = @getimagesize($path);
        if (!$info || ($info['mime'] ?? '') !== $mime || $info[0] < 1 || $info[1] < 1 || $info[0] > 12000 || $info[1] > 12000 || $info[0] * $info[1] > 40000000) throw new InvalidArgumentException('Imagem inválida ou muito grande. Use até 40 megapixels e 12.000 pixels por lado.');
    }
    return ['type' => $format[0], 'extension' => $format[1], 'bytes' => $bytes];
}

function store_media_upload(array $upload, int $workspace): array
{
    if (!is_int($upload['error'] ?? null) || is_array($upload['tmp_name'] ?? null) || is_array($upload['name'] ?? null)) throw new InvalidArgumentException('Envie um arquivo por vez.');
    if ($upload['error'] !== UPLOAD_ERR_OK) throw new InvalidArgumentException(in_array($upload['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 'O arquivo excede o limite do PHP da hospedagem. Reduza-o ou ajuste upload_max_filesize e post_max_size no cPanel.' : 'O envio não foi concluído. Selecione o arquivo novamente.');
    $tmp = $upload['tmp_name'] ?? '';
    if (!is_string($tmp) || !is_uploaded_file($tmp)) throw new InvalidArgumentException('Upload inválido.');
    $file = inspect_media($tmp, (string)$upload['name'], media_limits());
    $root = media_root(); $dir = $root . '/' . $workspace;
    if (is_link($root) || !is_file($root . '/.htaccess') || is_link($dir)) throw new RuntimeException('Media storage unavailable');
    if (!is_dir($dir) && !mkdir($dir, 0755)) throw new RuntimeException('Cannot create media directory');
    $lock = fopen($dir . '/.upload.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Cannot lock media directory');
    try {
        $total = 0; $count = 0;
        foreach (new DirectoryIterator($dir) as $entry) {
            if ($entry->isFile() && !$entry->isLink() && preg_match('/^[a-f0-9]{32}\.(jpg|png|webp|mp4|webm)$/D', $entry->getFilename())) { $total += $entry->getSize(); $count++; }
        }
        if ($total + $file['bytes'] > 250 * 1048576 || $count >= 200) throw new InvalidArgumentException('Este espaço atingiu o limite de mídia (250 MB ou 200 arquivos). Peça à agência para revisar os arquivos antigos.');
        do { $name = bin2hex(random_bytes(16)) . '.' . $file['extension']; } while (file_exists($dir . '/' . $name));
        if (!move_uploaded_file($tmp, $dir . '/' . $name)) throw new RuntimeException('Cannot store uploaded media');
        chmod($dir . '/' . $name, 0644);
        return ['type' => $file['type'], 'src' => '/forms-media/uploads/' . $workspace . '/' . $name];
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
