<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
$receipt = $_SESSION['receipts'][text_value($_GET['r'] ?? '')] ?? null;
if (!$receipt || $receipt['time'] < time() - 3600) fail_page(404, 'Confirmação indisponível. Ela só aparece após o envio nesta sessão.');
page_start('Recebemos seu formulário');
$ending = $receipt['ending'] ?? default_ending();
echo '<section class="panel"><p class="eyebrow">Enviado com sucesso</p><h1>' . h($ending['title']) . '</h1><p>' . nl2br(h($ending['message'])) . '</p>';
if ($ending['whatsapp']) echo '<a class="button" href="' . h(whatsapp_url($config, $receipt['title'], $receipt['message'])) . '" rel="noopener noreferrer" target="_blank">Continuar no WhatsApp</a>';
echo '<p class="return-link"><a href="/">Voltar ao site</a></p></section>';
page_end();
