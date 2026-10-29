import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const slugs = ['sites', 'identidade-visual', 'trafego-pago', 'google-meu-negocio'];
const titles = new Set(), descriptions = new Set(), messages = new Set();
for (const slug of slugs) {
  const html = fs.readFileSync(path.join(root,'public/servicos',slug+'.html'),'utf8');
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const description = html.match(/name="description" content="([^"]+)"/)[1];
  titles.add(title); descriptions.add(description);
  assert.equal((html.match(/<h1\b/g)||[]).length, 1);
  assert.equal((html.match(/<details>/g)||[]).length, slug === 'sites' ? 9 : 4);
  assert.equal((html.match(/aria-current="page"/g)||[]).length, slug === 'sites' ? 0 : 1);
  assert.match(html, /index, follow/);
  assert.doesNotMatch(html, /noindex|<form|fbq\(|gtag\(/);
  assert.match(html, /service-pages\.css\?v=/);
  assert.match(html, /href="\/privacidade\/"/);
  assert.match(html, /id="como-funciona"/);
  for (const service of slugs) if (slug !== 'sites' || service !== 'sites') assert.ok(html.includes('href="'+service+'.html"'));
  const url='https://produtorabadon.com/servicos/'+slug+'.html';
  assert.ok(html.includes('rel="canonical" href="'+url+'"'));
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
  assert.equal(graph[0]['@type'],'Service');
  assert.equal(graph[0].url,url);
  assert.equal(graph[1]['@type'],'BreadcrumbList');
  assert.equal(graph[1].itemListElement[1].item,url);
  const ctas=[...html.matchAll(/href="(https:\/\/wa.me\/[^\"]+)"/g)];
  assert.equal(ctas.length,slug === 'sites' ? 4 : 2);
  for (const [,href] of ctas) {
    const link=new URL(href);
    assert.equal(link.pathname,'/5519983256292');
    assert.match(link.searchParams.get('text'),/Stanley.*Bādon/);
    messages.add(link.searchParams.get('text'));
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(tag,/alt="[^"]+"/);
    assert.match(tag,/width="\d+"/);
    assert.match(tag,/height="\d+"/);
    const src=tag.match(/src="([^"]+)"/)[1];
    assert.ok(fs.existsSync(path.resolve(root,'public/servicos',src)));
  }
  const main=html.split('<main id="conteudo">')[1].split('</main>')[0].replace(/<[^>]+>/g,' ');
  assert.ok(main.trim().split(/\s+/).length>400);
}
assert.equal(titles.size,4); assert.equal(descriptions.size,4); assert.equal(messages.size,4);
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'badon-services-'));
for(const dir of ['assets/css','assets/js','assets/img/cases/paginas-de-vendas','servicos']) fs.mkdirSync(path.join(fixture,'public_html',dir),{recursive:true});
fs.writeFileSync(path.join(fixture,'public_html/servicos/sites.html'),'previous-service');
fs.writeFileSync(path.join(fixture,'public_html/.htaccess'),'routing-sentinel');
fs.writeFileSync(path.join(fixture,'public_html/index.html'),'home-sentinel');
const publish=()=>execFileSync('bash',[path.join(root,'deploy/publish-services.sh')],{env:{...process.env,BADON_ACCOUNT_DIR:fixture}});
publish(); publish();
const backups=fs.readdirSync(path.join(fixture,'badon-site-backups'));
assert.equal(backups.length,2);
assert.ok(backups.some(dir=>fs.readFileSync(path.join(fixture,'badon-site-backups',dir,'servicos/sites.html'),'utf8')==='previous-service'));
assert.equal(fs.readFileSync(path.join(fixture,'public_html/.htaccess'),'utf8'),'routing-sentinel');
assert.equal(fs.readFileSync(path.join(fixture,'public_html/index.html'),'utf8'),'home-sentinel');
for(const slug of slugs) assert.equal(fs.readFileSync(path.join(fixture,'public_html/servicos',slug+'.html'),'utf8'),fs.readFileSync(path.join(root,'public/servicos',slug+'.html'),'utf8'));
console.log('PASS: quatro serviços, conteúdo próprio, SEO, FAQs, WhatsApp e publicação isolada com backup.');
