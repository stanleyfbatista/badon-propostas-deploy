<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/mail.php';
$mail = new PHPMailer\PHPMailer\PHPMailer(true);
configure_mail_timeouts($mail);
if ($mail->Timeout !== 10 || $mail->getSMTPInstance()->Timelimit !== 10 || property_exists($mail, 'Timelimit')) throw new RuntimeException('SMTP timeout configured on wrong object');
foreach (['smtps' => 'ssl', 'tls' => 'tls', 'none' => ''] as $mode => $expected) {
    configure_mail_encryption($mail, $mode);
    if ($mail->SMTPSecure !== $expected || $mail->SMTPAutoTLS !== ($mode !== 'none')) throw new RuntimeException('SMTP encryption mapping failed');
}
try { configure_mail_encryption($mail, 'unexpected'); throw new RuntimeException('Invalid mode accepted'); }
catch (InvalidArgumentException $expected) {}
echo "OK: limites de conexão e comandos configurados nos objetos corretos, sem propriedade dinâmica.\n";
echo "OK: SMTPS/STARTTLS mapeados explicitamente; modos desconhecidos rejeitados.\n";
