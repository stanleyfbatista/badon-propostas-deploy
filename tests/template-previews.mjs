import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const base=path.join(root,'public/assets/previews/templates-v1');
const slugs=['forma-norte','serena','eixo','entrelacos'];
const manifest=fs.readFileSync(path.join(root,'deploy/sites-preview-files.txt'),'utf8').split('\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for(const slug of slugs){
 const file=path.join(base,slug,'index.html'),html=fs.readFileSync(file,'utf8');
 assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
 assert.match(html,/Projeto demonstrativo/);
 assert.match(html,/Marca fictícia · Adaptado de template/);
 assert.match(html,/connect-src 'none'; form-action 'none'/);
 assert.doesNotMatch(html,/<form\b|<iframe\b|<script\b(?![^>]*\bsrc=)/i);
 assert.doesNotMatch(html,/\b(?:href|src|action)=["'](?:https?:|\/\/|mailto:|tel:|javascript:)/i);
 assert.doesNotMatch(html,/\bon(?:click|load|error|submit)\s*=/i);
 for(const [,ref] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
  if(ref.startsWith('#')||ref.startsWith('data:')) continue;
  assert.ok(fs.existsSync(path.resolve(path.dirname(file),ref)),slug+': '+ref);
 }
 const cover=path.join(root,'public/assets/img/cases/paginas-de-vendas',slug+'-notebook-v1.webp');
 assert.ok(fs.statSync(cover).size>20000);
 assert.ok(fs.statSync(cover).size<500000);
}
for(const file of walk(base)){
 assert.ok(manifest.includes(path.relative(path.join(root,'public'),file)), 'manifest: '+file);
 if(file.endsWith('.js')){
  const js=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|document\.cookie|eval\s*\(/);
  execFileSync(process.execPath,['--check',file]);
 }
}
const demo=fs.readFileSync(path.join(base,'demo.js'),'utf8');
assert.match(demo,/preventDefault/);
assert.match(demo,/aria-expanded/);
assert.match(demo,/prefers-reduced-motion/);
const eixo=fs.readFileSync(path.join(base,'eixo/index.html'),'utf8');
assert.doesNotMatch(eixo,/id="testimonials"|99\.2%|1,200|SOC 2|ISO 27001/);
const parent=fs.readFileSync(path.join(root,'public/assets/js/sites-service.js'),'utf8');
assert.match(parent,/project\.template/);
assert.match(parent,/project\.local\?'allow-scripts':'allow-scripts allow-same-origin'/);
for(const slug of slugs) assert.ok(parent.includes('templates-v1/'+slug+'/index.html'));
console.log('PASS: quatro demos locais, capas, assets, isolamento, ausência de envios/rastreadores e manifesto de publicação.');
