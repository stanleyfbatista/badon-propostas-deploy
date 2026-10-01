<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
$receipt = $_SESSION['receipts'][text_value($_GET['r'] ?? '')] ?? null;
if (!$receipt || $receipt['time'] < time() - 3600) fail_page(404, 'Confirmação indisponível. Ela só aparece após o envio nesta sessão.');
page_start('Recebemos seu formulário');
echo '<section class="panel"><p class="eyebrow">Enviado com sucesso</p><h1>Obrigado pelo contato.</h1><p>Recebemos suas informações de <strong>' . h($receipt['title']) . '</strong>. Se quiser, continue a conversa pelo WhatsApp.</p><a class="button" href="' . h(whatsapp_url($config, $receipt['title'], $receipt['message'])) . '" rel="noopener noreferrer" target="_blank">Continuar no WhatsApp</a><p><a href="/">Voltar ao site</a></p></section>';
page_end();
