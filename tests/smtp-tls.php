<?php
declare(strict_types=1);
// Processo isolado de teste: sem banco, dados reais ou destinatários externos.
require dirname(__DIR__) . '/app/mail.php';
function log_incident(Throwable $error, string $stage = 'request', int $leadId = 0): string { return 'local-smtp-test'; }
$config = ['smtp' => ['host' => 'localhost', 'port' => (int)$argv[1], 'encryption' => 'smtps', 'username' => '', 'password' => '', 'from_email' => 'forms@example.invalid', 'from_name' => 'Local TLS test']];
$ok = studio_send_mail('recipient@example.invalid', 'SMTPS regression test', 'No external delivery.');
if ($ok !== ($argv[2] === 'success')) throw new RuntimeException('Unexpected SMTPS result');
echo $ok ? "TLS delivery accepted\n" : "Untrusted certificate rejected\n";
