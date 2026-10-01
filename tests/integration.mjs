// Testes locais: banco isolado e SMTP falso, sem envio externo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { studioTests } from './studio-integration.mjs';

const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const php = process.env.PHP_BIN || '/opt/homebrew/opt/php@8.4/bin/php';
const mysqlBin = process.env.MARIADB_BIN || '/opt/homebrew/opt/mariadb/bin';
const tmp = fs.mkdtempSync('/tmp/badon-forms-test-');
const socket = path.join(tmp, 'mysql.sock');
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { cwd: repo, encoding: 'utf8', ...options });
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)); }); });
const dbPort = await freePort(), httpPort = await freePort(), smtpPort = await freePort();
const base = 'http://127.0.0.1:' + httpPort;
const sql = query => run(path.join(mysqlBin, 'mariadb'), ['--no-defaults', '--socket=' + socket, '-u', 'root', '-N', '-B', '-e', query], { stdio: 'pipe' });
let dbProc, phpProc, smtp;
let rejectMail = false;
const messages = [];
const recipients = [];
const log = (text) => console.log('OK:', text);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(fn) { for (let i = 0; i < 80; i++) { try { if (await fn()) return; } catch {} await wait(100); } throw new Error('Service did not start'); }
function kill(proc) { if (proc && proc.exitCode === null) proc.kill('SIGTERM'); }

try {
  fs.mkdirSync(path.join(tmp, 'mysql'));
  run(path.join(mysqlBin, 'mariadb-install-db'), ['--no-defaults', '--datadir=' + path.join(tmp, 'mysql'), '--auth-root-authentication-method=normal', '--skip-test-db'], { stdio: 'ignore' });
  dbProc = spawn(path.join(mysqlBin, 'mariadbd'), ['--no-defaults', '--datadir=' + path.join(tmp, 'mysql'), '--socket=' + socket, '--pid-file=' + path.join(tmp, 'mysql.pid'), '--log-error=' + path.join(tmp, 'mysql.log'), '--bind-address=127.0.0.1', '--port=' + dbPort], { stdio: 'ignore' });
  await ready(() => sql('SELECT 1').trim() === '1');
  const dbPassword = randomBytes(20).toString('hex');
  sql("CREATE DATABASE badon_test CHARACTER SET utf8mb4; CREATE USER 'badon_test'@'127.0.0.1' IDENTIFIED BY '" + dbPassword + "'; GRANT ALL ON badon_test.* TO 'badon_test'@'127.0.0.1';");
  const account = path.join(tmp, 'account'); fs.mkdirSync(account); fs.mkdirSync(path.join(account, 'public_html'));
  const htaccess = '# cPanel handler preserved\nAddType text/plain .test\n# BEGIN BADON CUSTOM 404\nOld rule\n# END BADON CUSTOM 404\n# BEGIN WordPress\n# Keep this\n# END WordPress\n';
  fs.writeFileSync(path.join(account, 'public_html/.htaccess'), htaccess);
  fs.writeFileSync(path.join(account, 'public_html/unrelated.txt'), 'preserve');
  run('/bin/bash', ['deploy/deploy.sh'], { env: { ...process.env, BADON_ACCOUNT_DIR: account } });
  const firstRules = fs.readFileSync(path.join(account, 'public_html/.htaccess'), 'utf8');
  assert.ok(firstRules.includes('# cPanel handler preserved') && firstRules.includes('# Keep this'));
  assert.ok(firstRules.includes('f/index.php [END]') && !firstRules.includes('Old rule'));
  assert.ok(!fs.existsSync(path.join(account, 'public_html/app')));
  fs.mkdirSync(path.join(account, 'badon-config'), { mode: 0o700 });
  const config = `<?php return ['environment'=>'development','base_url'=>'${base}','timezone'=>'America/Sao_Paulo','app_key'=>'${randomBytes(32).toString('hex')}','whatsapp_number'=>'5511999999999','privacy_url'=>'/privacidade/','privacy'=>['controller'=>'Bādon','contact_email'=>'privacy@example.invalid','retention_days'=>180],'db'=>['host'=>'127.0.0.1','port'=>${dbPort},'name'=>'badon_test','user'=>'badon_test','password'=>'${dbPassword}'],'smtp'=>['host'=>'127.0.0.1','port'=>${smtpPort},'encryption'=>'none','username'=>'','password'=>'','from_email'=>'forms@example.invalid','from_name'=>'Bādon','to_email'=>'owner@example.invalid']];`;
  fs.writeFileSync(path.join(account, 'badon-config/config.php'), config, { mode: 0o600 });
  run('/bin/bash', ['deploy/deploy.sh'], { env: { ...process.env, BADON_ACCOUNT_DIR: account } });
  assert.equal(fs.readFileSync(path.join(account, 'badon-config/config.php'), 'utf8'), config);
  assert.equal(fs.readFileSync(path.join(account, 'public_html/.htaccess'), 'utf8'), firstRules);
  assert.equal(fs.readFileSync(path.join(account, 'public_html/unrelated.txt'), 'utf8'), 'preserve');
  for (const file of ['index.html', 'links/index.html', '404.html', 'propostas/dainese-a7k3/index.html', 'relatorios/carine-santana/plano-de-criativos/index.html']) {
    assert.deepEqual(fs.readFileSync(path.join(account, 'public_html', file)), fs.readFileSync(path.join(repo, 'public', file)));
  }
  log('deploy idempotente, credenciais privadas e páginas antigas preservadas');
  const cli = path.join(account, 'badon-app/console.php');
  run(php, [cli, 'migrate']); run(php, [cli, 'migrate']);
  const password = randomBytes(18).toString('hex');
  run(php, [cli, 'admin:create', 'admin@example.invalid'], { input: password + '\n', stdio: ['pipe', 'pipe', 'ignore'] });
  const storedHash = sql('SELECT password_hash FROM badon_test.admins').trim();
  assert.ok(storedHash.startsWith('$2y$') && storedHash !== password);
  log('migração MySQL compatível e senha armazenada com hash');
  smtp = net.createServer(client => {
    client.setEncoding('utf8'); client.write('220 localhost test SMTP\r\n');
    let buffer = '', dataMode = false, data = [];
    client.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const index = buffer.indexOf('\r\n'); const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (dataMode) {
          if (line === '.') { messages.push(data.join('\r\n')); data = []; dataMode = false; client.write('250 accepted\r\n'); }
          else data.push(line);
        } else if (/^(EHLO|HELO)/.test(line)) client.write('250-localhost\r\n250 8BITMIME\r\n');
        else if (/^RCPT/.test(line)) { recipients.push(line); client.write(rejectMail ? '550 rejected for testing\r\n' : '250 OK\r\n'); }
        else if (line === 'DATA') { dataMode = true; client.write('354 continue\r\n'); }
        else if (line === 'QUIT') client.end('221 bye\r\n');
        else client.write('250 OK\r\n');
      }
    });
  });
  await new Promise(resolve => smtp.listen(smtpPort, '127.0.0.1', resolve));
  phpProc = spawn(php, ['-S', '127.0.0.1:' + httpPort, '-t', path.join(account, 'public_html'), path.join(repo, 'tests/router.php')], { stdio: 'ignore' });
  await ready(async () => (await fetch(base + '/admin/')).status === 200);
  class Client {
    cookie = '';
    async req(url, data) {
      const response = await fetch(base + url, { method: data ? 'POST' : 'GET', redirect: 'manual', headers: { ...(this.cookie ? { Cookie: this.cookie } : {}) }, body: data ? new URLSearchParams(data) : undefined });
      const cookie = response.headers.get('set-cookie'); if (cookie) this.cookie = cookie.split(';')[0];
      return { status: response.status, headers: response.headers, body: await response.text() };
    }
  }
  const token = (body, name) => { const match = body.match(new RegExp('name="' + name + '" value="([^"]+)"')); assert.ok(match, 'missing ' + name); return match[1]; };
  const admin = new Client(), guest = new Client();
  const login = await admin.req('/admin/');
  assert.ok(/HttpOnly/i.test(login.headers.get('set-cookie')) && /SameSite=Lax/i.test(login.headers.get('set-cookie')));
  const beforeCookie = admin.cookie;
  assert.equal((await admin.req('/admin/', { action: 'login', email: 'admin@example.invalid', password, csrf: 'bad' })).status, 403);
  assert.equal((await admin.req('/admin/', { action: 'login', email: 'admin@example.invalid', password, csrf: token(login.body, 'csrf') })).status, 303);
  assert.notEqual(admin.cookie, beforeCookie);
  const editor = await admin.req('/admin/?view=form'); const csrf = token(editor.body, 'csrf');
  const formData = { action: 'save-form', csrf, title: 'Tráfego local', slug: 'trafego-local', active: '1', whatsapp_message: '', 'fields[0][key]': 'nome', 'fields[0][label]': 'Nome', 'fields[0][type]': 'text', 'fields[0][required]': '1', 'fields[1][key]': 'email', 'fields[1][label]': 'E-mail', 'fields[1][type]': 'email', 'fields[1][required]': '1', 'fields[2][key]': 'tipo', 'fields[2][label]': 'Tipo', 'fields[2][type]': 'select', 'fields[2][options]': 'Local\nDigital', 'fields[2][required]': '1' };
  assert.equal((await admin.req('/admin/', formData)).status, 303);
  assert.equal((await admin.req('/admin/', formData)).status, 422); // slug duplicado
  const formId = Number(sql('SELECT id FROM badon_test.forms LIMIT 1').trim());
  assert.equal((await guest.req('/f/nao-existe')).status, 404);
  assert.equal((await guest.req('/f/confirmacao.php')).status, 404);
  assert.equal((await guest.req('/admin/?view=leads')).body.includes('type="password"'), true);
  assert.equal((await guest.req('/api/enviar.php')).status, 405);
  const form = await guest.req('/f/trafego-local');
  assert.equal(form.status, 200); assert.ok(!form.body.includes('wa.me'));
  const consentTag = form.body.match(/<input[^>]*name="consent"[^>]*>/)[0]; assert.ok(!consentTag.includes('checked'));
  assert.ok(form.body.includes('/privacidade/'));
  const send = { csrf: token(form.body, 'csrf'), submission: token(form.body, 'submission'), form_id: String(formId), 'fields[nome]': '<script>alert(1)</script>', 'fields[email]': 'lead@example.invalid', 'fields[tipo]': 'Local', website_url: '', consent: '1' };
  assert.equal((await guest.req('/api/enviar.php', { ...send, consent: '' })).status, 422);
  assert.equal((await guest.req('/api/enviar.php', { ...send, 'fields[email]': 'bad' })).status, 422);
  assert.equal((await guest.req('/api/enviar.php', { ...send, 'fields[tipo]': 'forged' })).status, 422);
  assert.equal((await guest.req('/api/enviar.php', { ...send, website_url: 'spam' })).status, 400);
  assert.equal(sql('SELECT COUNT(*) FROM badon_test.leads').trim(), '0');
  log('login/CSRF, formulário JSON, validação, consentimento desmarcado e honeypot');
  const sent = await guest.req('/api/enviar.php', send); assert.equal(sent.status, 303);
  const confirmation = await guest.req(sent.headers.get('location')); assert.ok(confirmation.body.includes('https://wa.me/5511999999999?text=Oi%2C+acabei'));
  assert.equal((await new Client().req(sent.headers.get('location'))).status, 404);
  assert.equal((await guest.req('/api/enviar.php', send)).status, 303);
  assert.equal(sql('SELECT COUNT(*) FROM badon_test.leads').trim(), '1');
  assert.equal(sql('SELECT email_status FROM badon_test.leads').trim(), 'sent');
  assert.ok(sql('SELECT consent_text FROM badon_test.leads').includes('autorizo'));
  assert.equal(messages.length, 1); assert.ok(messages[0].includes('Reply-To: lead@example.invalid'));
  assert.ok(messages[0].includes('Data e hora:') && messages[0].includes('Nome:'));
  log('lead persistido, SMTP local, Reply-To, confirmação privada e envio idempotente');
  const detail = await admin.req('/admin/?view=lead&id=1'); assert.ok(detail.body.includes('&lt;script&gt;') && !detail.body.includes('<script>alert'));
  const csv = await admin.req('/admin/', { action: 'export', csrf, form_id: String(formId) });
  assert.equal(csv.status, 200); assert.ok(csv.headers.get('content-type').includes('text/csv'));
  assert.ok(csv.body.includes('Respostas') && csv.body.includes('lead@example.invalid'));
  const csvFiltered = await admin.req('/admin/', { action: 'export', csrf, form_id: '99999' }); assert.ok(!csvFiltered.body.includes('lead@example.invalid'));
  log('leads com escape de HTML e CSV filtrado');
  // Nova submissão com SMTP indisponível: não perder o lead.
  rejectMail = true;
  const form2 = await guest.req('/f/trafego-local');
  const failed = await guest.req('/api/enviar.php', { ...send, submission: token(form2.body, 'submission') }); assert.equal(failed.status, 303);
  assert.equal(sql('SELECT email_status FROM badon_test.leads ORDER BY id DESC LIMIT 1').trim(), 'failed');
  rejectMail = false;
  assert.equal((await admin.req('/admin/', { action: 'retry-mail', csrf, id: '2' })).status, 303);
  assert.equal(sql('SELECT email_status FROM badon_test.leads WHERE id=2').trim(), 'sent');
  log('falha de SMTP preserva lead e permite reenvio pelo painel');
  const edit = await admin.req('/admin/?view=form&id=' + formId);
  const custom = { ...formData, id: String(formId), version: token(edit.body, 'version'), whatsapp_message: 'Quero conversar sobre meu projeto!' };
  assert.equal((await admin.req('/admin/', custom)).status, 303);
  const form3 = await guest.req('/f/trafego-local');
  const sent3 = await guest.req('/api/enviar.php', { ...send, submission: token(form3.body, 'submission') });
  assert.ok((await guest.req(sent3.headers.get('location'))).body.includes('Quero+conversar+sobre+meu+projeto%21'));
  const edit2 = await admin.req('/admin/?view=form&id=' + formId);
  assert.equal((await admin.req('/admin/', { ...custom, version: token(edit2.body, 'version'), active: '' })).status, 303);
  assert.equal((await guest.req('/f/trafego-local')).status, 404);
  log('mensagem personalizada e pausa do formulário');
  // Funis v2 usam o JSON existente: nenhum ALTER ou privilégio adicional.
  sql('DELETE FROM badon_test.rate_limits');
  const definition = JSON.parse(run(php, ['tests/flow.php', '--fixture']));
  definition.fields[1].rules[0].ending.title = 'Obrigado <script>teste</script>';
  const funnelData = { action: 'save-form', csrf, title: 'Funil condicional', slug: 'funil-condicional', active: '1', whatsapp_message: 'Vamos conversar', fields_payload: JSON.stringify(definition) };
  assert.equal((await admin.req('/admin/', funnelData)).status, 303);
  const funnelId = sql("SELECT id FROM badon_test.forms WHERE slug='funil-condicional'").trim();
  const builder = await admin.req('/admin/?view=form&id=' + funnelId);
  assert.ok(builder.body.includes('Bādon Forms') && builder.body.includes('data-definition=') && builder.body.includes('/forms-assets/admin.js?v=2'));
  const flowGuest = new Client();
  const publicFunnel = await flowGuest.req('/f/funil-condicional');
  assert.ok(publicFunnel.body.includes('/forms-assets/public-flow.js?v=4') && !publicFunnel.body.includes('wa.me/'));
  const flowSend = { csrf: token(publicFunnel.body, 'csrf'), submission: token(publicFunnel.body, 'submission'), form_id: funnelId, website_url: '', consent: '1', 'fields[email]': 'funil@example.invalid', 'fields[investimento]': '500', 'fields[cidade]': 'FORGED-SKIPPED', outcome: 'completed', whatsapp: '1' };
  const countBefore = Number(sql('SELECT COUNT(*) FROM badon_test.leads').trim());
  assert.equal((await flowGuest.req('/api/enviar.php', { ...flowSend, consent: '' })).status, 422);
  assert.equal((await flowGuest.req('/api/enviar.php', { ...flowSend, 'fields[investimento]': '1e3' })).status, 422);
  assert.equal((await flowGuest.req('/api/enviar.php', { ...flowSend, 'fields[investimento]': '1000', 'fields[negocio]': 'Infoproduto' })).status, 422);
  assert.equal(Number(sql('SELECT COUNT(*) FROM badon_test.leads').trim()), countBefore);
  const early = await flowGuest.req('/api/enviar.php', flowSend);
  assert.equal(early.status, 303);
  const earlyPage = await flowGuest.req(early.headers.get('location'));
  assert.ok(earlyPage.body.includes('Obrigado &lt;script&gt;teste&lt;/script&gt;') && !earlyPage.body.includes('wa.me/') && !earlyPage.body.includes('<script>teste'));
  const earlyValues = JSON.parse(sql('SELECT values_json FROM badon_test.leads ORDER BY id DESC LIMIT 1').trim());
  assert.deepEqual(earlyValues.map(item => item.key), ['email', 'investimento', '_flow_outcome']);
  assert.ok(earlyValues.at(-1).value.includes('Encerramento condicional'));
  assert.ok(messages.at(-1).includes('Resultado do funil:') && !messages.at(-1).includes('FORGED-SKIPPED'));
  assert.equal((await flowGuest.req('/api/enviar.php', flowSend)).status, 303);
  assert.equal(Number(sql('SELECT COUNT(*) FROM badon_test.leads').trim()), countBefore + 1);
  const nextFlow = await flowGuest.req('/f/funil-condicional');
  const qualified = await flowGuest.req('/api/enviar.php', { ...flowSend, submission: token(nextFlow.body, 'submission'), 'fields[investimento]': '1000,50', 'fields[negocio]': 'Infoproduto', 'fields[produto]': 'Curso', 'fields[fim]': 'Vamos conversar' });
  assert.equal(qualified.status, 303);
  assert.ok((await flowGuest.req(qualified.headers.get('location'))).body.includes('wa.me/'));
  const qualifiedValues = JSON.parse(sql('SELECT values_json FROM badon_test.leads ORDER BY id DESC LIMIT 1').trim());
  assert.deepEqual(qualifiedValues.map(item => item.key), ['email', 'investimento', 'negocio', 'produto', 'fim', '_flow_outcome']);
  assert.ok(qualifiedValues.at(-1).value.startsWith('Concluído'));
  const flowCSV = await admin.req('/admin/', { action: 'export', csrf, form_id: funnelId });
  assert.ok(flowCSV.body.includes('Encerramento condicional') && !flowCSV.body.includes('FORGED-SKIPPED'));
  const flowLeads = await admin.req('/admin/?view=leads&form_id=' + funnelId);
  assert.ok(flowLeads.body.includes('Resultado do funil') && flowLeads.body.includes('Encerramento condicional'));
  const badDefinition = structuredClone(definition); badDefinition.fields[2].rules[0].target = 'email';
  assert.equal((await admin.req('/admin/', { ...funnelData, slug: 'ciclo', fields_payload: JSON.stringify(badDefinition) })).status, 422);
  assert.equal((await admin.req('/admin/', { ...funnelData, slug: 'malformado', fields_payload: '{' })).status, 422);
  const ticketBeforeEdit = await flowGuest.req('/f/funil-condicional');
  definition.fields[1].rules[0].value = '2000';
  assert.equal((await admin.req('/admin/', { ...funnelData, id: funnelId, version: token(builder.body, 'version'), fields_payload: JSON.stringify(definition) })).status, 303);
  assert.equal((await flowGuest.req('/api/enviar.php', { ...flowSend, submission: token(ticketBeforeEdit.body, 'submission') })).status, 409);
  assert.equal((await admin.req('/admin/', { ...funnelData, id: funnelId, version: token(builder.body, 'version') })).status, 422);
  // Array de campos v1 continua funcionando e pode ser editado sem migração.
  const legacyFields = JSON.stringify([{ key: 'nome', label: 'Nome antigo', type: 'text', required: true, options: [] }]);
  sql(`INSERT INTO badon_test.forms (title,slug,fields_json,whatsapp_message) VALUES ('Legado','legado','${legacyFields}','')`);
  const legacy = await flowGuest.req('/f/legado');
  assert.equal(legacy.status, 200); assert.ok(legacy.body.includes('Nome antigo'));
  const legacyId = sql("SELECT id FROM badon_test.forms WHERE slug='legado'").trim();
  const legacySent = await flowGuest.req('/api/enviar.php', { csrf: token(legacy.body, 'csrf'), submission: token(legacy.body, 'submission'), form_id: legacyId, consent: '1', 'fields[nome]': 'Nome' });
  assert.equal(legacySent.status, 303);
  assert.ok((await flowGuest.req(legacySent.headers.get('location'))).body.includes('wa.me/'));
  log('funil v2, saltos seguros, campos obrigatórios por caminho, encerramento/WhatsApp, CSV, SMTP e legado');
  let limited;
  for (let i = 0; i < 21; i++) limited = await guest.req('/api/enviar.php', send);
  assert.equal(limited.status, 429);
  log('limite de envios por conexão');
  assert.equal((await admin.req('/admin/', { action: 'logout', csrf })).status, 303);
  assert.ok((await admin.req('/admin/?view=leads')).body.includes('type="password"'));
  const attacker = new Client(); const login2 = await attacker.req('/admin/'); let last;
  for (let i = 0; i < 11; i++) last = await attacker.req('/admin/', { action: 'login', csrf: token(login2.body, 'csrf'), email: 'unknown@example.invalid', password: 'wrong' });
  assert.equal(last.status, 429);
  log('logout e limite de tentativas de login');
  const freshLogin = await admin.req('/admin/');
  assert.equal((await admin.req('/admin/', { action: 'login', email: 'admin@example.invalid', password, csrf: token(freshLogin.body, 'csrf') })).status, 303);
  run(php, [cli, 'admin:password', 'admin@example.invalid'], { input: randomBytes(18).toString('hex') + '\n', stdio: ['pipe', 'pipe', 'ignore'] });
  assert.ok((await admin.req('/admin/')).body.includes('type="password"'));
  log('troca de senha invalida sessões anteriores');
  await studioTests({base,sql,run,php,cli,messages,recipients,Client,token});
  // Validar configuração de produção sem qualquer conexão SMTP externa.
  const productionConfig = config.replace("'environment'=>'development'", "'environment'=>'production'").replace("'base_url'=>'http:", "'base_url'=>'https:").replace("'encryption'=>'none','username'=>'','password'=>''", "'encryption'=>'tls','username'=>'test','password'=>'test'");
  fs.writeFileSync(path.join(account, 'badon-config/config.php'), productionConfig, { mode: 0o600 });
  const reloaded = new Promise(resolve => phpProc.once('exit', resolve)); kill(phpProc); await reloaded;
  phpProc = spawn(php, ['-S', '127.0.0.1:' + httpPort, '-t', path.join(account, 'public_html'), path.join(repo, 'tests/router.php')], { stdio: 'ignore' });
  await ready(async () => (await fetch(base + '/admin/', { redirect: 'manual' })).status === 308);
  const insecure = await new Client().req('/admin/');
  assert.equal(insecure.status, 308); assert.ok(insecure.headers.get('location').startsWith('https://'));
  const stopped = new Promise(resolve => phpProc.once('exit', resolve)); kill(phpProc); await stopped;
  phpProc = spawn(php, ['-S', '127.0.0.1:' + httpPort, '-t', path.join(account, 'public_html'), path.join(repo, 'tests/router.php')], { stdio: 'ignore', env: { ...process.env, BADON_TEST_HTTPS: '1' } });
  await ready(async () => (await fetch(base + '/admin/', { redirect: 'manual' })).status === 200);
  const secureLogin = await new Client().req('/admin/');
  assert.match(secureLogin.headers.get('set-cookie'), /; secure;/i);
  assert.match(secureLogin.headers.get('set-cookie'), /HttpOnly/i);
  assert.ok(secureLogin.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  log('produção exige HTTPS, cookie Secure/HttpOnly e política de segurança');
  console.log('Integração concluída. Nenhum e-mail externo foi enviado.');
} finally {
  kill(phpProc); kill(dbProc);
  if (smtp) smtp.close();
  // Manter fixtures isoladas para diagnóstico; nenhum arquivo do usuário é apagado.
  console.log('Diagnóstico local:', tmp);
}
