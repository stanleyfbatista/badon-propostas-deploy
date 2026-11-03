'use strict';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const templates = [
 {name:'Jardim Clássico',text:'Tons suaves, detalhes delicados e uma apresentação acolhedora. Um começo que transmite proximidade.',colors:['#eee8db','#bbaa82','#344e40']},
 {name:'Jardim Contorno',text:'Presença marcante, tons quentes e formas orgânicas. Uma identidade que valoriza a sua imagem.',colors:['#e3d1bc','#a27b58','#503b2c']},
 {name:'Jardim Claro Editorial',text:'Espaço para respirar, tipografia expressiva e composição clara. As informações ganham o primeiro plano.',colors:['#f2efe8','#b6b0a1','#292c26']},
 {name:'Jardim Grafite Modular',text:'Contrastes profundos e organização em blocos. Um visual contemporâneo, direto e cheio de personalidade.',colors:['#e4e3d5','#7a8161','#242620']},
 {name:'Jardim Oliva',text:'Verde oliva, tons naturais e linhas leves. Uma presença serena que conecta os materiais da sua rotina.',colors:['#e8e5da','#939479','#4b5943']},
 {name:'Jardim Aurora',text:'Cor, leveza e formas cheias de movimento. Uma identidade lúdica para personalizar ao seu público.',colors:['#fff0cd','#e97641','#7c46a8']},
 {name:'Jardim Bosque',text:'Verdes profundos e detalhes dourados. Uma apresentação envolvente, com calor e presença.',colors:['#f2e7cf','#c5a15a','#163e2d']},
 {name:'Jardim Terra',text:'Areia, marrom e transparências suaves. Uma identidade orgânica que aproxima o visual do cuidado.',colors:['#f1f0ec','#b9ad98','#473e30']}
];

// Only the offer uses a dialog. Product images remain part of the page.
const offerDialog = document.querySelector('#offer-dialog');
let offerTrigger = null;
document.querySelectorAll('[data-open-offer]').forEach(button => button.addEventListener('click', () => {
 if (window.RaizesLaunch?.checkout) {
  window.RaizesLaunch.track('checkout_click',{currency:'BRL',value:67,placement:'offer'});
  location.assign(window.RaizesLaunch.checkout);
  return;
 }
 window.RaizesLaunch?.track('offer_preview_click',{placement:'offer'});
 offerTrigger = button;
 offerDialog.showModal();
 document.body.classList.add('modal-open');
 updateAutoplay();
 syncDocumentWall();
}));
document.querySelector('.close-offer').addEventListener('click', () => offerDialog.close());
document.querySelector('#explore-pack').addEventListener('click', () => {
 offerDialog.close();
 document.querySelector('#templates').scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth'});
});
offerDialog.addEventListener('click', event => {
 if (event.target !== offerDialog) return;
 const r = offerDialog.getBoundingClientRect();
 if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) offerDialog.close();
});
offerDialog.addEventListener('close', () => {
 document.body.classList.remove('modal-open');
 offerTrigger?.focus({preventScroll:true});
 updateAutoplay();
 syncDocumentWall();
});

// Covers loop automatically. Arrows, thumbnails, keys and swipes reset the timer.
const showcase = document.querySelector('.showcase');
const carouselSection = document.querySelector('#templates');
const deck = document.querySelector('#cover-deck');
const cards = [...document.querySelectorAll('[data-cover]')];
const thumbs = [...document.querySelectorAll('[data-template]')];
const description = document.querySelector('#template-description');
let active = 0;
let carouselVisible = !('IntersectionObserver' in window);
let carouselInteracting = false;
let timer = null;
let carouselDrawn = false;
function drawCarousel(index, manual = false) {
 active = (index + templates.length) % templates.length;
 const item = templates[active];
 cards.forEach((card,i) => {
  let offset = (i - active + cards.length) % cards.length;
  if (offset > 4) offset -= cards.length;
  const distance = Math.abs(offset);
  card.style.setProperty('--offset', offset);
  card.style.setProperty('--abs', distance);
  card.style.setProperty('--scale', String(1 - distance * .035));
  card.style.setProperty('--opacity', distance > 2 ? '0' : distance === 0 ? '1' : distance === 1 ? '.7' : '.3');
  card.style.setProperty('--z', String(5 - distance));
  card.setAttribute('aria-hidden', String(i !== active));
 });
 thumbs.forEach((thumb,i) => thumb.setAttribute('aria-pressed', String(i === active)));
 description.setAttribute('aria-live', manual ? 'polite' : 'off');
 document.querySelector('#template-name').textContent = item.name;
 document.querySelector('#template-text').textContent = item.text;
 document.querySelector('#template-number').textContent = String(active + 1).padStart(2,'0');
 document.querySelector('#template-swatches').replaceChildren(...item.colors.map(color => {
  const dot = document.createElement('i');
  dot.style.setProperty('--swatch',color);
  return dot;
 }));
 if (carouselDrawn && !reducedMotion.matches && description.animate) {
  description.getAnimations().forEach(animation => animation.cancel());
  description.animate([{opacity:.15,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'ease-out'});
 }
 carouselDrawn = true;
 updateAutoplay();
}
function updateAutoplay() {
 clearTimeout(timer);
 timer = null;
 if (reducedMotion.matches || !carouselVisible || carouselInteracting || document.hidden || offerDialog.open) return;
 timer = setTimeout(() => drawCarousel(active + 1), 5000);
}
thumbs.forEach(button => button.addEventListener('click', () => drawCarousel(Number(button.dataset.template),true)));
document.querySelector('#prev-template').addEventListener('click', () => drawCarousel(active - 1,true));
document.querySelector('#next-template').addEventListener('click', () => drawCarousel(active + 1,true));
carouselSection.addEventListener('pointerdown', () => { carouselInteracting = true; updateAutoplay(); });
function releaseCarousel() {
 if (!carouselInteracting) return;
 carouselInteracting = false;
 updateAutoplay();
}
document.addEventListener('pointerup', releaseCarousel);
document.addEventListener('pointercancel', releaseCarousel);
window.addEventListener('blur', releaseCarousel);
carouselSection.addEventListener('keydown', event => {
 if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
  event.preventDefault();
  drawCarousel(active + (event.key === 'ArrowRight' ? 1 : -1),true);
 }
});
let touchStart = null;
deck.addEventListener('touchstart', event => { touchStart = {x:event.touches[0].clientX,y:event.touches[0].clientY}; }, {passive:true});
deck.addEventListener('touchend', event => {
 if (!touchStart) return;
 const dx = event.changedTouches[0].clientX - touchStart.x;
 const dy = event.changedTouches[0].clientY - touchStart.y;
 if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) drawCarousel(active + (dx < 0 ? 1 : -1),true);
 touchStart = null;
}, {passive:true});
deck.addEventListener('touchcancel', () => { touchStart = null; }, {passive:true});
if ('IntersectionObserver' in window) {
 new IntersectionObserver(entries => {
  carouselVisible = entries[0].isIntersecting;
  updateAutoplay();
 }, {threshold:.12}).observe(showcase);
}
drawCarousel(0);

// Matching presentations and document interiors crossfade together.
const documentWall = document.querySelector('.document-wall');
const documentCollections = [
 {slug:'terra',name:'Terra',presentation:14},
 {slug:'aurora',name:'Aurora',presentation:7},
 {slug:'bosque',name:'Bosque',presentation:12},
 {slug:'grafite',name:'Grafite Modular',presentation:7}
];
const documentTitles = ['Prontuário psicológico','Formulário pré-atendimento','Plano de acompanhamento','Jornada do novo paciente','Identificação do prontuário','Guia da primeira sessão','Contrato de psicoterapia','Guia do prontuário','Roteiro para Google Forms','Ficha de encerramento','Guia de personalização','Personalização do contrato'];
let wallVisible = !('IntersectionObserver' in window);
let wallIndex = 0;
let wallTimer = null;
let wallChanging = false;
let preparedScene = null;
let currentScene = document.createElement('div');
currentScene.className = 'document-scene';
currentScene.dataset.collection = 'terra';
currentScene.append(...documentWall.children);
documentWall.append(currentScene);

function wallCanRun() {
 return wallVisible && !document.hidden && !reducedMotion.matches && !offerDialog.open;
}
async function buildDocumentScene(collection) {
 const scene = document.createElement('div');
 scene.className = 'document-scene';
 scene.dataset.collection = collection.slug;
 const images = [];
 for (const [kind,count,direction] of [['presentation',collection.presentation,'left'],['inside',12,'right']]) {
  const lane = document.createElement('div');
  lane.className = `document-lane ${kind === 'presentation' ? 'presentation-lane' : 'interior-lane'}`;
  lane.dataset.direction = direction;
  lane.setAttribute('role','group');
  lane.setAttribute('aria-label',`${kind === 'presentation' ? 'Apresentação' : 'Documentos'} Jardim ${collection.name}`);
  // The same page speed, regardless of the number of pages in each style.
  lane.style.setProperty('--lane-duration',`${count * 8}s`);
  const viewport = document.createElement('div'); viewport.className = 'lane-window';
  const track = document.createElement('div'); track.className = 'document-track';
  const run = document.createElement('div'); run.className = 'document-run';
  for (let page = 1; page <= count; page++) {
   const tile = document.createElement('figure'); tile.className = 'document-tile';
   const img = new Image();
   img.src = `assets/raizes-terra/${kind}/${collection.slug}-${String(page).padStart(2,'0')}.webp`;
   img.width = 637; img.height = 900; img.decoding = 'async'; img.draggable = false;
   img.alt = kind === 'presentation' ? `Apresentação Jardim ${collection.name}, página ${page} de ${count}` : `${documentTitles[page - 1]} — Jardim ${collection.name}`;
   images.push(img);
   tile.append(img); run.append(tile);
  }
  const duplicate = run.cloneNode(true); duplicate.setAttribute('aria-hidden','true');
  track.append(run,duplicate); viewport.append(track); lane.append(viewport); scene.append(lane);
 }
 // Keep the current set visible if any file fails; never fade to unloaded pages.
 await Promise.all(images.map(img => img.decode()));
 return scene;
}
function prepareNextScene() {
 if (!preparedScene) preparedScene = buildDocumentScene(documentCollections[(wallIndex + 1) % documentCollections.length]).catch(() => null);
 return preparedScene;
}
async function changeDocumentCollection() {
 wallTimer = null;
 wallChanging = true;
 const incoming = await prepareNextScene();
 if (!incoming || !wallCanRun()) {
  if (!incoming) preparedScene = null;
  wallChanging = false;
  syncDocumentWall();
  return;
 }
 const outgoing = currentScene;
 incoming.setAttribute('aria-hidden','true');
 documentWall.append(incoming);
 if (incoming.animate) {
  const options = {duration:1100,easing:'ease-in-out'};
  await Promise.allSettled([
   outgoing.animate([{opacity:1},{opacity:0}],options).finished,
   incoming.animate([{opacity:0},{opacity:1}],options).finished
  ]);
 }
 outgoing.remove();
 incoming.removeAttribute('aria-hidden');
 currentScene = incoming;
 wallIndex = (wallIndex + 1) % documentCollections.length;
 documentWall.setAttribute('aria-label',`Apresentação e documentos Jardim ${documentCollections[wallIndex].name}`);
 preparedScene = null;
 wallChanging = false;
 syncDocumentWall();
}
function syncDocumentWall() {
 const running = wallCanRun();
 documentWall.classList.toggle('is-running', running);
 if (!running) { clearTimeout(wallTimer); wallTimer = null; return; }
 if (!wallChanging && !wallTimer) {
  prepareNextScene();
  wallTimer = setTimeout(changeDocumentCollection,12000);
 }
}
if ('IntersectionObserver' in window) {
 new IntersectionObserver(entries => { wallVisible = entries[0].isIntersecting; syncDocumentWall(); }, {rootMargin:'60px'}).observe(documentWall);
}
syncDocumentWall();

// Repeated entries and exits follow the reading flow. No-JS content stays visible.
const motionSelectors = [
 '.section-heading', '.intro h2', '.intro-narrative', '.professional-note .wrap', '.intro>p:not(.eyebrow)', '.audience-notes',
 '.showcase-info', '.template-picker', '.document-photo', '.document-groups',
 '.use-copy', '.personalization-demo', '.real-previews', '.sheets-copy', '.bonus-device', '.formats-heading',
 '.formats-grid', '.author-photo', '.author-copy', '.offer-story', '.offer-card',
 '.faq-heading', '.faq-list', '.closing .wrap'
];
if ('IntersectionObserver' in window) {
 const motionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
   entry.target.classList.add('motion-ready');
   entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });
 }, {rootMargin:'-4% 0px -5% 0px', threshold:0});
 document.querySelectorAll(motionSelectors.join(',')).forEach(element => {
  element.dataset.motion = element.matches('figure,.use-photos,.bonus-device') ? 'image' : element.matches('.offer-card') ? 'offer' : 'content';
  motionObserver.observe(element);
 });
}

// Every fresh entry restarts 97 → 67. Partial visibility never retriggers it.
// The accessible value and the no-JS/reduced-motion fallback are always R$ 67.
const price=document.querySelector('.price');
const priceStrip=document.querySelector('#price-strip');
let priceArmed=true;
let priceVisible=false;
let priceAnimation=null;
function settlePrice(){
 priceAnimation?.cancel();priceAnimation=null;
 priceStrip.replaceChildren(Object.assign(document.createElement('span'),{textContent:'67'}));
 priceStrip.style.transform='';
 priceStrip.style.willChange='auto';
}
function playPrice(){
 if(!priceArmed||document.hidden)return;
 priceArmed=false;
 settlePrice();
 price.classList.remove('is-settled');
 if(reducedMotion.matches||!Element.prototype.animate)return;
 priceStrip.replaceChildren(...Array.from({length:31},(_,i)=>Object.assign(document.createElement('span'),{textContent:String(97-i)})));
 const rowHeight=priceStrip.firstElementChild.getBoundingClientRect().height;
 priceStrip.style.willChange='transform';
 priceAnimation=priceStrip.animate([{transform:'translateY(0)'},{transform:`translateY(${-30*rowHeight}px)`}],{duration:1900,easing:'cubic-bezier(.14,.6,.25,1)',fill:'forwards',delay:180});
 priceAnimation.onfinish=()=>{settlePrice();price.classList.add('is-settled');};
}
if('IntersectionObserver' in window){
 const priceObserver=new IntersectionObserver(entries=>{
  const entry=entries[0];
  priceVisible=entry.isIntersecting&&entry.intersectionRatio>=.7;
  if(!entry.isIntersecting){priceArmed=true;settlePrice();}
  else if(priceVisible)playPrice();
 },{threshold:[0,.7]});
 priceObserver.observe(price);
}

document.addEventListener('visibilitychange', () => {
 updateAutoplay(); syncDocumentWall();
 if (document.hidden && priceAnimation) { settlePrice(); priceArmed=true; }
 else if (!document.hidden && priceVisible) playPrice();
});
reducedMotion.addEventListener('change', () => {
 if (reducedMotion.matches) settlePrice();
 updateAutoplay(); syncDocumentWall();
});

// A short before/after demonstration rendered from the actual Terra source.
const personalization = document.querySelector('.personalization-demo');
if (personalization) {
 let demoVisible=false, demoTimer=null, custom=false;
 const buttons=[...personalization.querySelectorAll('[data-personalization]')];
 function setDemo(next,manual=false) {
  custom=next;
  personalization.classList.toggle('is-custom',custom);
  buttons.forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.personalization==='custom')===custom)));
  if(manual) window.RaizesLaunch?.track('personalization_compare',{state:custom?'custom':'original'});
  scheduleDemo();
 }
 function scheduleDemo() {
  clearTimeout(demoTimer);
  if(demoVisible&&!document.hidden&&!reducedMotion.matches) demoTimer=setTimeout(()=>setDemo(!custom),5000);
 }
 buttons.forEach(button=>button.addEventListener('click',()=>setDemo(button.dataset.personalization==='custom',true)));
 if('IntersectionObserver' in window) new IntersectionObserver(entries=>{demoVisible=entries[0].isIntersecting;scheduleDemo();},{threshold:.3}).observe(personalization);
 document.addEventListener('visibilitychange',scheduleDemo);
 reducedMotion.addEventListener('change',scheduleDemo);
}
