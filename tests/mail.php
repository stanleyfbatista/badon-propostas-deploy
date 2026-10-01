<?php
declare(strict_types=1);
require dirname(__DIR__) . '/app/mail.php';
$mail = new PHPMailer\PHPMailer\PHPMailer(true);
configure_mail_timeouts($mail);
if ($mail->Timeout !== 10 || $mail->getSMTPInstance()->Timelimit !== 10 || property_exists($mail, 'Timelimit')) throw new RuntimeException('SMTP timeout configured on wrong object');
echo "OK: limites de conexão e comandos configurados nos objetos corretos, sem propriedade dinâmica.\n";
