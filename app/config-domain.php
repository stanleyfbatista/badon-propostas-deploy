<?php
declare(strict_types=1);

/** CLI-only, explicit cutover after DNS/TLS verification. Never rewrites other settings. */
function switch_flow_domain(string $path, string $expected, string $target): array
{
    $allowed = ['https://forms.produtorabadon.com', 'https://app.produtorabadon.com'];
    if (PHP_SAPI !== 'cli' || !in_array($expected, $allowed, true)
        || !in_array($target, $allowed, true) || $expected === $target
        || is_link($path) || !is_file($path)) {
        throw new RuntimeException('Invalid domain switch');
    }
    $before = require $path;
    if (($before['environment'] ?? '') !== 'production') throw new RuntimeException('Production config required');
    if (($before['base_url'] ?? '') === $target) return ['changed' => false, 'base_url' => $target];
    if (($before['base_url'] ?? '') !== $expected) throw new RuntimeException('Unexpected current domain');
    $source = file_get_contents($path);
    $pattern = '~([\x27\x22]base_url[\x27\x22]\s*=>\s*)([\x27\x22])' . preg_quote($expected, '~') . '\2~';
    $next = preg_replace_callback($pattern, fn($m) => $m[1] . $m[2] . $target . $m[2], $source, -1, $count);
    if ($count !== 1 || $next === null) throw new RuntimeException('Expected one literal base_url setting');
    $dir = dirname($path);
    $backupDir = $dir . '/backups';
    if (is_link($backupDir)) throw new RuntimeException('Invalid backup directory');
    $mask = umask(0077);
    $temp = null;
    try {
        if (!is_dir($backupDir) && !mkdir($backupDir, 0700)) throw new RuntimeException('Cannot create private backup directory');
        $temp = tempnam($dir, '.domain-');
        if ($temp === false || file_put_contents($temp, $next, LOCK_EX) !== strlen($next))
            throw new RuntimeException('Cannot prepare new config');
        chmod($temp, 0600);
        $after = require $temp;
        $expectedConfig = $before;
        $expectedConfig['base_url'] = $target;
        if ($after !== $expectedConfig) throw new RuntimeException('Unexpected configuration change');
        validate_config($after);
        $backup = $backupDir . '/config-before-domain-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.php';
        $handle = fopen($backup, 'xb');
        if (!$handle) throw new RuntimeException('Cannot create config backup');
        try {
            if (fwrite($handle, $source) !== strlen($source)) throw new RuntimeException('Incomplete backup');
        } finally { fclose($handle); }
        chmod($backup, 0600);
        if (file_get_contents($path) !== $source) throw new RuntimeException('Configuration changed concurrently');
        if (!rename($temp, $path)) throw new RuntimeException('Cannot activate new config');
        $temp = null;
        if (function_exists('opcache_invalidate')) opcache_invalidate($path, true);
        return ['changed' => true, 'base_url' => $target, 'backup' => $backup];
    } finally {
        if ($temp !== null && is_file($temp)) unlink($temp);
        umask($mask);
    }
}
