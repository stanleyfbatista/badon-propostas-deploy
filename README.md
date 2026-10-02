# Bādon Forms — React + PHP/MySQL na hospedagem atual

## Novo painel: atualização de outubro/2026

O painel React fica em **`/admin/studio/`**. O login existente da Bādon continua válido e tem papel de agência. Os clientes entram por convite e têm contas separadas, sem acesso ao painel global antigo. O site institucional e as URLs públicas dos formulários permanecem iguais.

### Atualizar uma instalação existente

1. Faça backup do banco pelo cPanel/phpMyAdmin e dos arquivos da aplicação antes de atualizar. Não compartilhe o backup: ele contém respostas e hashes de senha.
2. No Git Version Control, use **Update from Remote** e depois **Deploy HEAD Commit**. O build React já está em `public/studio-assets/`; não instale Node na hospedagem.
3. No Terminal do cPanel, execute **uma vez** (pode repetir com segurança):

   ```sh
   php /home/produ7943464/badon-app/console.php studio:migrate
   ```

   Para outra conta, substitua apenas o nome da conta no caminho. São criadas sete tabelas `bf_*`; não é necessário ALTER. Os formulários existentes são associados ao espaço Bādon, com rascunhos iniciais copiados. A versão pública e os leads existentes não são sobrescritos. Se a migração falhar, o novo painel não fica disponível; os formulários anteriores continuam independentes.
4. Abra **https://produtorabadon.com/admin/studio/** e use seu e-mail/senha atuais.
5. Crie um formulário de teste, adicione perguntas, **Salve o rascunho** e depois **Publique**. Abra o link numa janela separada. Confira resposta, consentimento, e-mail recebido, CSV e WhatsApp. Teste também um convite com um e-mail de cliente antes de liberar acessos reais.

O `config.php` privado e o roteamento de e-mail Google Workspace **não precisam mudar**. A versão nova requer PHP **8.2+**, já confirmado nesta conta, e `curl` caso use webhooks. Não há Supabase, assinatura nova, CDN, servidor Node em produção ou chamada a serviço de formulário externo.

### Tarefas e Meu dia — primeira etapa da central de gestão

Esta etapa acrescenta tarefas persistentes no MySQL existente; não instala outro serviço e não altera SMTP, Cron ou apontamentos DNS. Google Agenda e projetos completos ficam para etapas posteriores.

1. Faça um backup atualizado do banco.
2. No cPanel, use **Update from Remote → Deploy HEAD Commit**.
3. No **Terminal** (não no Cron), execute:

   ```sh
   /usr/local/bin/php /home/produ7943464/badon-app/console.php tasks:migrate
   ```

4. Recarregue **https://forms.produtorabadon.com/painel** e abra **Tarefas** ou **Meu dia**.

A migração exige o CRM já preparado, cria somente `bf_tasks` e `bf_task_events`, pode ser repetida e não apaga nem importa dados. Antes de executá-la, os menus novos exibem a orientação de ativação; as outras áreas continuam disponíveis.

- **Tarefas:** título, descrição, prazo por data, prioridade, responsável, etapas A fazer/Em andamento/Concluída, até 50 itens de checklist e comentários. Há lista, quadro por etapa, busca, filtros e opção Minhas tarefas. Abrir o cartão permite editar a etapa; marcar o botão de conclusão conclui/reabre sem apagar o checklist.
- Cada tarefa pertence a um espaço de trabalho. O vínculo opcional com uma oportunidade conecta a tarefa ao contato/empresa do CRM daquele mesmo espaço; o cartão abre os detalhes do CRM. Nesta etapa não há cadastro separado de projetos nem automatização de tarefas ao fechar uma venda.
- **Particular** significa visível no aplicativo apenas para quem criou a tarefa, inclusive diante de administradores da agência. Não é criptografia contra o administrador do banco/servidor. A tarefa particular é atribuída ao criador. **Equipe** permite consulta aos membros do espaço, inclusive leitores; agência, administradores e editores podem alterar. Só o criador pode mudar a visibilidade. O vínculo com uma oportunidade não publica os comentários particulares no CRM.
- Leitores não criam/alteram/comentam/arquivam tarefas. Todo acesso exige autenticação e participação no espaço; ser responsável não concede acesso novo. Revogação de acesso também bloqueia as tarefas particulares desse espaço.
- **Meu dia** considera somente tarefas atribuídas à conta atual, não arquivadas e não concluídas, vencidas, de hoje ou sem prazo. Tarefas futuras continuam em Tarefas. O dia de referência é o do dispositivo; prazos são datas sem horário, evitando deslocamento de dia por fuso.
- No mesmo espaço, Meu dia mostra até 20 agendamentos do CRM de hoje ou atrasados atribuídos à pessoa e até 20 oportunidades abertas sem contato registrado há mais de sete dias. Oportunidades fechadas/desqualificadas/falsas ficam fora desses resumos. Horários do CRM continuam armazenados em UTC e exibidos no fuso do dispositivo, inclusive em mudanças de horário de verão.
- **Arquivar** é reversível pelo filtro Arquivadas; não exclui a tarefa nem o histórico. Restaure antes de editar/comentar. Conclusão e reabertura mantêm o histórico. Edições simultâneas são recusadas com aviso; é necessário reabrir o registro atualizado.
- As listas têm 100 tarefas por página; métricas usam todos os resultados filtrados, enquanto contagens de colunas referem-se à página. A busca de oportunidades retorna até 30 resultados; refine pelo nome para localizar outras. O detalhe mostra os 100 eventos mais recentes, sem excluir eventos anteriores do banco.
- Preferência de aparência do perfil também se aplica a Tarefas e Meu dia. Não há sincronização Google, lembretes por e-mail, notificações push, recorrência ou anexos nesta entrega. Mantenha o Cron de e-mails pausado até a liberação da TurboCloud.

Verificação: `npm test` cobre migração repetida, autorização inclusive contra acesso da agência a tarefas particulares, CSRF, vínculos entre espaços, checklist, conflitos, arquivo/restauração, comentários, paginação, componentes e limites do dia em quatro fusos. Nenhuma mensagem externa é enviada pelos testes.

### CRM, agendamentos e perfil — outubro/2026

Após fazer backup do banco e usar **Update from Remote → Deploy HEAD Commit** no cPanel, execute no Terminal:

```sh
/usr/local/bin/php /home/produ7943464/badon-app/console.php crm:migrate
```

Requer a migração anterior `studio:migrate`. Cria três tabelas adicionais e inclui as respostas existentes dos formulários associados aos espaços. É repetível: não duplica oportunidades nem reinicia etapas já alteradas. Não modifica as respostas originais, não envia e-mails e não precisa de Cron. Recarregue **https://forms.produtorabadon.com/painel** depois da migração. Antes dela, o painel informa como ativar as áreas novas e os formulários continuam recebendo respostas.

- **CRM:** Kanban com nove etapas fixas — Novo lead, Qualificado, Agendado, No show, Aperto de mão, Follow-up, Fechado, Desqualificado e Lead falso. Movimente por arrasto ou pelo seletor acessível em cada cartão; também há visualização em lista.
- Cada envio confirmado cria uma oportunidade no espaço do formulário, inclusive encerramentos condicionais. Repetir a mesma requisição não duplica; respostas distintas da mesma pessoa são oportunidades distintas. Todas entram em Novo lead, sem qualificação automática pelas respostas nesta versão.
- O nome e telefone usam os campos dos tipos Nome e Telefone; e-mail usa o contato registrado na resposta. Perguntas genéricas de texto não são adivinhadas. Respostas antigas sem esses campos recebem um nome provisório e continuam disponíveis integralmente no detalhe.
- **Nova oportunidade:** cadastro manual de contato, empresa, documento opcional, valor, origem, etapa, responsável e observações. O detalhe mostra respostas originais e histórico de notas, contatos e mudanças. Edições simultâneas são detectadas para evitar sobrescrever o trabalho de outra pessoa.
- **Agendamentos:** uma próxima atividade por oportunidade, com data/hora no fuso do dispositivo e armazenamento em UTC. A agenda é uma lista cronológica, permite registrar conclusão no histórico e não envia lembretes. Não há integração com Google Agenda, WhatsApp ou agenda externa.
- Busca e filtros por etapa, responsável e período de criação. Até 100 oportunidades por página; as métricas e contagens consideram todos os resultados filtrados. A exportação CSV informa que exporta somente a página atual.
- Agência acessa todos os espaços; administradores/editores alteram o CRM do seu espaço; leitores consultam e exportam. Responsáveis precisam ter acesso ao espaço. Nenhuma conta ganha permissões novas por editar seu perfil.
- **Meu perfil:** nome, WhatsApp de contato, foto JPG/PNG/WebP de até 2 MB e 4096 pixels por lado, preferência claro/escuro nas áreas CRM/agenda/perfil e troca de senha com a senha atual. O editor de formulários mantém sua aparência atual e a prévia pública não muda. E-mail de login permanece somente leitura. Fotos ficam no banco, protegidas por autenticação e vínculo com o espaço; inclua o banco nos backups.
- Cada sócio deve usar sua própria conta. Nome/foto são pessoais e aparecem no cabeçalho e nos responsáveis das oportunidades. Trocar a senha mantém a sessão atual e invalida as outras sessões. O WhatsApp do perfil não ativa envio automático.

**E-mails continuam pausados operacionalmente:** não recrie o Cron de notificações enquanto a TurboCloud não confirmar a liberação da conta e a validação dos apontamentos. Convites e links mágicos são envios imediatos, independentes do Cron: evite acioná-los durante a suspensão. O CRM funciona sem qualquer envio de e-mail.

Verificação: `npm test` inclui banco/servidor HTTP locais, migração repetida, captura automática, permissões, conflitos de edição, agenda, perfil, foto privada e troca de senha. Os testes usam SMTP simulado e não enviam mensagens externas.

### Entregue nesta etapa

- React/Vite/TypeScript com três colunas: blocos, prévia e propriedades; layout adaptável a telas menores.
- Espaços por cliente, agência, administrador, editor e leitor; autorização no PHP em cada operação. Clientes nunca recebem credenciais MySQL.
- Login por senha, link mágico de 15 minutos e convites de 48 horas; tokens de uso único armazenados somente como hash, com limites por IP/e-mail.
- Pastas; criar, duplicar, pausar e ativar formulários. Cópias começam como rascunho.
- Rascunho e publicação separados, com revisão para detectar edições simultâneas. Salvar não altera a versão pública; publicar exige validação completa.
- Nome, e-mail, telefone, website, endereço, texto curto/longo, escolha única/múltipla, sim/não, dropdown, número e data. Boas-vindas e agradecimento; descrições, placeholder, texto do botão, obrigatoriedade, duplicação e reordenação por arrasto ou botões.
- Inserção de respostas anteriores no título via `@identificador`. O seletor de respostas anteriores insere a variável correta. No WhatsApp e no agradecimento a substituição é feita no servidor, após validação.
- Mapa visual React Flow na aba **Lógica**: perguntas conectadas, saídas condicionais, finais personalizados, zoom, minimapa e organização por arrasto. Regras existentes preservadas, com comparação, saltos para perguntas posteriores e encerramento antecipado no final padrão ou em um final específico.
- Tema com cores, três famílias de fontes locais, botões, progresso e imagem de fundo hospedada no próprio domínio. Nesta versão, a imagem é enviada pelo Gerenciador de Arquivos para `public_html/forms-media/`, não pelo editor.
- Capa sempre ativa em **Conteúdo → Boas-vindas**, com imagem/vídeo opcional enviado pelo painel, quatro posições selecionadas por ícones, enquadramento, ponto focal, descrição acessível e texto do botão. A imagem de fundo geral do tema continua separada da mídia da capa.
- Rastreamento opcional de UTMs/gclid/fbclid e parâmetros personalizados; referrer sem query/fragmento. Dados são capturados ao abrir a página e não aceitos como campos ocultos arbitrários no POST.
- Respostas paginadas por formulário, detalhes, consentimento e exportação CSV. O papel de leitor pode consultar/exportar, mas não editar/publicar ou gerenciar equipe.
- Notificações para até dez destinatários por formulário via SMTP atual, em BCC. Se vazio, utiliza o destinatário padrão do config. A lista é copiada para o envio: retries não usam configurações posteriores.
- Webhook HTTPS com POST JSON, identificação de envio, bloqueio de IPs privados/especiais, DNS fixado por requisição, sem redirects, sem proxy e com timeout. Nunca é chamado pelo navegador.
- Honeypot, consentimento desmarcado, mínimo de 3–60 segundos, rate limit por IP e proteção contra envio duplicado. O botão WhatsApp segue disponível somente depois de um envio confirmado.

### Operação e limites

- Sessão expirada: respostas 401 em operações autenticadas ou 403 com `code=csrf_expired` abrem um aviso com **Voltar ao login**; erros de senha/permissão não são confundidos com expiração. O editor não descarta alterações automaticamente. A logo do cabeçalho e **Sair** voltam a `/entrar`, confirmando o descarte se o editor estiver aberto. A saída renova o CSRF por `boot` e faz POST protegido, inclusive para sessões já expiradas; falha de rede não é apresentada como saída concluída. Nenhuma gravação/upload é repetida automaticamente. Depois do deploy, recarregue abas antigas para carregar essa correção.
- O painel anterior permanece como acesso **da agência** a leads e reenvio SMTP. Formulários associados ao novo editor não podem ser sobrescritos pelo editor antigo. Formulários novos devem ser criados no novo painel.
- Um formulário novo só aceita respostas após publicar. **Publicar ativa** o formulário. Pausar desabilita novos envios sem apagar respostas. Alterar o slug na publicação muda o link; avise quem compartilha o formulário.
- Uma publicação que modifica o título/perguntas invalida tickets antigos com uma mensagem para recarregar. Salvar rascunhos não os invalida.
- Convites, link mágico e notificações usam o SMTP privado existente. Entrega real, SPF/DKIM e spam precisam ser conferidos na hospedagem; os testes automatizados usam SMTP falso local. Não mude o MX do Google para testar o envio.
- A equipe mostra convites pendentes/expirados, com reenvio e cancelamento. O envio do convite é imediato, separado do Cron dos leads. O resultado distingue aceitação pelo servidor SMTP de falha; aceitação não garante entrega à caixa de entrada. Mesmo em falha, o administrador recebe um link privado para compartilhar com a pessoa convidada. Esse link vale por 48 horas, funciona uma vez e concede acesso à conta indicada: não o publique. Reenviar invalida o link anterior. Listagens não revelam tokens e o banco guarda somente o hash.
- Falhas de SMTP/webhook não descartam leads nem bloqueiam a confirmação. O envio público apenas salva e confirma: as notificações ficam na fila do MySQL. **Configure o Cron obrigatório de notificações descrito abaixo.** O consumidor de webhook deve deduplicar pelo cabeçalho `Idempotency-Key`.
- O webhook compartilha dados pessoais com o destino escolhido pelo editor: configure somente destinos autorizados. A validação é uma proteção de rede, não uma verificação de confiança do destinatário.
- A retenção de 180 dias informada no config **não exclui respostas automaticamente**; continua sendo necessária uma rotina operacional de descarte. Revise a política com os responsáveis pelos espaços antes do uso real com clientes.
- Ainda fora desta etapa: painel interno de abandono/insights, CAPI, Google/TikTok/GTM, embed/QR, automações e API de WhatsApp (Fases 2/3); editor rico, biblioteca de mídias e upload de arquivos pelos respondentes também não foram adicionados.

### Pixel da Meta por formulário

Em **Configurações → Pixel da Meta**, informe somente o ID numérico do Pixel/conjunto de dados, marque **Ativar Pixel neste formulário**, salve e publique. O recurso vem desativado, não aceita scripts arbitrários e não requer senha/token da Meta. Rascunhos não alteram a medição publicada. Para desativar, desmarque e publique novamente; abas já abertas ainda usam a configuração com que foram carregadas. Não há migração de banco, alteração no Cron ou CAPI.

| Evento | Quando ocorre |
| --- | --- |
| PageView | Abertura do formulário, depois da autorização de medição |
| BadonFormStart | Clique em Começar |
| BadonFormStep | Pergunta exibida: parâmetros numéricos step_index e question_total |
| BadonFormReview | Chegada à confirmação final |
| Lead | Resposta realmente salva, inclusive encerramentos condicionais |

Todos os eventos levam form_id, sem títulos, textos das perguntas, alternativas, respostas ou dados de contato nos parâmetros. Não há correspondência avançada; a configuração automática do SDK é desativada. A Meta ainda recebe dados técnicos, como IP, URL pública, navegador e identificadores/cookies de publicidade. O código remove query/fragmento arbitrários antes de carregar o SDK, preservando somente fbclid com formato restrito; a captura de UTMs no lead continua no servidor, separada do Pixel.

Antes de carregar o SDK, o visitante escolhe aceitar ou recusar. A escolha é uma preferência da sessão da aba, separada por formulário/Pixel, alterável na própria página. Sem autorização, com sinal Global Privacy Control, sem JavaScript ou com bloqueio de publicidade, não há medição deste recurso; preencher continua possível. Etapas anteriores à autorização não são reconstruídas. O consentimento para tratamento da solicitação continua separado e obrigatório no envio.

O envio com medição autorizada usa uma resposta JSON privada do servidor para confirmar o registro e só então disparar Lead, ainda na página pública. Nunca carregamos o Pixel na URL privada do recibo. Repetições do mesmo envio mantêm o mesmo eventID; o navegador evita reemitir o Lead na sessão. O envio não aguarda a Meta e um bloqueio do SDK não invalida o lead. Fechamento da aba, falha de rede e bloqueadores podem impedir a chegada do evento: é medição pelo navegador, não garantia de entrega nem contagem completa de visitas.

Verifique os eventos em **Gerenciador de Eventos → Testar eventos**, aceitando a medição no formulário público. Recusar deve impedir disparos. Para analisar uma pergunta específica, use form_id e step_index; no modo legado com todas as perguntas juntas, etapas visíveis são registradas juntas. A chegada à confirmação não é conversão; Lead só ocorre depois de salvar. As etapas se referem à numeração das perguntas daquela versão publicada.

O ID não concede acesso à conta de anúncios. O responsável precisa ter as permissões adequadas na Meta e configurar ali as conversões/colunas/campanhas que pretende usar. Não instale outro Pixel automático na mesma página. O projeto não muda campanhas, públicos nem permissões externas. Revise a política e as configurações da conta antes do uso com clientes, especialmente em formulários com contexto sensível.

Referências de integração: [SDK oficial da Meta](https://connect.facebook.net/en_US/fbevents.js) e [documentação do Pixel](https://developers.facebook.com/docs/meta-pixel/). Testes locais usam uma simulação, sem chamadas à Meta; o recebimento no Pixel real depende de teste na conta do responsável.

### Capa com imagem ou vídeo

1. Abra **Conteúdo → Boas-vindas**. A capa está sempre ativa: ao abrir o link público, o visitante vê a apresentação e clica em **Começar** para responder. Isso também se aplica a formulários antigos com capa desativada, sem regravar sua publicação nem invalidar tickets. Sem JavaScript, permanece a alternativa acessível com todas as perguntas.
2. Edite título, descrição e texto do botão. Clique ou arraste um arquivo na área de envio: JPG, PNG ou WebP para imagem; MP4 ou WebM para vídeo. Vídeos mantêm controles, sem autoplay, e pausam ao começar as perguntas. Não há conversão de codecs no servidor: use um vídeo compatível com os navegadores dos visitantes, preferencialmente MP4/H.264.
3. Escolha pelos quatro botões com ícones: esquerda, direita, acima do texto ou fundo. O botão azul indica o layout escolhido. Em telas estreitas, os layouts laterais se tornam verticais, com mídia acima. No fundo há contraste escuro atrás do texto; os controles do vídeo ficam livres na base.
4. Use **Preencher** ou **Mostrar inteiro** e ajuste o ponto focal horizontal/vertical (0–100%). A prévia e a tela pública compartilham o CSS de posicionamento. O painel informa dimensões sugeridas, não obrigatórias.
5. **Usar sem mídia** remove a associação no rascunho; não exclui o arquivo do disco nem altera uma publicação existente. Salve e publique para atualizar o link público.

O upload usa `/api/studio-media.php`, com sessão, CSRF, autorização de editor/agência, validação da extensão/MIME real, dimensões e tamanho. Arquivos recebem nomes aleatórios em `public_html/forms-media/uploads/{workspace}/`, sem nomes originais, separados por espaço. São ativos **públicos por URL**, inclusive antes de publicar; não envie arquivos confidenciais. O diretório não permite listagem, scripts nem arquivos fora da lista de formatos. Não há upload anônimo.

Limites: imagem até 5 MiB e vídeo até 20 MiB, reduzidos automaticamente conforme `upload_max_filesize` e `post_max_size` do PHP. O painel mostra o limite efetivo. A extensão **Fileinfo** e `file_uploads` precisam estar habilitadas. Para arquivos maiores que o limite atual do PHP, a agência pode ajustar esses valores no cPanel (por exemplo, upload 20M e POST 24M); o aplicativo não altera o PHP da conta. Há limite de 30 tentativas por usuário/hora e 250 MiB ou 200 arquivos por espaço, incluindo uploads antigos não usados.

O deploy preserva os arquivos enviados, que ficam fora do Git; apenas a proteção `.htaccess` do diretório faz parte do repositório. Inclua `public_html/forms-media/uploads/` nos backups junto do banco/config. Não há exclusão automática: revise arquivos antigos pelo gerenciador do cPanel, conferindo antes se algum rascunho ou publicação os utiliza. Não remova a proteção `.htaccess`.

Esta atualização não exige migração nem novas credenciais. Use **Update from Remote + Deploy HEAD Commit** e recarregue o painel. Teste uma imagem e um vídeo na hospedagem antes de disponibilizar a capa aos clientes.

### Usar o mapa de lógica

1. Crie as perguntas em **Conteúdo** e abra **Lógica**. A lista à esquerda define a ordem inicial das perguntas.
2. Clique numa pergunta do mapa e use **Adicionar condição** nas propriedades. Por exemplo, em uma pergunta do tipo Número: **Menor que → 1000 → Encerrar formulário**. Configure a mensagem do encerramento e se haverá WhatsApp após o envio.
3. Para perguntas de escolha única/lista/sim-não, selecione a alternativa no campo Resposta. Múltipla escolha também permite condições: **Contém esta opção** ou **Não contém esta opção**, comparadas com cada alternativa inteira (inclusive moedas e vírgulas). Quando várias condições corresponderem, vale a primeira da lista. Resposta vazia não aciona nenhuma condição, inclusive “não contém”; se obrigatória, exige seleção.
4. Arraste uma saída azul da condição para uma pergunta posterior ou um final. A saída inferior é o caminho padrão (caso contrário). Também é possível escolher o destino sem arrastar, usando **Ir para**. Conectar um final personalizado existente copia sua mensagem para a saída nova; cada saída tem seu próprio encerramento.
5. A primeira condição atendida vence. Use as setas nas condições para mudar sua prioridade. Voltar a perguntas anteriores não é permitido, para evitar ciclos. Se excluir/reordenar perguntas e um destino deixar de ser válido, o mapa avisa; corrija o destino antes de salvar.
6. Arrastar blocos muda somente sua posição visual. **Organizar mapa** restaura a disposição automática sem mudar regras. As posições são salvas no rascunho, não no formulário público.

Exemplo de filtro de investimento: para faixas, use **Escolha única → Igual a → Menos de R$ 1.000,00 → Encerrar formulário**. Se mantiver Múltipla escolha, use **Contém esta opção** no lugar de “Igual a”. Para valor digitado no tipo Número, use **Menor que → 1000 → Encerrar formulário**. As perguntas seguintes são puladas; a confirmação final e o consentimento continuam necessários antes de registrar a resposta. Salve o rascunho e publique para atualizar o link público. Nenhuma migração de banco é necessária.
7. Clique em **Salvar rascunho**, depois em **Publicar**. Encerrar um caminho leva à confirmação de envio com consentimento, sem exigir respostas das perguntas puladas. WhatsApp só aparece após o envio confirmado.

Quem já migrou para o painel React precisa apenas de **Update from Remote + Deploy HEAD Commit** e recarregar o painel. Esta atualização do mapa não exige novas tabelas, migração, credenciais ou alteração do site institucional.

### Desenvolvimento e verificação

```sh
npm ci
npm run build
php tests/domain.php
php tests/flow.php
php tests/studio-domain.php
php tests/media.php
node tests/welcome-preview.mjs
node tests/flow-engine.mjs
node tests/logic-model.mjs
node tests/integration.mjs
node tests/apache.mjs
```

O build gera somente `public/studio-assets/`, com manifest lido pelo PHP e nomes com hash. Commitar fonte, lockfile e build juntos antes do cPanel. Credenciais nunca entram no front. O PHP/MySQL continua sendo a autoridade para sessões, permissões, publicação e validação. Usamos CSS próprio para preservar a identidade atual; não dependemos de Tailwind/shadcn em runtime.

O schema v2 existente (`fields`, regras e encerramentos) é mantido por compatibilidade, em vez de converter destrutivamente todos os formulários ao exemplo `blocks` do documento. A tabela `bf_forms.draft_json` guarda o documento do editor, incluindo `layout` com posições validadas dos nós; `forms.fields_json` permanece o snapshot publicado lido por `/f/{slug}`, sem posições. O destino `end:default` encerra antecipadamente usando a mensagem final padrão; `finish` continua sendo o encerramento personalizado. `bf_forms.published_settings` guarda apenas configurações privadas publicadas. `bf_deliveries` guarda configurações por envio para retry. Consultas de formulário/lead no novo painel passam sempre pela associação ao workspace.

Testes novos cobrem migração repetível sem alteração do JSON publicado, isolamento entre espaços (incluindo detalhe/CSV/duplicação), leitor/editor/agência, revogação de acesso, token de uso único, publicação separada, conflitos de revisão, novos campos, rastreamento, destinatário SMTP por formulário e antifraude. Os testes de mídia verificam upload HTTP real de imagem/vídeo, autorização/CSRF, falsificação de extensão, limites, persistência na publicação/duplicação/deploy, componente React e Range/Content-Type/proteções no Apache. A integração gera um vídeo mínimo com FFmpeg local (`FFMPEG_BIN` opcional); a hospedagem não precisa de FFmpeg. Não substituem teste visual no navegador/iPhone nem teste de entrega real de webhook/SMTP na hospedagem.

---

## Instalação base e painel anterior

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

- Selecione PHP **8.2 ou superior**, preferencialmente uma versão 8.x ainda suportada, no MultiPHP Manager para `produtorabadon.com`.
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
- O lead e sua fila são salvos antes da confirmação, sem conexão SMTP/webhook na requisição pública. Falhas são visíveis no painel; **Tentar novamente** recoloca a notificação na fila, sem bloquear o painel. A operação exige permissão de edição e não reenvia notificações já entregues ou em processamento recente. Um timeout após aceitação pelo SMTP pode tornar necessária a conferência da caixa de entrada antes de tentar de novo, para evitar e-mail duplicado.
- A tela de confirmação prova que o banco recebeu o lead, não que a mensagem chegou à caixa de entrada. SPF, DKIM e entregabilidade dependem da hospedagem.
- Nenhum envio contém arquivos anexos, campos HTML executáveis ou respostas inseridas automaticamente na mensagem do WhatsApp.

### Tarefa obrigatória de notificações no cPanel

Depois de **Update from Remote → Deploy HEAD Commit**, abra **Trabalhos Cron** e crie uma tarefa a cada minuto (`* * * * *`). No Terminal, `command -v php` informa o executável; use o caminho absoluto retornado no comando da tarefa:

```sh
/CAMINHO/DO/PHP /home/USUARIO/badon-app/console.php notifications:work
```

Não cole os placeholders literalmente. Nesta conta, substitua `USUARIO` por `produ7943464`. O mesmo comando pode ser executado no Terminal com `php` para testar uma rodada e recuperar a notificação antiga. **Sem Cron, os leads e confirmações continuam funcionando, mas as notificações permanecem na fila.** Não é necessária migração nova, alteração de credenciais, serviço externo ou acesso público ao worker.

- Uma trava privada impede execuções simultâneas; o claim no banco protege cada notificação.
- Cada rodada busca até 10 e-mails e 10 webhooks e para de iniciar trabalhos após 50 segundos (um trabalho iniciado pode terminar depois). Ajustes do provedor ainda podem interromper o processo; a fila permanece no banco.
- Falhas automáticas aguardam 15 minutos entre tentativas, até cinco tentativas. Envios interrompidos há mais de 10 minutos voltam a ser elegíveis. O painel permite iniciar novo ciclo manual.
- O SMTP tem limite de 10 segundos de conexão/leitura e de espera por comando, aplicado ao objeto SMTP correto; isso não é um limite global de toda a conversa SMTP.
- Mantenha `encryption => 'smtps'` no config privado para TLS implícito (normalmente porta 465). O código converte esse modo para `PHPMailer::ENCRYPTION_SMTPS` (`ssl` internamente). `tls` usa STARTTLS. A validação de certificados permanece ativa; não mude o config para `ssl` nem desative a validação para contornar uma falha de conexão. O teste `node tests/smtp-tls.mjs` cobre um servidor TLS local e a rejeição de certificado não confiável, sem envio externo.
- E-mails aceitos pelo SMTP não são enviados novamente pelo worker. Aceitação não garante entrega na caixa de entrada.
- Diagnósticos ficam em `/home/USUARIO/badon-config/incidents.log`, fora do site/Git, com permissão `0600`. Contêm referência, etapa, classe e local da falha, sem senhas, respostas, SQL ou transcrição SMTP. Revise/rotacione esse arquivo periodicamente. Os registros antigos anteriores à atualização não são recuperados automaticamente.

Comandos opcionais no Terminal:

```sh
# Alterar uma senha sem gravá-la no histórico de comandos:
php /home/USUARIO/badon-app/console.php admin:password SEU_EMAIL

# Tentar até 10 notificações pendentes/com falha (manual, ignora backoff e limite de tentativas):
php /home/USUARIO/badon-app/console.php mail:retry

# Apagar apenas contadores antiabuso com mais de 48 horas (não apaga leads):
php /home/USUARIO/badon-app/console.php security:cleanup
```

O último comando pode ser agendado diariamente no Cron do cPanel.
Guarde backups do MySQL e do arquivo privado conforme a política de retenção.
Backups das regras antigas ficam em `public_html/.htaccess.badon-backup-*`.

## Desenvolvimento e verificação

### Subdomínio Bādon Forms (ativação em duas etapas)

A atualização prepara `/entrar` e `/painel`, sem mudar automaticamente a configuração privada.
O painel usa `/entrar` sem autenticação e `/painel` após o login; as permissões continuam verificadas pela API.
Convites e links de acesso usam `base_url` + `/entrar#token=…`. Links antigos `/admin/studio/`
redirecionam para `/entrar`; o fragmento do convite é preservado pelo navegador e consumido pelo editor.

1. Faça o deploy normal no cPanel (**Update from Remote → Deploy HEAD Commit**).
2. Em **Domínios → Criar novo domínio**, cadastre `forms.produtorabadon.com` usando a
   **mesma raiz de documentos** `/home/produ7943464/public_html` do site atual.
   Não aponte para `admin/studio`, `badon-app` nem `badon-config`; não copie o banco ou credenciais.
   Este projeto depende dessa raiz compartilhada: a regra de host abre o Studio na raiz de `forms.`,
   enquanto `produtorabadon.com/` mantém a página original. Outras páginas públicas continuam acessíveis
   pela raiz compartilhada; isto não constitui isolamento entre aplicações.
3. Confira o DNS de `forms` no provedor autoritativo e o certificado **SSL/TLS Status / AutoSSL**.
   Se o DNS estiver fora do cPanel, crie o registro para o servidor correto fornecido pela hospedagem.
   Não altere os registros MX, SPF ou DKIM do Google Workspace nem o DNS do domínio principal.
4. Antes de ativar redirecionamentos, teste **diretamente em HTTPS**
   `https://forms.produtorabadon.com/entrar`, login, `/painel`, um formulário público, mídia e envio.
5. Somente após validar DNS e HTTPS, faça um backup privado de `badon-config/config.php` e altere
   **apenas** `base_url` para `https://forms.produtorabadon.com` (sem barra final).
   Não altere `app_key`, banco, SMTP, senhas ou Cron. O deploy nunca sobrescreve esse arquivo.

Com `base_url` novo em produção, navegações GET/HEAD dos hosts antigos para `/f/{slug}`,
`/entrar`, `/painel` e `/admin/studio/` recebem redirecionamento temporário 302 para o subdomínio,
preservando os parâmetros de campanha. POSTs, APIs e recibos de confirmação não mudam de host:
isso preserva envios já iniciados e suas sessões. A página inicial do site, propostas e painel PHP legado
não são redirecionados. Será necessário entrar novamente no subdomínio: cookies de sessão não são
compartilhados com o domínio principal. O consentimento do Pixel também precisa ser dado no novo domínio.

Valide convites, recuperação por link, uploads, notificações e Pixel (**Testar eventos** e eventuais
permissões de tráfego do novo host na Meta). Sem migração de banco. Para reverter a ativação,
restaure o `base_url` anterior; redirecionamentos 302 não ficam fixados como os permanentes.
Não remova o subdomínio enquanto houver sessões, envios ou convites em uso nele.

Referência: [cPanel — domínio com raiz compartilhada](https://support.cpanel.net/hc/en-us/articles/360055638573-How-can-I-create-a-domain-that-uses-the-same-content-as-an-existing-domain).

O painel PHP anterior não precisa de build; o painel React usa `npm run build` localmente e os arquivos gerados entram no Git. Não faça deploy de `tests/`, `config.example.php` ou desta documentação no diretório público.

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
