<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
page_start('Política de Privacidade — formulários');
?>
<article class="panel">
  <p class="eyebrow">Seus dados</p>
  <h1>Privacidade nos formulários</h1>
  <p>Esta política descreve o uso dos dados enviados pelos formulários deste site. O responsável pelo tratamento é <?= h($config['privacy']['controller']) ?>. Para assuntos de privacidade, escreva para <a href="mailto:<?= h($config['privacy']['contact_email']) ?>"><?= h($config['privacy']['contact_email']) ?></a>.</p>
  <h2>O que recebemos e por quê</h2>
  <p>Recebemos as informações que você preencher, como nome, e-mail, telefone e detalhes da sua solicitação. Usamos esses dados para analisar seu pedido e entrar em contato sobre os serviços solicitados. Campos opcionais podem ficar em branco. Evite enviar documentos, senhas ou dados pessoais sensíveis.</p>
  <h2>Consentimento e registro do envio</h2>
  <p>O envio depende da sua manifestação no campo de consentimento, inicialmente desmarcado. Registramos as respostas, a data e a hora, o texto exato aceito e o endereço da política apresentada. Esse consentimento não autoriza automaticamente campanhas de marketing não relacionadas à sua solicitação.</p>
  <h2>Armazenamento e acesso</h2>
  <p>As respostas ficam no banco de dados da nossa hospedagem e uma notificação é enviada ao e-mail responsável pelo atendimento, pelo servidor de e-mail da hospedagem. Pessoas autorizadas podem consultar e exportar os contatos para realizar o atendimento. Não vendemos os dados coletados.</p>
  <h2>Prazo e seus direitos</h2>
  <p>Para contatos que não evoluírem para uma contratação, o prazo de referência é de <?= (int)$config['privacy']['retention_days'] ?> dias após o envio, com revisão e exclusão pelo responsável. Dados necessários a uma relação contratual ou ao cumprimento de obrigações podem seguir prazos específicos. Backups e cópias de e-mail precisam seguir o processo de retenção da hospedagem e do atendimento.</p>
  <p>Você pode solicitar confirmação de tratamento, acesso, correção e exclusão dos dados, além de revogar seu consentimento. Entre em contato pelo e-mail acima; poderemos pedir informações necessárias para confirmar sua identidade. A revogação não invalida os tratamentos anteriores realizados de forma legítima.</p>
  <h2>Cookies e segurança</h2>
  <p>Usamos um cookie de sessão necessário para proteger os formulários e o acesso administrativo. Para limitar tentativas abusivas, o endereço de conexão é transformado em um identificador criptográfico; o endereço original não é salvo no cadastro do lead. Os logs gerais do servidor seguem as configurações da hospedagem.</p>
  <h2>Medição opcional de anúncios</h2>
  <p>Quando o responsável pelo formulário ativa o Pixel da Meta, mostramos uma escolha separada para aceitar ou recusar a medição de anúncios. O Pixel só é carregado após sua autorização. Recusar não impede o uso do formulário e não modifica o consentimento necessário para enviar sua solicitação.</p>
  <p>A medição registra abertura, início, etapas acessadas, chegada à confirmação e envio concluído. Enviamos como parâmetros apenas o identificador do formulário, números de etapas e um identificador técnico do evento. Não incluímos suas respostas, nome, e-mail, telefone ou textos das perguntas nesses parâmetros, nem usamos correspondência avançada de dados de contato.</p>
  <p>A Meta pode receber dados técnicos de conexão e navegação, como IP, endereço da página, informações do navegador e identificadores de publicidade/cookies, conforme sua <a href="https://www.facebook.com/privacy/policy/" rel="noopener noreferrer" target="_blank">Política de Privacidade</a>. Esses dados podem ser usados para medição e atribuição de anúncios, inclusive com tratamento fora do Brasil. A escolha é guardada nesta sessão da aba, por formulário e Pixel; você pode alterá-la em “Alterar preferências de medição” na página do formulário. A revogação interrompe os próximos eventos, mas não apaga dados já enviados; para solicitações sobre esses dados, consulte os canais indicados nesta política e na política da Meta.</p>
  <h2>WhatsApp é uma escolha sua</h2>
  <p>Depois do envio, você pode optar por continuar no WhatsApp. Clicar no botão abre esse serviço externo, sujeito às políticas dele. Nenhuma resposta do formulário é inserida automaticamente na mensagem; apenas o texto de apresentação definido para o formulário.</p>
</article>
<?php page_end(); ?>
