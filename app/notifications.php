<?php
declare(strict_types=1);
require_once __DIR__ . '/mail.php';
require_once __DIR__ . '/studio-public.php';

// Fila persistida nas próprias tabelas existentes. Sem processos externos,
// endpoints públicos de envio, extensões de shell ou serviços de terceiros.
function process_notifications(string $channel = 'all', bool $manual = false): array
{
    if (PHP_SAPI !== 'cli') throw new RuntimeException('CLI only');
    $path = dirname(__DIR__) . '/badon-config/notifications.lock';
    if (is_link($path)) throw new RuntimeException('Invalid worker lock');
    $oldMask = umask(0077);
    try { $lock = fopen($path, 'c'); } finally { umask($oldMask); }
    if (!$lock) throw new RuntimeException('Cannot open worker lock');
    $result = ['busy' => false, 'mail' => 0, 'webhook' => 0, 'failed' => 0];
    if (!flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); $result['busy'] = true; return $result; }
    $deadline = microtime(true) + 50;
    try {
        $stale = gmdate('Y-m-d H:i:s', time() - 600);
        $backoff = gmdate('Y-m-d H:i:s', time() - 900);
        if ($channel !== 'webhook') {
            $filter = $manual ? '' : ' AND email_attempts < 5';
            $q = db()->prepare("SELECT id FROM leads WHERE (email_status = 'pending' OR (email_status = 'failed' AND (? = 1 OR email_attempted_at < ?)) OR (email_status = 'sending' AND email_attempted_at < ?))$filter ORDER BY email_attempts, id LIMIT 10");
            $q->execute([(int)$manual, $backoff, $stale]);
            foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) {
                if (microtime(true) >= $deadline) break;
                try { $ok = notify_lead((int)$id); }
                catch (Throwable $error) { log_incident($error, 'mail-worker', (int)$id); $ok = false; }
                $result[$ok ? 'mail' : 'failed']++;
            }
        }
        if ($channel !== 'mail' && studio_ready() && microtime(true) < $deadline) {
            $q = db()->prepare("SELECT lead_id FROM bf_deliveries WHERE attempts < 5 AND (webhook_status = 'pending' OR (webhook_status = 'failed' AND (? = 1 OR attempted_at < ?)) OR (webhook_status = 'sending' AND attempted_at < ?)) ORDER BY attempts, lead_id LIMIT 10");
            $q->execute([(int)$manual, $backoff, $stale]);
            foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $id) {
                if (microtime(true) >= $deadline) break;
                try { $ok = studio_webhook((int)$id); }
                catch (Throwable $error) { log_incident($error, 'webhook-worker', (int)$id); $ok = false; }
                $result[$ok ? 'webhook' : 'failed']++;
            }
        }
        return $result;
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
