<?php
// Copie para /home/USUARIO/badon-config/config.php. Nunca coloque senhas no Git.
return [
    'environment' => 'production',
    'base_url' => 'https://produtorabadon.com',
    'timezone' => 'America/Sao_Paulo',
    // Gere com: php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
    'app_key' => 'SUBSTITUA_POR_64_CARACTERES_HEXADECIMAIS',
    'db' => [
        'host' => 'localhost', 'port' => 3306,
        'name' => 'USUARIO_badon', 'user' => 'USUARIO_badon',
        'password' => 'PREENCHA_NO_SERVIDOR',
    ],
    'smtp' => [
        'host' => 'mail.SEUDOMINIO.com', 'port' => 465,
        'encryption' => 'smtps', // smtps (465) ou tls (587), conforme o cPanel
        'username' => 'contato@SEUDOMINIO.com',
        'password' => 'PREENCHA_NO_SERVIDOR',
        'from_email' => 'contato@SEUDOMINIO.com', 'from_name' => 'Produtora Bādon',
        'to_email' => 'contato@SEUDOMINIO.com',
    ],
    // Código do país + DDD + número, somente dígitos. Confirme o número real.
    'whatsapp_number' => 'PREENCHA_COM_NUMERO_INTERNACIONAL',
    'privacy_url' => '/privacidade/',
    'privacy' => [
        'controller' => 'Produtora Bādon',
        'contact_email' => 'PREENCHA_EMAIL_DE_PRIVACIDADE',
        'retention_days' => 180,
    ],
];
