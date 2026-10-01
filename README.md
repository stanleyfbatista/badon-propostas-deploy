# Bādon Forms — site estático + funis PHP

O site existente permanece estático e **não teve seu HTML, CSS ou imagens alterados**.
Os arquivos antigos foram movidos, sem alteração de conteúdo, para `public/`.
Os endereços `/`, `/links/`, `/propostas/...` e `/relatorios/...` permanecem iguais.

O novo sistema usa PHP 8, PDO/MySQL e PHPMailer incluído no repositório.
Não usa SaaS, APIs de formulário, CDN, fontes externas, Node ou Composer em produção.
A entrega de notificações utiliza exclusivamente o SMTP configurado da hospedagem.
O link opcional de WhatsApp é aberto apenas por iniciativa do visitante após o envio.

## Endereços

- `/admin/`: login, editor de formulários, lista de leads, detalhes e CSV.
- `/f/{slug}`: formulário público, por exemplo `/f/trafego-negocios-locais`.
- `/api/enviar.php`: POST de formulário, não uma página de acesso direto.
- `/f/confirmacao.php`: confirmação restrita à sessão que fez o envio, por uma hora.
- `/privacidade/`: política de privacidade dos formulários, a revisar antes de publicar.

## Instalação no cPanel (uma vez)

### 1. Requisitos

- Selecione PHP **8.0 ou superior**, preferencialmente uma versão 8.x ainda suportada, no MultiPHP Manager para `produtorabadon.com`.
- Extensões `pdo_mysql`, `mbstring`, `openssl`, `session`, `json`, `ctype`, `filter` e `hash`.
- HTTPS válido. Em produção, o PHP exige HTTPS e usa cookies Secure/HttpOnly/SameSite.
- MySQL 5.7+ ou MariaDB compatível, com tabelas InnoDB e utf8mb4.
- Apache 2.4 com `mod_rewrite`/`.htaccess` habilitados, como no cPanel.
- Esta instalação pressupõe o domínio apontando para `/home/USUARIO/public_html`.
  Se o domínio usar outra raiz, ajuste o script de deploy antes de executá-lo.

### 2. Banco

No assistente **MySQL Databases** do cPanel:

1. Crie um banco exclusivo, por exemplo `USUARIO_badon`.
2. Crie um usuário de banco e senha forte.
3. Associe esse usuário **somente a esse banco**, com permissões para criar as tabelas e consultar/inserir/atualizar/excluir registros.

Não reutilize o banco do WordPress. Não há alterações em dados do WordPress.

### 3. Configuração privada

No Gerenciador de Arquivos, crie **fora do public_html e do checkout Git**:

```
/home/USUARIO/badon-config/config.php
```

Use `config.example.php` como modelo e substitua TODOS os placeholders:

- Dados do MySQL.
- SMTP: servidor, usuário, senha, remetente, destinatário e porta da hospedagem.
  Consulte **Email Accounts → Connect Devices**; normalmente SMTPS/465 ou STARTTLS/587.
  O remetente deve pertencer à conta/autorização SMTP. Não use o e-mail do lead como remetente.
- `whatsapp_number`: número real com país e DDD, apenas dígitos. Ex.: formato `55DDDNÚMERO`.
  O antigo link `wa.me/message/...` não revela um número confiável, portanto ele **não foi convertido nem adivinhado**.
- E-mail de privacidade real, nome do controlador e prazo de retenção.
- `app_key`: chave aleatória de 64 caracteres hexadecimais, gerada no Terminal:

```sh
php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'
```

Deixe `environment` como `production` e `base_url` como `https://produtorabadon.com`, sem barra final.
`privacy_url` deve ser um caminho local; o padrão é `/privacidade/`.

Permissões recomendadas: diretório `700`, arquivo `600`, proprietário igual ao usuário PHP da conta.
Se houver restrição `open_basedir`, peça à hospedagem para permitir `badon-app` e `badon-config`.
Não envie credenciais em chat, não as coloque no repositório e não copie a configuração para `public/`.

### 4. Deploy e inicialização

No repositório **badon-propostas-deploy**, Git Version Control:

1. **Update from Remote**.
2. **Deploy HEAD Commit**.

O `.cpanel.yml` executa `deploy/deploy.sh`, que:

- Copia **todo o conteúdo de `public/`** para `public_html`, sem apagar outras páginas.
- Copia `app/` (incluindo PHPMailer) para `/home/USUARIO/badon-app`, fora da área pública.
- Não toca em `badon-config/config.php`.
- Guarda uma cópia do `.htaccess` existente e substitui somente o bloco gerenciado Bādon.
- Preserva as demais regras cPanel/WordPress e acrescenta `/f/{slug}` antes da regra de 404.
- Não cria tabelas nem administradores automaticamente em cada deploy.

No Terminal do cPanel, confirme `php -v` e execute com o binário PHP 8 da hospedagem:

```sh
php /home/USUARIO/badon-app/console.php migrate
php /home/USUARIO/badon-app/console.php admin:create SEU_EMAIL
php /home/USUARIO/badon-app/console.php check
```

A senha será solicitada sem eco no terminal (12–72 bytes). Nenhuma senha padrão foi criada.
`migrate` é idempotente: cria tabelas ausentes e não apaga dados. Não execute por HTTP.
Se não houver Terminal/SSH disponível, peça ao suporte para executar esses três comandos.
Não foi criado instalador público, para evitar tomada de conta durante a instalação.

### 5. Teste na hospedagem

1. Abra `https://produtorabadon.com/admin/` e faça login.
2. Crie um formulário com título, slug e campos; mantenha **Publicado** selecionado.
3. Inclua ao menos um campo de e-mail se quiser `Reply-To` ao lead. O primeiro e-mail preenchido é usado; se não houver e-mail, não há `Reply-To`.
4. Visite o link público em uma janela privada. Verifique que consentimento está desmarcado e não há botão de WhatsApp.
5. Envie um contato de teste, aceite o consentimento e confira a confirmação, o WhatsApp, o lead no painel e a entrega no e-mail.
6. Teste o filtro por formulário e **Exportar CSV**. O CSV é UTF-8, separado por ponto e vírgula, com todas as respostas na coluna **Respostas**, além dos metadados e do consentimento.
7. Confira também `/`, `/links/`, as propostas e os relatórios antigos.

**O push para o GitHub, sozinho, não ativa o sistema.** Banco, arquivo privado, administrador e deploy precisam estar concluídos no servidor. Sem configuração, somente as novas páginas de formulário retornam 503; as páginas estáticas continuam disponíveis.

## Funis condicionais (atualização v2)

Faça **Update from Remote → Deploy HEAD Commit** no mesmo repositório. Não é necessário recriar banco, senha, administrador ou configuração; não há novas tabelas nem `ALTER TABLE` nesta atualização.

1. Em **Novo formulário**, defina título e slug. Não existem perguntas obrigatórias de modelo: clique em **Adicionar pergunta** e monte de 1 a 100 perguntas.
2. Escolha texto curto, e-mail, telefone, seleção, número/valor ou texto longo. Marque as perguntas obrigatórias. Para receber um Reply-To útil, inclua uma pergunta de e-mail antes de possíveis encerramentos.
3. Em **Regras de caminho**, adicione condições. Alternativas e texto permitem igualdade/diferença (texto exato, incluindo maiúsculas); números também permitem menor/maior, com ou sem igualdade. Valores numéricos aceitam de 0 a 1 trilhão, até duas casas decimais, ponto ou vírgula decimal, sem R$ ou separador de milhar.
4. Escolha o destino: próxima pergunta, outra pergunta posterior ou encerramento personalizado. A primeira condição correspondente vence; se nenhuma combinar, vale o destino padrão. Resposta opcional vazia não aciona condições, nem “diferente”.
5. Configure título, mensagem e presença do WhatsApp em cada encerramento. O encerramento padrão cobre caminhos que chegam ao fim; encerramentos condicionais começam com WhatsApp desabilitado. Exemplo: investimento menor que `1000` → encerrar com mensagem; demais respostas → próxima pergunta.
6. Salve e use o link público para testar cada caminho com dados fictícios. O modo **Uma pergunta por vez** permite avançar e voltar. Alterar uma resposta anterior limpa as respostas posteriores para evitar misturar caminhos. Também existe o modo de perguntas do caminho na mesma página.

Não são permitidos saltos para trás ou para perguntas removidas. Revise as regras após reordenar/remover perguntas; o editor e o servidor recusam destinos inválidos. A ordem das condições também pode ser alterada.

**Encerrar não descarta automaticamente o contato nem grava dados antes do consentimento.** Mesmo em encerramento antecipado, a pessoa revisa e confirma o envio com consentimento desmarcado por padrão. Só então são gravadas as respostas do caminho percorrido, o resultado do funil e a data/hora. Abandonos sem confirmar não geram leads. A tela final e o WhatsApp configurados aparecem após essa confirmação.

O resultado fica visível na lista/detalhe de leads e nas respostas do CSV e e-mail. Campos pulados são ignorados no servidor mesmo quando enviados manualmente; campos obrigatórios só são exigidos no caminho efetivo. O navegador não decide o resultado salvo. Uma alteração no funil invalida versões públicas que já estavam abertas, pedindo novo preenchimento.

As definições usam um objeto versionado em `forms.fields_json`; listas JSON antigas continuam sendo lidas como formulários de página única, sem alterar leads anteriores. O resultado novo é uma resposta reservada `_flow_outcome` em `values_json`, mantendo os consumidores existentes. Configurações/regras presentes no formulário público não são informações confidenciais: não inclua segredos nas perguntas ou condições.

O editor usa um único campo JSON para não depender de `max_input_vars` ao salvar muitas perguntas. O limite total de requisição permanece em 200 KB; o editor verifica o tamanho codificado antes de enviar. JavaScript é necessário para editar o funil e para a experiência de uma pergunta por vez; sem ele, a página pública exibe as perguntas juntas e valida o caminho no servidor.

## Operação e proteção

- Formulários: até 100 perguntas, até 20 condições por pergunta e seleção com até 50 opções, respeitando o tamanho total. É possível reordenar/remover perguntas e pausar o formulário sem excluir leads antigos.
- Campos são JSON no MySQL; cada lead guarda uma cópia dos títulos/valores e do texto aceito. Editar um formulário não reescreve respostas antigas.
- Consentimento guarda data/hora em UTC, exibidas no fuso `America/Sao_Paulo` (configurável), texto e endereço da política apresentada.
- Honeypot e limites locais por conexão (20 tentativas/hora), além de CSRF e tokens de submissão vinculados à sessão.
- Login limitado por conexão e por e-mail; sessão renovada após login, 30 minutos de inatividade e duração absoluta máxima de 8 horas. Trocar a senha invalida as sessões anteriores na próxima requisição.
- `password_hash`/`password_verify`, prepared statements, escape HTML, cabeçalhos de segurança, CSV protegido contra fórmulas e sem cache nas páginas dinâmicas.
- A política incluída precisa refletir a operação real, inclusive atendimento aos titulares e retenção. É um texto inicial, não uma garantia de conformidade jurídica. Revise-o antes de receber dados reais.
- O prazo da política **não apaga leads automaticamente**. O painel tem exclusão individual confirmada; mantenha uma rotina de revisão e trate também e-mails, exportações e backups.
- O lead é salvo antes da tentativa SMTP. Falhas são visíveis no painel; use **Reenviar notificação**. Um timeout após aceitação pelo SMTP pode tornar necessária a conferência antes de reenviar para evitar e-mail duplicado.
- A tela de confirmação prova que o banco recebeu o lead, não que a mensagem chegou à caixa de entrada. SPF, DKIM e entregabilidade dependem da hospedagem.
- Nenhum envio contém arquivos anexos, campos HTML executáveis ou respostas inseridas automaticamente na mensagem do WhatsApp.

Comandos opcionais no Terminal:

```sh
# Alterar uma senha sem gravá-la no histórico de comandos:
php /home/USUARIO/badon-app/console.php admin:password SEU_EMAIL

# Tentar entregar até 50 notificações pendentes/com falha:
php /home/USUARIO/badon-app/console.php mail:retry

# Apagar apenas contadores antiabuso com mais de 48 horas (não apaga leads):
php /home/USUARIO/badon-app/console.php security:cleanup
```

O último comando pode ser agendado diariamente no Cron do cPanel.
Guarde backups do MySQL e do arquivo privado conforme a política de retenção.
Backups das regras antigas ficam em `public_html/.htaccess.badon-backup-*`.

## Desenvolvimento e verificação

O projeto não precisa de build front-end. Não faça deploy de `tests/`, `config.example.php` ou desta documentação no diretório público.

```sh
php tests/domain.php
php tests/flow.php
node tests/flow-engine.mjs
node tests/integration.mjs
# Opcional no macOS, com o Apache do sistema:
node tests/apache.mjs
```

O teste integrado precisa de PHP CLI, Node e MariaDB local; variáveis opcionais `PHP_BIN` e `MARIADB_BIN` ajustam os caminhos. Ele cria conta, banco, portas e credenciais descartáveis em `/tmp/badon-forms-test-*`, testa o fluxo HTTP contra PHP e um SMTP falso local, encerra os processos e mantém os arquivos para diagnóstico. Não envia e-mail externo nem acessa o banco de produção.

São testados deploy repetido, preservação de configuração e páginas estáticas, migração, hash de senha, login/CSRF, campos JSON, consentimento, honeypot, duplicidade, SMTP/Reply-To, falha/reenvio, filtro/CSV, escape de HTML, mensagem do WhatsApp, pausa do formulário, invalidação de sessão após troca de senha, cookie Secure e limites de acesso. O teste separado de Apache verifica o rewrite real para `/f/{slug}`, as rotas existentes e o 404. Os testes locais não substituem a validação da versão PHP, SMTP, HTTPS e regras Apache da hospedagem real.

## Referências técnicas

- [PHPMailer oficial](https://github.com/PHPMailer/PHPMailer/tree/v7.1.1)
- [Segurança de sessões PHP](https://www.php.net/manual/en/session.security.ini.php)
- [PDO prepared statements](https://www.php.net/manual/en/pdo.prepared-statements.php)
