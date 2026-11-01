(() => {
  'use strict';
  const query = document.querySelector('#hook-search');
  const cards = [...document.querySelectorAll('.hook')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const more = document.querySelector('#show-more');
  const count = document.querySelector('#result-count');
  const status = document.querySelector('#copy-feedback');
  const dialog = document.querySelector('#copy-fallback');
  const fallbackText = document.querySelector('#copy-text');
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  let category = 'Todos', limit = 10, feedbackTimer, previousFocus;
  const records = cards.map(el => ({el, search:normalize(el.textContent), category:el.dataset.category}));
  const prompts = Object.fromEntries(['adaptacao','reels','carrossel'].map(id=>[id,document.querySelector('#prompt-'+id).textContent]));
  function render() {
    const term=normalize(query.value.trim());
    const matches=records.filter(r=>(category==='Todos'||category===r.category)&&r.search.includes(term));
    const visible=new Set(matches.slice(0,limit).map(r=>r.el));
    records.forEach(r=>{r.el.hidden=!visible.has(r.el);});
    count.textContent=matches.length ? 'Mostrando '+Math.min(limit,matches.length)+' de '+matches.length+' ganchos'+(category==='Todos'?'':' · '+category) : 'Nenhum gancho encontrado';
    document.querySelector('#empty-state').hidden=matches.length>0;
    more.hidden=matches.length<=limit;
    more.textContent='Mostrar mais '+Math.min(10,Math.max(0,matches.length-limit))+' ganchos';
    filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
  }
  function notify(message) {
    clearTimeout(feedbackTimer);status.textContent=message;status.classList.add('is-visible');
    feedbackTimer=setTimeout(()=>status.classList.remove('is-visible'),6500);
  }
  async function copy(text, message) {
    try {
      if(!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      notify(message);
    } catch {
      previousFocus=document.activeElement;
      fallbackText.value=text;
      dialog.showModal();fallbackText.focus();fallbackText.select();
    }
  }
  function hookData(number) {
    const card=document.querySelector('#gancho-'+number);
    return {model:card.querySelector('.hook-title').textContent, full:card.querySelector('.hook-title').textContent+'\n\n'+[...card.querySelectorAll('dl>div')].map(d=>d.querySelector('dt').textContent+': '+d.querySelector('dd').textContent).join('\n\n')};
  }
  document.querySelectorAll('[data-enhanced]').forEach(el=>el.hidden=false);
  query.addEventListener('input',()=>{limit=10;render();});
  filters.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter;limit=10;render();}));
  document.querySelector('#clear-filters').addEventListener('click',()=>{category='Todos';limit=10;query.value='';render();query.focus();});
  more.addEventListener('click',()=>{
    const previousVisible=cards.filter(c=>!c.hidden);
    limit+=10;render();
    const firstNew=cards.find(c=>!c.hidden&&!previousVisible.includes(c));
    if(firstNew)firstNew.querySelector('summary').focus();
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    if(button.dataset.copyHook)copy(hookData(button.dataset.copyHook).model,'Gancho copiado. Troque os campos entre colchetes pelo seu contexto.');
    if(button.dataset.copyCard)copy(hookData(button.dataset.copyCard).full,'Gancho, exemplo e orientações copiados.');
    if(button.dataset.copyPrompt)copy(prompts[button.dataset.copyPrompt],'Prompt completo copiado. Preencha os campos antes de enviar à IA.');
    if(button.dataset.hookPrompt) {
      const hook=hookData(button.dataset.hook);
      const text=prompts[button.dataset.hookPrompt].replace('[cole aqui o gancho]',hook.model);
      copy(text,'Prompt copiado com o gancho '+button.dataset.hook+'. Complete os outros campos antes de usar.');
    }
  });
  document.querySelector('#close-copy').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>previousFocus?.focus());
  render();
})();
