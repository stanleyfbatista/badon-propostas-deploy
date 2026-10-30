/* Isolated portfolio demo: no submissions, external navigation or customer accounts. */
(() => {
  const notice=document.querySelector('.template-toast');
  let timer;
  const explain=()=>{if(!notice)return;notice.hidden=false;clearTimeout(timer);timer=setTimeout(()=>notice.hidden=true,5000);};
  document.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();explain();},true);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a');if(!link)return;
    const href=link.getAttribute('href')||'';
    let target=null;try{target=href.startsWith('#')&&href.length>1?document.getElementById(decodeURIComponent(href.slice(1))):null;}catch{}
    if(!href.startsWith('#')||href==='#'||href==='#demo-notice'||!target){event.preventDefault();event.stopImmediatePropagation();explain();}
  },true);
  if(document.body.dataset.template==='eixo'){
    document.querySelectorAll('.accordion_wrap').forEach((item,index)=>{
      const trigger=item.querySelector('.accordion_top'),panel=item.querySelector('.accordion_bottom');if(!trigger||!panel)return;
      panel.id='demo-faq-'+index;trigger.setAttribute('role','button');trigger.tabIndex=0;trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',panel.id);panel.hidden=true;
      const toggle=()=>{const open=trigger.getAttribute('aria-expanded')!=='true';trigger.setAttribute('aria-expanded',String(open));panel.hidden=!open;panel.style.height=open?'auto':'0px';};
      trigger.addEventListener('click',toggle);trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}});
    });
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    if(!reduced.matches&&typeof IntersectionObserver==='function'){
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.animate?.([{opacity:.3,translate:'0 18px'},{opacity:1,translate:'0 0'}],{duration:650,easing:'ease-out'});observer.unobserve(entry.target);}}),{threshold:.12});
      document.querySelectorAll('.section_services,.section_benefits,.why_section').forEach(el=>observer.observe(el));
    }
  }
})();
