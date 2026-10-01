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
const mediaDir = path.join(root, 'forms-media/uploads/1'); fs.mkdirSync(mediaDir, { recursive: true });
fs.copyFileSync(path.join(repo, 'public/forms-media/uploads/.htaccess'), path.join(root, 'forms-media/uploads/.htaccess'));
fs.writeFileSync(path.join(mediaDir, 'a'.repeat(32) + '.mp4'), Buffer.alloc(512, 1));
fs.writeFileSync(path.join(mediaDir, 'exploit.php'), '<?php echo "DO_NOT_SERVE";');
fs.writeFileSync(path.join(mediaDir, '.upload.lock'), 'PRIVATE_LOCK');
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
LoadModule mime_module /usr/libexec/apache2/mod_mime.so
LoadModule headers_module /usr/libexec/apache2/mod_headers.so
TypesConfig /dev/null
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
  const videoUrl = `http://127.0.0.1:${port}/forms-media/uploads/1/${'a'.repeat(32)}.mp4`;
  const video = await fetch(videoUrl, { headers: { Range: 'bytes=0-99' } });
  assert.equal(video.status, 206);
  assert.equal(video.headers.get('content-type'), 'video/mp4');
  assert.equal(video.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await video.arrayBuffer()).byteLength, 100);
  for (const file of ['exploit.php', '.upload.lock', '']) assert.equal((await fetch(`http://127.0.0.1:${port}/forms-media/uploads/1/${file}`)).status, 403);
  console.log('OK: Apache real — rotas, site preservado, mídia estática, Range de vídeo e arquivos/diretórios protegidos.');
} finally { server.kill('SIGTERM'); console.log('Diagnóstico Apache:', tmp); }
