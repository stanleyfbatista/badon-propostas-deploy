/* Launch settings stay off until the real checkout and measurement property exist. */
(() => {
 'use strict';
 const settings = Object.freeze({
  checkoutUrl: '',
  measurementProvider: 'meta',
  measurementPending: true,
  experimentEnabled: false,
  experimentId: 'raizes-hero-v1'
 });
 const variants = ['organizacao', 'quantidade'];
 const requested = new URLSearchParams(location.search).get('hero');
 const preview = variants.includes(requested);
 let variant = preview ? requested : 'organizacao';
 if (!preview && settings.experimentEnabled) {
  try {
   const saved = localStorage.getItem(settings.experimentId);
   variant = variants.includes(saved) ? saved : variants[Math.random() < .5 ? 0 : 1];
   localStorage.setItem(settings.experimentId, variant);
  } catch (_) { variant = variants[Math.random() < .5 ? 0 : 1]; }
 }
 document.documentElement.dataset.hero = variant;
 const item = {item_id:'colecao-raizes',item_name:'Coleção Raízes',price:67,quantity:1};
 const events = [];
 // Meta Pixel will be installed later by the owner on the final domain.
 // Keep QA events local: no third-party scripts, cookies, or remote collection.
 const active = false;
 function track(name, details={}) {
  const parameters = {hero_variant:variant,experiment_id:settings.experimentId,preview_mode:preview,...details};
  const event = {name,parameters};
  events.push(event);
  if (events.length > 50) events.shift();
  document.dispatchEvent(new CustomEvent('raizes:measurement',{detail:event}));

 }
 let checkout = null;
 try {
  const url = new URL(settings.checkoutUrl);
  if (url.protocol === 'https:') checkout = url.href;
 } catch (_) { /* No checkout: preserve the existing preview dialog. */ }
 window.RaizesLaunch = Object.freeze({settings,variant,preview,active,checkout,track,
  getEvents:()=>structuredClone(events)});
 document.addEventListener('DOMContentLoaded',()=>{
  track('page_view',{page_title:document.title,page_location:location.origin+location.pathname});
  track('view_item',{currency:'BRL',value:67,items:[item]});
  document.querySelectorAll('a[href="#comprar"],a[href="#templates"]').forEach(link=>link.addEventListener('click',()=>{
   track('collection_navigation',{destination:link.hash.slice(1),placement:link.closest('section')?.id||'closing'});
  }));
  const card=document.querySelector('.offer-card');
  if (card && 'IntersectionObserver' in window) {
   const observer=new IntersectionObserver(entries=>{
    if (entries[0].isIntersecting) {track('offer_view');observer.disconnect();}
   },{threshold:.35});
   observer.observe(card);
  }
 });
 // purchase belongs to verified payment confirmation, never a query parameter or CTA.
})();
