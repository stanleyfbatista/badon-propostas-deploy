<?php
declare(strict_types=1);
require_once __DIR__ . '/studio.php';

function studio_settings(int $id): ?array
{
    if (!studio_ready()) return null;
    $q = db()->prepare('SELECT published_settings FROM bf_forms WHERE form_id = ?'); $q->execute([$id]); $json = $q->fetchColumn();
    return $json === false ? null : json_decode($json, true, 32, JSON_THROW_ON_ERROR);
}
function studio_tracking(array $settings): array
{
    $keys = !empty($settings['tracking']) ? ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'gclid', 'fbclid'] : [];
    $keys = array_unique(array_merge($keys, $settings['hidden_fields'] ?? [])); $values = [];
    foreach ($keys as $key) if (is_string($_GET[$key] ?? null)) $values[] = ['key' => '_tracking_' . $key, 'label' => 'Origem: ' . $key, 'value' => mb_substr(text_value($_GET[$key]), 0, 500)];
    // Origem externa sem query/fragmento para não guardar senhas ou tokens da URL de origem.
    if (!empty($settings['tracking'])) {
        $p = parse_url($_SERVER['HTTP_REFERER'] ?? '');
        if ($p && isset($p['host']) && in_array($p['scheme'] ?? '', ['http', 'https'], true)) $values[] = ['key' => '_tracking_referrer', 'label' => 'Origem: referrer', 'value' => mb_substr($p['scheme'] . '://' . $p['host'] . ($p['path'] ?? '/'), 0, 500)];
    }
    return $values;
}
function studio_theme(array $theme, bool $metaPixel = false): void
{
    if (!$theme && !$metaPixel) return;
    $nonce = bin2hex(random_bytes(16));
    $metaScript = $metaPixel ? ' https://connect.facebook.net' : '';
    $metaNetwork = $metaPixel ? ' https://www.facebook.com https://connect.facebook.net' : '';
    header("Content-Security-Policy: default-src 'self'; script-src 'self'$metaScript; style-src 'self' 'nonce-$nonce'; img-src 'self'$metaNetwork; font-src 'self'; connect-src 'self'$metaNetwork; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
    if (!$theme) return;
    $colors = [];
    foreach (['primary', 'text', 'background'] as $key) $colors[$key] = preg_match('/^#[a-f0-9]{6}$/iD', $theme[$key] ?? '') ? $theme[$key] : '#12243d';
    $font = ['sans' => 'Arial, sans-serif', 'serif' => 'Georgia, serif', 'mono' => 'monospace'][$theme['font'] ?? 'sans'] ?? 'Arial, sans-serif';
    $radius = ['round' => '12px', 'pill' => '100px', 'square' => '0px'][$theme['buttons'] ?? 'round'] ?? '12px';
    $image = $theme['image'] ?? '';
    $imageCSS = preg_match('#^/(?:maintenance-assets|links/assets|forms-media)/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp)$#D', $image) ? 'background-image:url("' . $image . '");background-size:cover;background-attachment:fixed;' : '';
    $GLOBALS['studio_theme_css'] = '<style nonce="' . $nonce . '">body{background-color:' . $colors['background'] . ';color:' . $colors['text'] . ';font-family:' . $font . ';' . $imageCSS . '} .public-flow .button{background:' . $colors['primary'] . ';border-radius:' . $radius . '} .public-flow{--blue:' . $colors['primary'] . ';--cover-radius:' . $radius . ';color:' . $colors['text'] . '} .public-flow .cover-container{background-color:' . $colors['background'] . '}</style>';
}
function studio_webhook(int $leadId): bool
{
    if (!function_exists('curl_init') || !studio_ready()) return false;
    $q = db()->prepare("UPDATE bf_deliveries SET webhook_status = 'sending', attempted_at = ?, attempts = attempts + 1 WHERE lead_id = ? AND (webhook_status IN ('pending', 'failed') OR (webhook_status = 'sending' AND attempted_at < ?))");
    $q->execute([utc_now(), $leadId, gmdate('Y-m-d H:i:s', time() - 120)]);
    if (!$q->rowCount()) return false;
    $q = db()->prepare('SELECT l.*, d.settings_json FROM leads l JOIN bf_deliveries d ON d.lead_id = l.id WHERE l.id = ?'); $q->execute([$leadId]); $lead = $q->fetch();
    $settings = json_decode($lead['settings_json'], true); $url = $settings['webhook_url'] ?? '';
    $ok = $url === '';
    try {
        if ($url !== '') {
            $host = studio_webhook_host($url); $addresses = gethostbynamel($host) ?: [];
            if (!$addresses) throw new RuntimeException('DNS unavailable');
            foreach ($addresses as $ip) if (!studio_public_ip($ip)) throw new RuntimeException('Non-public destination');
            // DNS pinning evita rebinding; sem proxy, redirects ou IPv6 não validado.
            $curl = curl_init($url);
            curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode(['event' => 'form.submitted', 'id' => $leadId, 'form' => ['id' => (int)$lead['form_id'], 'title' => $lead['form_title']], 'answers' => json_decode($lead['values_json'], true), 'created_at' => $lead['created_at'] . 'Z', 'consent' => $lead['consent_text']], JSON_THROW_ON_ERROR), CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Idempotency-Key: badon-lead-' . $leadId], CURLOPT_RESOLVE => [$host . ':443:' . $addresses[0]], CURLOPT_PROXY => '', CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8, CURLOPT_WRITEFUNCTION => static fn($c, $s) => strlen($s)]);
            $result = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
            $ok = $result !== false && $status >= 200 && $status < 300;
        }
    } catch (Throwable $e) { $ok = false; }
    db()->prepare('UPDATE bf_deliveries SET webhook_status = ? WHERE lead_id = ?')->execute([$ok ? 'sent' : 'failed', $leadId]);
    return $ok;
}

function studio_public_ip(string $ip): bool
{
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
    // Redes especiais adicionais que não são classificadas como privadas por todas as versões PHP.
    $n = ip2long($ip);
    foreach ([['100.64.0.0',10], ['192.0.0.0',24], ['192.0.2.0',24], ['192.88.99.0',24], ['198.18.0.0',15], ['198.51.100.0',24], ['203.0.113.0',24], ['224.0.0.0',4], ['240.0.0.0',4]] as [$network,$bits]) {
        $mask = -1 << (32 - $bits);
        if (($n & $mask) === (ip2long($network) & $mask)) return false;
    }
    return true;
}
