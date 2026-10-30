import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('public/assets/js/service-experience.js');
const home=read('public/index.html');
assert.match(home,/>Início<\/a>/);
assert.doesNotMatch(home,/>Home<\/a>/);
assert.match(home,/<details class="services-menu"/);
assert.equal((home.match(/class="button button-blue service-page-link"/g)||[]).length,4);
assert.doesNotMatch(home,/service-direct-links|class="service-tabs"|auto-tabs/);
assert.equal((home.match(/class="home-service-card"/g)||[]).length,4);
const sites=read('public/servicos/sites.html');
assert.doesNotMatch(sites,/Mockup ilustrativo do projeto Davi/);
assert.match(sites,/data-tilt/);
assert.equal((sites.match(/data-score /g)||[]).length,4);
assert.match(sites,/class="keep-together">mostrar isso/);
assert.doesNotMatch(js,/fetch\(|localStorage|document.cookie|setInterval/);
for(const slug of ['identidade-visual','trafego-pago','google-meu-negocio']){
  const html=read('public/servicos/'+slug+'.html');
  assert.match(html,/service-experience.js/);
  assert.match(html,/data-demo-group/);
  for(const [,id] of html.matchAll(/aria-controls="([^"]+)"/g))assert.ok(html.includes('id="'+id+'"'),id);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
}
for(const reduced of [false,true]){
  let observe, id=0;
  const frames=new Map(),events={};
  const styles={};
  const label={textContent:'100'};
  const score={style:{setProperty:(k,v)=>styles[k]=v},querySelector:()=>label};
  const grid={querySelectorAll:()=>[score]};
  const motion={matches:reduced,addEventListener(k,f){this[k]=f;}};
  const document={hidden:false,querySelectorAll:s=>s==='.sales-score-grid'?[grid]:[],addEventListener:(k,f)=>events[k]=f};
  vm.runInNewContext(js,{document,matchMedia:()=>motion,IntersectionObserver:class{constructor(cb){observe=cb;}observe(){}},requestAnimationFrame:cb=>{frames.set(++id,cb);return id;},cancelAnimationFrame:i=>frames.delete(i)});
  observe([{isIntersecting:true}]);
  const tick=t=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));};
  if(!reduced){
    tick(0);assert.equal(label.textContent,'0');assert.equal(styles['--score-color'],'#bb2634');
    tick(700);assert.equal(styles['--score-color'],'#976000');
    tick(1400);assert.equal(styles['--score-color'],'#16804c');
    tick(1700);
  }
  assert.equal(label.textContent,'100');assert.equal(frames.size,0);
  observe([{isIntersecting:false}]);observe([{isIntersecting:true}]);assert.equal(frames.size,0);
}
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'badon-navigation-'));
for(const dir of ['assets/css','assets/js','assets/svg','assets/img','assets/img/blog','assets/img/cases/paginas-de-vendas','assets/img/cases/becare'])fs.mkdirSync(path.join(fixture,'public_html',dir),{recursive:true});
fs.writeFileSync(path.join(fixture,'public_html/index.html'),'previous-home');
fs.writeFileSync(path.join(fixture,'public_html/.htaccess'),'routing-sentinel');
execFileSync('bash',[path.join(root,'deploy/publish-home-navigation.sh')],{env:{...process.env,BADON_ACCOUNT_DIR:fixture}});
assert.equal(fs.readFileSync(path.join(fixture,'public_html/index.html'),'utf8'),home);
assert.equal(fs.readFileSync(path.join(fixture,'public_html/.htaccess'),'utf8'),'routing-sentinel');
const backup=fs.readdirSync(path.join(fixture,'badon-site-backups'))[0];
assert.equal(fs.readFileSync(path.join(fixture,'badon-site-backups',backup,'index.html'),'utf8'),'previous-home');
console.log('PASS: navegação, quatro atalhos, três experiências, animação vermelho/amarelo/verde, movimento reduzido e backup da home.');
