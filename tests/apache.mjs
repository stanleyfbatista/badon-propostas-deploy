// Verifica as regras reais de rewrite no Apache local, sem executar PHP.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tmp = fs.mkdtempSync('/tmp/badon-apache-test-');
const root = path.join(tmp, 'public'); fs.mkdirSync(root);
for (const [file, body] of Object.entries({ 'index.html': 'HOME', '404.html': 'NOT_FOUND', 'links/index.html': 'LINKS', 'f/index.php': 'FORM', 'admin/index.php': 'ADMIN', 'admin/studio/index.php': 'STUDIO', 'api/studio.php': 'STUDIO_API', 'f/confirmacao.php': 'CONFIRMATION', 'api/enviar.php': 'SUBMISSION' })) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), body);
}
fs.copyFileSync(path.join(repo, '.badon-404-rules'), path.join(root, '.htaccess'));
const port = await new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const user = os.userInfo();
const conf = `ServerRoot "${tmp}"
PidFile "${tmp}/httpd.pid"
Listen 127.0.0.1:${port}
ServerName localhost
LoadModule mpm_prefork_module /usr/libexec/apache2/mod_mpm_prefork.so
LoadModule unixd_module /usr/libexec/apache2/mod_unixd.so
LoadModule authz_core_module /usr/libexec/apache2/mod_authz_core.so
LoadModule dir_module /usr/libexec/apache2/mod_dir.so
LoadModule rewrite_module /usr/libexec/apache2/mod_rewrite.so
User #${user.uid}
Group #${user.gid}
ErrorLog "${tmp}/error.log"
DocumentRoot "${root}"
<Directory "${root}">
AllowOverride All
Require all granted
</Directory>
`;
const configPath = path.join(tmp, 'httpd.conf'); fs.writeFileSync(configPath, conf);
execFileSync('/usr/sbin/httpd', ['-t', '-f', configPath], { stdio: 'pipe' });
const server = spawn('/usr/sbin/httpd', ['-X', '-f', configPath], { stdio: 'ignore' });
try {
  let started = false;
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); started = true; break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  assert.ok(started, 'Apache did not start');
  for (const [url, body, status] of [['/', 'HOME', 200], ['/links/', 'LINKS', 200], ['/f/trafego-local', 'FORM', 200], ['/f/trafego-local/', 'FORM', 200], ['/f/trafego-local?slug=outro', 'FORM', 200], ['/admin/', 'ADMIN', 200], ['/admin/studio/', 'STUDIO', 200], ['/api/studio.php', 'STUDIO_API', 200], ['/api/enviar.php', 'SUBMISSION', 200], ['/f/confirmacao.php?r=abc', 'CONFIRMATION', 200], ['/nao-existe/', 'NOT_FOUND', 404]]) {
    const result = await fetch(`http://127.0.0.1:${port}${url}`);
    assert.equal(result.status, status, url); assert.equal(await result.text(), body, url);
  }
  console.log('OK: Apache real — rotas de formulário, admin, API, páginas estáticas e 404.');
} finally { server.kill('SIGTERM'); console.log('Diagnóstico Apache:', tmp); }
