# Google — Bādon Flow

Integração direta no PHP/cPanel existente, sem mudança de hospedagem.

## Ativação

1. Cliente OAuth Web no Google Cloud, callback exato `https://app.produtorabadon.com/api/google-callback.php`.
2. Ativar Google Calendar API após aceite dos termos pelo responsável. Configurar consentimento com `openid`, `email` e `https://www.googleapis.com/auth/calendar.app.created`.
3. Em modo de teste, adicionar somente as contas autorizadas à lista de teste do Google. A permissão externa não substitui o controle de acesso do Flow.
4. Guardar `client_id`, `client_secret`, `redirect_uri`, `token_key` (32 bytes aleatórios em base64) e `enabled` no arquivo privado `badon-config/google-oauth.php`, fora do repositório e da raiz pública, modo 0600. Não copiar credenciais para logs, comandos ou frontend.
5. Backup de banco antes de `php badon-app/console.php google:migrate`. Migração aditiva, sem envio de dados.
6. Ativar `enabled` somente após testes e configurar Cron a cada 5 minutos: `php /home/produ7943464/badon-app/console.php google:work`. Preservar os Cron existentes.
7. Usuário entra por senha ou link de e-mail, abre Configurações e vincula o Google (login). Depois conecta Google Agenda, com consentimento separado. Nenhuma conta desconhecida é criada; vínculo exige autenticação local recente (10 minutos).

## Comportamento e limites

- Login valida assinatura RS256 com certificados públicos obtidos exclusivamente do Google via TLS, emissor, audiência, expiração, nonce, e-mail verificado; state de sessão de uso único e PKCE S256. Identidade vinculada por `sub`, nunca por coincidência de e-mail.
- Link de login e acesso à agenda são independentes. Google login não libera espaços adicionais e membro sem vínculo em espaço não pode entrar pelo Google.
- Refresh token criptografado com AES-256-GCM e actor como AAD. Chave fica no arquivo privado; backup de banco não contém a chave.
- Somente demandas atribuídas ao usuário, abertas, com prazo e visíveis nos espaços permitidos. Demandas particulares respeitam autoria. Revogação de espaço remove os eventos exportados na próxima execução; remoção completa do acesso local interrompe a integração.
- Uma agenda secundária Bādon Flow; não ler agenda pessoal nem Gmail. Exportação contém título, prazo, ID técnico e link genérico para o painel — sem briefing, descrição da tarefa, comentários ou anexos. Sem convidados/envio de convites.
- Datas da demanda viram marcadores de prazo às 09:00 em America/Sao_Paulo, duração 15 minutos, sem bloquear disponibilidade. Lembretes popup no horário e 1 dia antes; dependem da sincronização e permissão de notificações do dispositivo. Não são horários de reuniões.
- Sincronização unidirecional, a cada 5 minutos. Alterações diretas no Google não retornam ao Flow; alterações locais atualizam o evento. Conclusão, arquivamento, remoção de prazo/responsável/acesso retiram o evento exportado.
- IDs reservados antes da inserção impedem duplicações em novas tentativas após falha. Locks por conexão impedem concorrência. Até 40 operações por passagem. Falhas na criação inicial de calendário com resultado incerto pausam para revisão (`calendar_setup`), sem criar outro calendário automaticamente.
- Desconectar revoga token quando existente e apaga o vínculo local. A agenda e eventos já exportados permanecem no Google; usuário é avisado para removê-los lá caso queira encerrar lembretes. Backup pode reter dados conforme política da hospedagem.
- Em OAuth externo no modo Testing, autorizações de calendário normalmente expiram após 7 dias. Publicar/validar OAuth requer etapa própria no Google; não prometer sincronização permanente antes disso.
- Recomenda-se configurar logs da hospedagem para omitir a query string do callback OAuth. O app não registra tokens, códigos nem mensagens brutas do Google.

## Verificação

`npm run build` e `npm test`. `tests/google-integration.php` é executado no banco descartável dos testes, com transporte Google falso exclusivo de CLI, chaves RSA de teste e configuração descartável. Nunca usa a credencial de produção nem envia eventos externos. Abrange assinatura/claims, state/replay, escopos, sessão recente, vínculo e login restritos, criptografia, timeout/retry, atualização e remoção sem duplicação. Testes de Google real e entrega no celular exigem consentimento do titular e validação posterior.

Referências: https://developers.google.com/identity/openid-connect/openid-connect ; https://developers.google.com/identity/protocols/oauth2/web-server ; https://developers.google.com/workspace/calendar/api/auth
