import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import tls from 'node:tls';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const php = process.env.PHP_BIN || '/opt/homebrew/opt/php@8.4/bin/php';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'badon-smtp-tls-'));
const key = path.join(tmp, 'key.pem'), cert = path.join(tmp, 'cert.pem'), other = path.join(tmp, 'other.pem');
let deliveries = 0;
for (const [cn, output] of [['localhost', cert], ['unrelated.invalid', other]]) {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', `/CN=${cn}`, '-keyout', output === cert ? key : path.join(tmp, 'other-key.pem'), '-out', output], { stdio: 'ignore' });
}
const server = tls.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, socket => {
  socket.on('error', () => {}); socket.setEncoding('utf8'); socket.write('220 localhost TLS SMTP\r\n');
  let buffer = '', data = false;
  socket.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\r\n')) {
      const end = buffer.indexOf('\r\n'), line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) { if (line === '.') { data = false; deliveries++; socket.write('250 accepted\r\n'); } }
      else if (/^(EHLO|HELO)/.test(line)) socket.write('250-localhost\r\n250 8BITMIME\r\n');
      else if (line === 'DATA') { data = true; socket.write('354 continue\r\n'); }
      else if (line === 'QUIT') socket.end('221 bye\r\n');
      else socket.write('250 OK\r\n');
    }
  });
});
server.on('tlsClientError', () => {});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = String(server.address().port);
const run = (ca, expected) => new Promise((resolve, reject) => {
  const child = spawn(php, ['-d', `openssl.cafile=${ca}`, path.join(repo, 'tests/smtp-tls.php'), port, expected]);
  let output = '';
  child.stdout.on('data', c => output += c); child.stderr.on('data', c => output += c);
  const timeout = setTimeout(() => { child.kill(); reject(new Error('TLS test timed out')); }, 20000);
  child.on('error', reject);
  child.on('exit', code => { clearTimeout(timeout); code === 0 ? resolve(output) : reject(new Error(output)); });
});
try {
  assert.match(await run(cert, 'success'), /TLS delivery accepted/);
  assert.equal(deliveries, 1);
  assert.match(await run(other, 'failure'), /Untrusted certificate rejected/);
  assert.equal(deliveries, 1);
  console.log('OK: SMTPS real com TLS desde a conexão; certificado validado, certificado não confiável rejeitado. Nenhum e-mail externo.');
} finally {
  server.close();
  // Somente arquivos gerados pelo teste nesta pasta temporária exclusiva.
  for (const name of ['key.pem', 'cert.pem', 'other.pem', 'other-key.pem']) fs.unlinkSync(path.join(tmp, name));
  fs.rmdirSync(tmp);
}
