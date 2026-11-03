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
let hovering = false;
let timer = null;
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
 updateAutoplay();
}
function updateAutoplay() {
 clearTimeout(timer);
 timer = null;
 const keyboardReading = carouselSection.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
 if (reducedMotion.matches || !carouselVisible || hovering || document.hidden || offerDialog.open || keyboardReading) return;
 timer = setTimeout(() => drawCarousel(active + 1), 5000);
}
thumbs.forEach(button => button.addEventListener('click', () => drawCarousel(Number(button.dataset.template),true)));
document.querySelector('#prev-template').addEventListener('click', () => drawCarousel(active - 1,true));
document.querySelector('#next-template').addEventListener('click', () => drawCarousel(active + 1,true));
deck.addEventListener('pointerenter', event => { if(event.pointerType === 'mouse') { hovering = true; updateAutoplay(); } });
deck.addEventListener('pointerleave', () => { hovering = false; updateAutoplay(); });
carouselSection.addEventListener('focusin', updateAutoplay);
carouselSection.addEventListener('focusout', () => setTimeout(updateAutoplay,0));
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

// Alternating rows show real pages. Duplicates are hidden from screen readers.
const documentWall = document.querySelector('.document-wall');
let wallVisible = !('IntersectionObserver' in window);
function syncDocumentWall() {
 documentWall.classList.toggle('is-running', wallVisible && !document.hidden && !reducedMotion.matches && !offerDialog.open);
}
if ('IntersectionObserver' in window) {
 new IntersectionObserver(entries => { wallVisible = entries[0].isIntersecting; syncDocumentWall(); }, {rootMargin:'60px'}).observe(documentWall);
}
syncDocumentWall();

// Repeated entries and exits follow the reading flow. No-JS content stays visible.
const motionSelectors = [
 '.section-heading', '.intro h2', '.intro>p:not(.eyebrow)', '.audience-notes',
 '.showcase-info', '.template-picker', '.document-photo', '.document-groups',
 '.use-copy', '.use-photos', '.sheets-copy', '.bonus-device', '.formats-heading',
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

// Price runs once per page visit, when visible: 97 → 67 in 1.9 seconds.
// The accessible value and the no-JS/reduced-motion fallback are always R$ 67.
const price=document.querySelector('.price');
const priceStrip=document.querySelector('#price-strip');
let pricePlayed=false;
let priceAnimation=null;
function settlePrice(){
 priceAnimation?.cancel();priceAnimation=null;
 priceStrip.replaceChildren(Object.assign(document.createElement('span'),{textContent:'67'}));
 priceStrip.style.transform='';
 priceStrip.style.willChange='auto';
}
function playPrice(){
 if(pricePlayed)return;
 pricePlayed=true;
 if(reducedMotion.matches||!Element.prototype.animate)return;
 priceStrip.replaceChildren(...Array.from({length:31},(_,i)=>Object.assign(document.createElement('span'),{textContent:String(97-i)})));
 const rowHeight=priceStrip.firstElementChild.getBoundingClientRect().height;
 priceStrip.style.willChange='transform';
 priceAnimation=priceStrip.animate([{transform:'translateY(0)'},{transform:`translateY(${-30*rowHeight}px)`}],{duration:1900,easing:'cubic-bezier(.14,.6,.25,1)',fill:'forwards',delay:180});
 priceAnimation.onfinish=()=>{settlePrice();price.classList.add('is-settled');};
}
if('IntersectionObserver' in window){
 const priceObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&entries[0].intersectionRatio>=.7){playPrice();priceObserver.disconnect();}},{threshold:.7});
 priceObserver.observe(price);
}

document.addEventListener('visibilitychange', () => {
 updateAutoplay(); syncDocumentWall();
 if (document.hidden && priceAnimation) settlePrice();
});
reducedMotion.addEventListener('change', () => {
 if (reducedMotion.matches) settlePrice();
 updateAutoplay(); syncDocumentWall();
});
