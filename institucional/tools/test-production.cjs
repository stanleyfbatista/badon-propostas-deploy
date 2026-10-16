const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname,'../..');
const root = path.join(repo,'public');
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const pages = [path.join(root,'index.html'),...walk(path.join(root,'blog')),...walk(path.join(root,'servicos'))].filter(f=>f.endsWith('.html'));
assert.equal(pages.length,15);
for (const file of pages) {
  const html = fs.readFileSync(file,'utf8');
  assert.match(html, /name="robots" content="index, follow"/);
  assert.match(html, /rel="canonical" href="https:\/\/produtorabadon.com\//);
  assert.doesNotMatch(html, /noindex|REVISAO\.md|PRÉVIA PARA REVISÃO|Nome a confirmar|ainda não publicada|não publicada\./);
  for (const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(url)) continue;
    const clean = url.split(/[?#]/)[0];
    assert.ok(fs.existsSync(path.resolve(path.dirname(file),clean)), file+': '+url);
  }
}
assert.equal((fs.readFileSync(path.join(root,'index.html'),'utf8').match(/class="client-logo"/g)||[]).length,30);
assert.equal((fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').match(/<loc>/g)||[]).length,15);
for (const forbidden of ['REVISAO.md','VALIDACAO.md','FONTES-BLOG.md','tools','Iniciar-previa.command']) assert.ok(!fs.existsSync(path.join(root,forbidden)));
const fixture = fs.mkdtempSync(path.join(os.tmpdir(),'badon-site-deploy-'));
const pub = path.join(fixture,'public_html');
fs.mkdirSync(pub);
fs.writeFileSync(path.join(pub,'index.html'),'maintenance-before-release');
fs.writeFileSync(path.join(pub,'.htaccess'),'# hosting-rule-preserved\n');
fs.writeFileSync(path.join(pub,'unrelated.html'),'do-not-touch');
fs.mkdirSync(path.join(fixture,'badon-config'));
fs.writeFileSync(path.join(fixture,'badon-config/config.php'),'private-config-sentinel');
const run = () => execFileSync('bash',[path.join(repo,'deploy/deploy.sh')],{env:{...process.env,BADON_ACCOUNT_DIR:fixture},stdio:'pipe'});
run();
const backups = fs.readdirSync(path.join(fixture,'badon-site-backups'));
assert.equal(backups.length,1);
assert.equal(fs.readFileSync(path.join(fixture,'badon-site-backups',backups[0],'index.html'),'utf8'),'maintenance-before-release');
run();
assert.equal(fs.readFileSync(path.join(pub,'unrelated.html'),'utf8'),'do-not-touch');
assert.equal(fs.readFileSync(path.join(fixture,'badon-config/config.php'),'utf8'),'private-config-sentinel');
assert.match(fs.readFileSync(path.join(pub,'.htaccess'),'utf8'), /# hosting-rule-preserved/);
assert.match(fs.readFileSync(path.join(pub,'.htaccess'),'utf8'), /forms\\\.produtorabadon/);
assert.equal(fs.readFileSync(path.join(pub,'index.html'),'utf8'),fs.readFileSync(path.join(root,'index.html'),'utf8'));
console.log('PASS: 15 páginas públicas, links, SEO, 30 logos, backup e deploy repetido; configuração privada e rotas preservadas. Fixture: '+fixture);
