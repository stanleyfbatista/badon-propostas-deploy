import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/blog/cara-de-empresa-grande.html'), 'utf8');
const ids = ['identidade','email','site','catalogo','fotos','proposta','avaliacoes','atendimento','checklist'];
for (const id of ids) {
  assert.equal((html.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  assert.ok(html.includes('href="#' + id + '"'));
}
assert.equal((html.match(/class="business-perception"/g) || []).length, 8);
assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
assert.ok(html.includes('content="index, follow"'));
assert.ok(html.includes('property="og:image"'));
const structured = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(structured['@type'], 'BlogPosting');
assert.equal(structured.mainEntityOfPage, 'https://produtorabadon.com/blog/cara-de-empresa-grande.html');
for (const [,href] of html.matchAll(/href="(https:\/\/wa.me\/[^"]+)"/g)) {
  const url = new URL(href);
  assert.equal(url.pathname, '/5519983256292');
  assert.match(url.searchParams.get('text'), /Stanley.*Cara de empresa grande/);
}
assert.equal((html.match(/https:\/\/wa.me\//g) || []).length, 2);
assert.doesNotMatch(html, /fbq\(|gtag\(|googletagmanager|connect.facebook|<iframe|<form/);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'badon-article-'));
for (const dir of ['assets/css','assets/js','blog']) fs.mkdirSync(path.join(fixture,'public_html',dir),{recursive:true});
fs.writeFileSync(path.join(fixture,'public_html/blog/index.html'),'previous-blog');
fs.writeFileSync(path.join(fixture,'public_html/.htaccess'),'routing-sentinel');
fs.writeFileSync(path.join(fixture,'public_html/unrelated.html'),'unrelated-sentinel');
const publish = () => execFileSync('bash',[path.join(root,'deploy/publish-business-article.sh')],{env:{...process.env,BADON_ACCOUNT_DIR:fixture}});
publish();
const backups = fs.readdirSync(path.join(fixture,'badon-site-backups'));
assert.equal(backups.length,1);
assert.equal(fs.readFileSync(path.join(fixture,'badon-site-backups',backups[0],'blog/index.html'),'utf8'),'previous-blog');
assert.match(fs.readFileSync(path.join(fixture,'badon-site-backups',backups[0],'new-files.txt'),'utf8'),/cara-de-empresa-grande/);
publish();
assert.equal(fs.readFileSync(path.join(fixture,'public_html/blog/cara-de-empresa-grande.html'),'utf8'),html);
assert.equal(fs.readFileSync(path.join(fixture,'public_html/.htaccess'),'utf8'),'routing-sentinel');
assert.equal(fs.readFileSync(path.join(fixture,'public_html/unrelated.html'),'utf8'),'unrelated-sentinel');
console.log('PASS: artigo, âncoras, metadados, CTAs, backup e publicação isolada repetível.');
