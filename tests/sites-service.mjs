import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/servicos/sites.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/js/sites-service.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/css/sites-service.css'), 'utf8');
assert.match(html, /sites-service\.css\?v=/);
assert.match(html, /sites-service\.js\?v=[^"]+" defer/);
assert.match(html, /sites-device-controls[^>]+hidden/);
assert.match(html, /id="preview-mobile"[^>]*hidden/);
assert.doesNotMatch(html, /id="preview-desktop"[^>]*hidden/);
assert.match(html, /Painel e funcionalidades incluídos quando previstos na proposta/);
assert.match(html, /não são resultados medidos dos nossos sites/);
assert.match(html, /não garante posicionamento nem vendas/);
assert.doesNotMatch(html.split('</header>')[0], /identidade-visual.html|trafego-pago.html|google-meu-negocio.html/);
assert.ok(html.indexOf('id="other-services-title"') > html.indexOf('id="contato"'));
assert.deepEqual([...html.matchAll(/data-open-project="([^"]+)"/g)].map(m=>m[1]),['davi','clp','juliana']);
assert.doesNotMatch(html,/Ferramentas de IA podem|Core Web Vitals|Carregar prévia ao vivo|data-project-external/);
assert.match(html.split('</header>')[0],/href="..\/index.html">Início/);
assert.doesNotMatch(html, /<iframe/);
assert.match(html, /<dialog[^>]+aria-labelledby="project-dialog-title"/);
assert.doesNotMatch(css, /animation-timeline:view/);
assert.match(js, /Math.exp/);
assert.match(js, /requestAnimationFrame/);
assert.match(js, /allow-scripts allow-same-origin/);
assert.doesNotMatch(js,/allow-popups|data-load-project/);
assert.doesNotMatch(js, /innerHTML|eval\(/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.doesNotMatch(js, /fetch\(|localStorage|document\.cookie|setInterval/);
assert.doesNotMatch(html, /agenciafante|owl-carousel|9[.,]7.*mil/);
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size);
for (const [,id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
for (const reduced of [false, true]) {
  let animations = 0, cancellations = 0;
  const controls = {hidden:true};
  const status = {textContent:''};
  const panels = [0,1].map(i=>({hidden:i===1,animate(){animations++;return {cancel(){cancellations++;}};}}));
  const buttons = [0,1].map(i=>({attrs:{'aria-controls':String(i),'aria-pressed':String(i===0)}, getAttribute(k){return this.attrs[k];}, setAttribute(k,v){this.attrs[k]=v;}, addEventListener(k,f){this[k]=f;}}));
  const motion = {matches:reduced,addEventListener(k,f){this[k]=f;}};
  const demo = {querySelector:s=>s==='.sites-device-controls'?controls:status,querySelectorAll:()=>buttons};
  const document = {hidden:false,querySelector:s=>s==='[data-device-demo]'?demo:null,getElementById:id=>panels[Number(id)],addEventListener(k,f){this[k]=f;}};
  vm.runInNewContext(js,{document,window:{matchMedia:()=>motion}});
  assert.equal(controls.hidden,false);
  buttons[1].click();
  assert.deepEqual(panels.map(p=>p.hidden),[true,false]);
  assert.equal(buttons[1].attrs['aria-pressed'],'true');
  assert.equal(status.textContent,'Prévia para celular.');
  assert.equal(animations,reduced?0:1);
  buttons[1].click(); assert.equal(animations,reduced?0:1);
  motion.matches=true; motion.change();
  assert.equal(cancellations,reduced?0:1);
  buttons[0].click();
  assert.deepEqual(panels.map(p=>p.hidden),[false,true]);
  assert.equal(status.textContent,'Prévia para computador.');
}
const emptyDocument = {querySelector:()=>null,getElementById:()=>null,addEventListener(){}};
vm.runInNewContext(js,{document:emptyDocument,window:{matchMedia:()=>({matches:true})}});
{
  const input = {value:'  <b>Meu negócio</b>  ',disabled:true,error:'',setCustomValidity(v){this.error=v;},reportValidity(){return !this.error;},addEventListener(k,f){this[k]=f;}};
  const apply = {disabled:true,addEventListener(k,f){this[k]=f;}};
  const title = {textContent:'original'};
  const status = {textContent:''};
  const fields = {'input':input,'[data-demo-apply]':apply,'[data-demo-title]':title,'[data-demo-status]':status};
  const cms = {querySelector:s=>fields[s]};
  vm.runInNewContext(js,{document:{...emptyDocument,querySelector:s=>s==='[data-cms-demo]'?cms:null},window:{matchMedia:()=>({matches:true})}});
  assert.equal(input.disabled,false); assert.equal(apply.disabled,false);
  apply.click(); assert.equal(title.textContent,'<b>Meu negócio</b>');
  assert.match(status.textContent,/Nada foi publicado ou salvo/);
  input.value=' '; apply.click(); assert.ok(input.error); assert.equal(title.textContent,'<b>Meu negócio</b>');
  input.value='A'.repeat(80); input.input();
  let prevented=false; input.keydown({key:'Enter',preventDefault(){prevented=true;}});
  assert.ok(prevented); assert.equal(title.textContent.length,70);
}
// Motion interpolates fractional pixels, stops at rest/offscreen and respects reduced motion.
{
  let observer, top=500, nextId=0;
  const frames=new Map(), listeners={};
  const lines=[0,1].map(()=>({style:{removeProperty(k){delete this[k];}}}));
  const marquee={querySelectorAll:()=>lines,getBoundingClientRect:()=>({top,height:200})};
  const motion={matches:false,addEventListener(k,f){this[k]=f;}};
  const document={...emptyDocument,hidden:false,querySelector:s=>s==='.sales-marquee'?marquee:null};
  vm.runInNewContext(js,{
    document,window:{innerHeight:800,matchMedia:()=>motion,addEventListener(k,f){listeners[k]=f;}},
    IntersectionObserver:class{constructor(fn){observer=fn;}observe(){}},
    requestAnimationFrame:fn=>{frames.set(++nextId,fn);return nextId;},
    cancelAnimationFrame:id=>frames.delete(id)
  });
  const tick=time=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));};
  observer([{isIntersecting:true}]);tick(16);assert.equal(frames.size,0);
  const before=lines.map(l=>parseFloat(l.style.transform.split('(')[1]));
  top=0;listeners.scroll();tick(32);
  const after=lines.map(l=>parseFloat(l.style.transform.split('(')[1]));
  assert.ok(after[0]<before[0] && after[0]>-270);
  assert.ok(after[1]>before[1] && after[1]<-90);
  for(let t=48;t<3000;t+=16)tick(t);
  assert.equal(frames.size,0);
  top=-100;listeners.scroll();assert.equal(frames.size,1);
  observer([{isIntersecting:false}]);assert.equal(frames.size,0);
  motion.matches=true;motion.change();assert.equal(lines[0].style.transform,undefined);
}
const fixture = fs.mkdtempSync(path.join(os.tmpdir(),'badon-sites-release-'));
for (const dir of ['assets/css','assets/js','assets/img/cases/paginas-de-vendas','servicos']) fs.mkdirSync(path.join(fixture,'public_html',dir),{recursive:true});
const sentinels = ['index.html','.htaccess','servicos/identidade-visual.html','servicos/trafego-pago.html','servicos/google-meu-negocio.html'];
for (const file of sentinels) fs.writeFileSync(path.join(fixture,'public_html',file),'unchanged');
fs.writeFileSync(path.join(fixture,'public_html/servicos/sites.html'),'old-sites');
execFileSync('bash',[path.join(root,'deploy/publish-sites.sh')],{env:{...process.env,BADON_ACCOUNT_DIR:fixture}});
for (const file of sentinels) assert.equal(fs.readFileSync(path.join(fixture,'public_html',file),'utf8'),'unchanged');
for (const file of ['servicos/sites.html','assets/css/sites-service.css','assets/js/sites-service.js',...['black-vitalicia-site.webp','davi-guedes-site.webp','davi-guedes-site-completo.webp'].map(name=>'assets/img/cases/paginas-de-vendas/'+name)]) assert.deepEqual(fs.readFileSync(path.join(fixture,'public_html',file)),fs.readFileSync(path.join(root,'public',file)));
for (const file of fs.readFileSync(path.join(root,'deploy/sites-preview-files.txt'),'utf8').trim().split('\n')) {
  assert.deepEqual(fs.readFileSync(path.join(fixture,'public_html',file)),fs.readFileSync(path.join(root,'public',file)));
}
const preview=fs.readFileSync(path.join(root,'public/assets/previews/davi-v1/index.html'),'utf8');
assert.match(preview,/noindex, nofollow/);
assert.doesNotMatch(preview,/<form|gtag\(|fbq\(|googletagmanager/);
const [backup] = fs.readdirSync(path.join(fixture,'badon-site-backups'));
assert.equal(fs.readFileSync(path.join(fixture,'badon-site-backups',backup,'servicos/sites.html'),'utf8'),'old-sites');
console.log('PASS: narrativa, portfólio, consentimento de prévia, demonstração de edição, alternância responsiva, movimento reduzido e publicação isolada com backup.');
