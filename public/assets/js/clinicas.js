/* Public, isolated demonstration. No API, patient data, tracking or persistence. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = $('.mobile-toggle'), menu = $('#menu');
  function closeMenu() { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Abrir menu'); toggle.textContent = '☰'; }
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    toggle.textContent = open ? '✕' : '☰';
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('click', e => { if (!e.target.closest('.nav')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); toggle.focus(); } });
  matchMedia('(min-width:761px)').addEventListener('change', closeMenu);
  $('#year').textContent = new Date().getFullYear();

  const preview = $('#clinic-preview'), previewButton = $('#open-clinic-preview');
  previewButton.addEventListener('click', () => { const frame = $('iframe', preview); if (!frame.src) frame.src = frame.dataset.src; preview.showModal(); });
  $('#close-clinic-preview').addEventListener('click', () => preview.close());
  preview.addEventListener('close', () => previewButton.focus());
  preview.addEventListener('click', e => { if (e.target === preview) { const r = preview.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) preview.close(); } });

  const panel = $('#demo-panel'), tabs = $$('[data-view]'), status = $('#demo-status');
  const initialOverview = panel.innerHTML;
  let current = 'visao', stage = 0, list = false, sort = 'custo', days = '30', selectedCreative = null, approved = false, tour = null;
  const stages = ['Contatos', 'Agendamentos', 'Comparecimentos', 'Vendas', 'Perdido'];
  const creatives = [
    {id:'espaco', name:'Conheça o nosso espaço', image:'recepcao-clinica-premium.webp', contacts:36, spend:1080, copy:'Um ambiente preparado para receber você. Conheça a estrutura e converse com a equipe sobre sua primeira avaliação.'},
    {id:'equipe', name:'O cuidado começa na conversa', image:'gestora-clinica-premium.webp', contacts:40, spend:1020, copy:'Antes de qualquer decisão, uma conversa. Entenda como funciona a avaliação e tire suas dúvidas com a equipe.'},
    {id:'experiencia', name:'Uma experiência de cuidado', image:'espaco-beleza.webp', contacts:24, spend:900, copy:'Do primeiro contato ao acolhimento: cada detalhe faz parte da experiência. Saiba mais sobre o atendimento.'}
  ];
  const money = n => n.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const title = (heading, sub) => `<div class="demo-title"><div><h3>${heading}</h3><p>${sub}</p></div><span class="demo-avatar" aria-hidden="true">SE</span></div>`;
  function announce(message) { status.textContent = message; }
  function animate(el) { if (!reduced.matches && el.animate) el.animate([{opacity:.3,transform:'translateY(9px)'},{opacity:1,transform:'none'}], {duration:300,easing:'ease-out'}); }
  function stopTour() { if (tour) clearInterval(tour); tour = null; $('#demo-tour').textContent = 'Reproduzir tour'; $('#demo-tour').setAttribute('aria-pressed','false'); }
  function crm() {
    const card = `<article class="lead-card" id="demo-lead"><strong>Contato de exemplo</strong><small>Origem: campanha no Instagram</small><small class="lead-tag">Avaliação inicial</small><small>Próximo passo definido pela recepção.</small><button type="button" id="advance-lead" ${stage===3?'disabled':''}>${stage===3?'Percurso concluído':'Avançar etapa →'}</button></article>`;
    return title('CRM', 'Explore um contato fictício. Avance a etapa ou alterne para a lista.') + `<div class="demo-tools"><button type="button" data-crm-view="board" aria-pressed="${!list}">Quadro</button><button type="button" data-crm-view="list" aria-pressed="${list}">Lista</button><button type="button" id="reset-crm">Reiniciar exemplo</button></div>` + (list ? `<div class="table-scroll"><table class="demo-table"><thead><tr><th>Contato</th><th>Etapa</th><th>Origem</th><th>Próxima ação</th></tr></thead><tbody><tr><td>Contato de exemplo</td><td>${stages[stage]}</td><td>Instagram</td><td><button type="button" id="advance-lead" ${stage===3?'disabled':''}>${stage===3?'Concluído':'Avançar etapa →'}</button></td></tr></tbody></table></div>` : `<div class="kanban">${stages.map((name,i)=>`<section class="kanban-col"><h4>${name}<b>${stage===i?'1':'0'}</b></h4>${stage===i?card:'<p class="empty-stage">Nenhum contato neste exemplo.</p>'}</section>`).join('')}</div>`) + '<p class="crm-note">Na operação, cada etapa depende do atendimento da clínica. Entrada automática de contatos e conversas exige configuração e conexão do WhatsApp.</p>';
  }
  function creativeView() {
    const factor = days === '7' ? .25 : 1;
    const ordered = [...creatives].sort((a,b)=>sort==='custo' ? a.spend/a.contacts-b.spend/b.contacts : b.contacts-a.contacts);
    return title('Anúncios e aprovações', 'Compare período, investimento e custo. Clique em uma peça para explorar.') + `<div class="demo-tools"><label>Período<select id="demo-period"><option value="30" ${days==='30'?'selected':''}>Últimos 30 dias</option><option value="7" ${days==='7'?'selected':''}>Últimos 7 dias</option></select></label><label>Ordenar por<select id="demo-sort"><option value="custo" ${sort==='custo'?'selected':''}>Menor custo por contato</option><option value="contatos" ${sort==='contatos'?'selected':''}>Mais contatos</option></select></label></div><div class="creative-grid">${ordered.map((c,i)=>{const contacts=Math.round(c.contacts*factor),spend=c.spend*factor;return `<button type="button" class="creative-card" data-creative="${c.id}" aria-expanded="${selectedCreative===c.id}" aria-controls="creative-details"><img src="../assets/img/clinicas/${c.image}" alt="" width="400" height="400"><div><span class="rank">${i+1}º neste exemplo</span><strong>${c.name}</strong><small>Imagem · campanha demonstrativa</small><div class="creative-metrics"><span>Contatos<b>${contacts}</b></span><span>Custo/contato<b>${money(spend/contacts)}</b></span></div><small>Investido: ${money(spend)}</small></div></button>`;}).join('')}</div><div class="creative-details" id="creative-details">${creativeDetails()}</div>`;
  }
  function creativeDetails() {
    const c = creatives.find(item=>item.id===selectedCreative);
    if (!c) return '<strong>Indicadores com contexto.</strong><p>Os valores são simulados para explicar o painel. Contatos não são agendamentos nem vendas.</p>';
    return `<strong>${c.name}</strong><p>${c.copy}</p><p><small>Material de exemplo para explorar a aprovação.</small></p><button type="button" id="demo-approve" ${approved?'disabled':''}>${approved?'Aprovação simulada ✓':'Simular aprovação da peça'}</button>`;
  }
  function scripts() {
    return title('Roteiros', 'Abra o roteiro e veja a sequência sugerida. Sem promessas de resultado clínico.') + `<div class="script-list"><details><summary>Como funciona a primeira avaliação? · Reels</summary><p><b>Gancho</b><br>“Está pensando em agendar uma avaliação e não sabe como funciona?”</p><p><b>Desenvolvimento</b><br>Apresente a conversa inicial, o acolhimento e a avaliação individual feita por um profissional habilitado.</p><p><b>Chamada para ação</b><br>“Fale com a nossa equipe para entender o próximo passo.”</p><p><b>Gravação</b><br>Celular na vertical, luz de frente e um ambiente silencioso. Use sua própria equipe e imagens autorizadas.</p></details><details><summary>O cuidado antes de você chegar · Bastidores</summary><p>Mostre a preparação real do espaço. Conte como a equipe organiza o atendimento, sem expor prontuários ou pacientes.</p><p><b>Objetivo</b><br>Transmitir cuidado com fatos e detalhes que a clínica realmente entrega.</p></details><details><summary>Quem recebe você na clínica · Apresentação</summary><p>Apresente os profissionais, suas funções e o percurso do primeiro contato. Revise qualificações e informações antes de publicar.</p></details></div>`;
  }
  function plan() {
    return title('Plano e entregas', 'Um recorte demonstrativo de diagnóstico, preparação e operação.') + `<div class="plan-steps"><div class="plan-step"><span>✓</span><b>Diagnóstico e prioridades</b><small>Concluído</small></div><div class="plan-step"><span>2</span><b>Site e criativos</b><small>Em produção</small></div><div class="plan-step"><span>3</span><b>Validação da clínica</b><small>Aguardando materiais</small></div><div class="plan-step"><span>4</span><b>Campanhas e análise</b><small>Próxima etapa</small></div></div><div class="plan-progress" role="progressbar" aria-label="Etapas concluídas neste exemplo" aria-valuemin="0" aria-valuemax="4" aria-valuenow="1"><span style="width:25%"></span></div><p class="crm-note">A clínica acompanha prazos, recebe roteiros e participa das aprovações. A equipe Bādon explica os resultados e define os próximos testes.</p><button type="button" data-go-view="criativos">Ver materiais da campanha ↗</button>`;
  }
  function render(view, manual = true) {
    if (manual) stopTour();
    current = view;
    tabs.forEach(tab => { const active = tab.dataset.view === view; tab.setAttribute('aria-selected',String(active)); tab.tabIndex = active ? 0 : -1; });
    panel.setAttribute('aria-labelledby',`tab-${view}`);
    $('#demo-breadcrumb').textContent = $(`#tab-${view} span`).textContent;
    panel.innerHTML = view==='crm' ? crm() : view==='criativos' ? creativeView() : view==='roteiros' ? scripts() : view==='plano' ? plan() : initialOverview;
    animate(panel);
    if (manual) announce(`${$('#demo-breadcrumb').textContent}. Demonstração local, sem dados reais.`);
  }
  tabs.forEach((tab,i) => {
    tab.addEventListener('click', () => render(tab.dataset.view));
    tab.addEventListener('keydown', e => { let next; if (e.key==='ArrowDown'||e.key==='ArrowRight') next=(i+1)%tabs.length; if(e.key==='ArrowUp'||e.key==='ArrowLeft') next=(i-1+tabs.length)%tabs.length; if(e.key==='Home') next=0; if(e.key==='End') next=tabs.length-1; if(next!==undefined){e.preventDefault();tabs[next].focus();render(tabs[next].dataset.view);} });
  });
  panel.addEventListener('click', e => {
    const go=e.target.closest('[data-go-view]'); if(go){render(go.dataset.goView);$(`#tab-${go.dataset.goView}`).focus();return;}
    const mode=e.target.closest('[data-crm-view]'); if(mode){list=mode.dataset.crmView==='list';render('crm');$(`[data-crm-view="${mode.dataset.crmView}"]`,panel).focus();return;}
    if(e.target.closest('#advance-lead')){
      const old=$('#demo-lead')?.getBoundingClientRect();stage=Math.min(3,stage+1);render('crm');const lead=$('#demo-lead');
      if(old&&lead&&!reduced.matches){const now=lead.getBoundingClientRect();lead.animate([{transform:`translate(${old.left-now.left}px,${old.top-now.top}px)`},{transform:'none'}],{duration:500,easing:'cubic-bezier(.22,1,.36,1)'});}
      if(stage<3)$('#advance-lead').focus({preventScroll:true});else $('#reset-crm').focus({preventScroll:true});announce(`Contato de exemplo movido para ${stages[stage]}. Nenhum dado foi enviado.`);return;
    }
    if(e.target.closest('#reset-crm')){stage=0;render('crm');$('#reset-crm').focus();return;}
    const creative=e.target.closest('[data-creative]');if(creative){stopTour();selectedCreative=creative.dataset.creative;approved=false;$$('[data-creative]').forEach(c=>c.setAttribute('aria-expanded',String(c===creative)));$('#creative-details').innerHTML=creativeDetails();animate($('#creative-details'));announce(`Prévia de ${creatives.find(c=>c.id===selectedCreative).name} aberta abaixo das peças.`);return;}
    if(e.target.closest('#demo-approve')){approved=true;$('#demo-approve').textContent='Aprovação simulada ✓';$('#demo-approve').disabled=true;announce('Aprovação de exemplo concluída. Não foi enviada à equipe.');}
  });
  panel.addEventListener('change',e=>{if(e.target.id==='demo-period'||e.target.id==='demo-sort'){const id=e.target.id;if(id==='demo-period')days=e.target.value;else sort=e.target.value;render('criativos');$(`#${id}`).focus();announce('Comparação atualizada com números simulados.');}});
  panel.addEventListener('toggle',e=>{if(e.target.matches('details')){stopTour();if(e.target.open)animate(e.target);}},true);
  $('#demo-tour').setAttribute('aria-pressed','false');
  $('#demo-tour').addEventListener('click',()=>{
    if(tour){stopTour();announce('Tour pausado. Explore as abas no seu ritmo.');return;}
    $('#demo-tour').textContent='Pausar tour';$('#demo-tour').setAttribute('aria-pressed','true');announce('Tour iniciado. Você pode pausar a qualquer momento.');
    tour=setInterval(()=>{const i=tabs.findIndex(t=>t.dataset.view===current);render(tabs[(i+1)%tabs.length].dataset.view,false);},5000);
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stopTour();},{threshold:0}).observe($('#hub-demo'));
  $('.demo-tabs').setAttribute('aria-orientation','horizontal');
  if('IntersectionObserver' in window){const reveal=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-seen');reveal.unobserve(entry.target);}});},{threshold:.2});reveal.observe($('.system'));}
})();
