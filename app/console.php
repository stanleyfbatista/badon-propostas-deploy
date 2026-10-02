<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/bootstrap.php';
$command = $argv[1] ?? 'help';
if ($command === 'crm:migrate') {
    require __DIR__ . '/crm.php';
    if (!studio_ready()) exit("Execute studio:migrate primeiro.\n");
    crm_migrate();
    echo "CRM e perfis preparados. Respostas existentes incluídas sem duplicar oportunidades. Nenhum e-mail enviado.\n";
} elseif ($command === 'studio:migrate') {
    require __DIR__ . '/studio.php';
    studio_migrate();
    echo "Bādon Forms: espaços e rascunhos preparados. Formulários públicos e leads preservados.\n";
} elseif ($command === 'migrate') {
    db()->exec(file_get_contents(__DIR__ . '/schema.sql'));
    echo "Tabelas criadas/verificadas. Nenhum dado existente foi removido.\n";
} elseif (in_array($command, ['admin:create', 'admin:password'], true)) {
    $email = strtolower(trim($argv[2] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) exit("Informe um e-mail válido.\n");
    $stmt = db()->prepare('SELECT id FROM admins WHERE email = ?'); $stmt->execute([$email]); $id = $stmt->fetchColumn();
    if ($command === 'admin:create' && $id) exit("Administrador já existe. Use admin:password para trocar a senha.\n");
    if ($command === 'admin:password' && !$id) exit("Administrador não encontrado.\n");
    fwrite(STDERR, "Senha (12 a 72 bytes; não será exibida): ");
    $tty = function_exists('stream_isatty') && stream_isatty(STDIN);
    if ($tty && !function_exists('system')) exit("\nO terminal desta hospedagem bloqueia ocultar a senha pelo PHP. Use leitura silenciosa no shell com pipe; não digite a senha como comando.\n");
    if ($tty) system('stty -echo');
    try { $password = rtrim((string)fgets(STDIN), "\r\n"); }
    finally { if ($tty) system('stty echo'); fwrite(STDERR, "\n"); }
    if (strlen($password) < 12 || strlen($password) > 72) exit("Use de 12 a 72 bytes para a senha.\n");
    $hash = password_hash($password, PASSWORD_DEFAULT);
    unset($password);
    if ($id) db()->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([$hash, $id]);
    else db()->prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)')->execute([$email, $hash]);
    echo "Administrador atualizado.\n";
} elseif ($command === 'check') {
    $version = db()->query('SELECT VERSION()')->fetchColumn();
    $count = db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
    echo "Configuração válida. Banco conectado ($version). Administradores: $count.\n";
    echo "SMTP: configurado. Agende notifications:work no Cron para processar a fila.\n";
} elseif (in_array($command, ['notifications:work', 'mail:retry', 'webhook:retry'], true)) {
    require __DIR__ . '/notifications.php';
    $channel = ['mail:retry' => 'mail', 'webhook:retry' => 'webhook'][$command] ?? 'all';
    $result = process_notifications($channel, $command !== 'notifications:work');
    if ($result['busy']) echo "Já existe um processamento de notificações em andamento.\n";
    else echo "Notificações: {$result['mail']} e-mails, {$result['webhook']} webhooks concluídos; {$result['failed']} falhas. Leads preservados.\n";
} elseif ($command === 'security:cleanup') {
    db()->prepare('DELETE FROM rate_limits WHERE window_start < ?')->execute([time() - 172800]);
    echo "Contadores de proteção com mais de 48 horas removidos. Leads preservados.\n";
} else {
    echo "Comandos: migrate | studio:migrate | crm:migrate | check | admin:create EMAIL | admin:password EMAIL | notifications:work | mail:retry | webhook:retry | security:cleanup\n";
}
