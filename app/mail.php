<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/phpmailer/src/Exception.php';
require_once __DIR__ . '/vendor/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/vendor/phpmailer/src/SMTP.php';

function configure_mail_timeouts(PHPMailer\PHPMailer\PHPMailer $mail): void
{
    $mail->Timeout = 10;
    // Timelimit pertence ao SMTP, não ao PHPMailer (a propriedade dinâmica
    // no mailer não muda os 300 segundos usados por stream_select).
    $mail->getSMTPInstance()->Timelimit = 10;
}

function queue_lead_mail(int $id, int $formId = 0): bool
{
    $q = db()->prepare("UPDATE leads SET email_status = 'pending', email_attempts = 0, email_attempted_at = NULL WHERE id = ? AND (? = 0 OR form_id = ?) AND (email_status = 'failed' OR (email_status = 'sending' AND email_attempted_at < ?))");
    $q->execute([$id, $formId, $formId, gmdate('Y-m-d H:i:s', time() - 600)]);
    return $q->rowCount() === 1;
}

function studio_send_mail(string $recipient, string $subject, string $body): bool
{
    global $config;
    try {
        $m = $config['smtp']; $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP(); $mail->Host = $m['host']; $mail->Port = (int)$m['port'];
        $mail->SMTPAuth = !empty($m['username']); $mail->Username = $m['username']; $mail->Password = $m['password'];
        $mail->SMTPSecure = $m['encryption'] === 'none' ? '' : $m['encryption']; $mail->SMTPAutoTLS = $m['encryption'] !== 'none';
        configure_mail_timeouts($mail); $mail->CharSet = 'UTF-8'; $mail->setFrom($m['from_email'], $m['from_name']);
        $mail->addAddress($recipient); $mail->Subject = $subject; $mail->Body = $body; $mail->send(); return true;
    } catch (Throwable $e) { log_incident($e, 'account-mail'); return false; }
}

function notify_lead(int $id): bool
{
    global $config;
    // Claim atômico: não duplicar notificações em retries simultâneos.
    $claim = db()->prepare("UPDATE leads SET email_status = 'sending', email_attempts = email_attempts + 1, email_attempted_at = ? WHERE id = ? AND (email_status IN ('pending', 'failed') OR (email_status = 'sending' AND email_attempted_at < ?))");
    $claim->execute([utc_now(), $id, gmdate('Y-m-d H:i:s', time() - 600)]);
    if (!$claim->rowCount()) return false;
    $stmt = db()->prepare('SELECT * FROM leads WHERE id = ?'); $stmt->execute([$id]); $lead = $stmt->fetch();
    try {
        $m = $config['smtp'];
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $m['host']; $mail->Port = (int)$m['port'];
        $mail->SMTPAuth = !empty($m['username']);
        $mail->Username = $m['username']; $mail->Password = $m['password'];
        $mail->SMTPSecure = $m['encryption'] === 'none' ? '' : $m['encryption'];
        $mail->SMTPAutoTLS = $m['encryption'] !== 'none';
        configure_mail_timeouts($mail);
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($m['from_email'], $m['from_name']);
        require_once __DIR__ . '/studio.php';
        $recipients = [];
        if (studio_ready()) {
            $q = db()->prepare('SELECT settings_json FROM bf_deliveries WHERE lead_id = ?'); $q->execute([$id]); $snapshot = $q->fetchColumn();
            if ($snapshot) $recipients = json_decode($snapshot, true)['notify_emails'] ?? [];
        }
        if (!$recipients) $recipients = [$m['to_email']];
        foreach ($recipients as $recipient) $mail->addBCC($recipient);
        if ($lead['reply_email']) $mail->addReplyTo($lead['reply_email']);
        $mail->Subject = 'Novo lead: ' . $lead['form_title'];
        $lines = ['Novo lead: ' . $lead['form_title'], 'Data e hora: ' . local_date($lead['created_at']) . ' (' . $config['timezone'] . ')', ''];
        foreach (json_decode($lead['values_json'], true, 512, JSON_THROW_ON_ERROR) as $field) {
            $lines[] = $field['label'] . ': ' . ($field['value'] !== '' ? $field['value'] : '(não informado)');
        }
        $lines[] = "\nConsentimento aceito: " . $lead['consent_text'];
        $lines[] = 'Política: ' . $config['base_url'] . $lead['privacy_url'];
        $mail->Body = implode("\n", $lines);
        $mail->send();
        db()->prepare("UPDATE leads SET email_status = 'sent', email_sent_at = ? WHERE id = ?")->execute([utc_now(), $id]);
        return true;
    } catch (Throwable $error) {
        log_incident($error, 'lead-mail', $id);
        db()->prepare("UPDATE leads SET email_status = 'failed' WHERE id = ?")->execute([$id]);
        return false;
    }
}
