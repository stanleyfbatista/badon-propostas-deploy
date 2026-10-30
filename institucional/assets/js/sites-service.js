/* Native, progressively enhanced sales interactions. No analytics or external frame until requested. */
(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let transition;
  const stopMotion = () => { if (transition) transition.cancel(); transition = undefined; };
  const enter = element => {
    stopMotion();
    if (!motion.matches && typeof element.animate === 'function') {
      transition = element.animate([
        {opacity: .25, transform: 'translateY(8px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 320, easing: 'cubic-bezier(.16,1,.3,1)'});
    }
  };
  if (typeof motion.addEventListener === 'function') motion.addEventListener('change', stopMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });

  const demo = document.querySelector('[data-device-demo]');
  if (demo) {
    const controls = demo.querySelector('.sites-device-controls');
    const buttons = Array.from(demo.querySelectorAll('[data-device]'));
    const status = demo.querySelector('[data-device-status]');
    const panels = buttons.map(button => document.getElementById(button.getAttribute('aria-controls')));
    if (controls && status && buttons.length === 2 && panels.every(Boolean)) {
      buttons.forEach((button, index) => button.addEventListener('click', () => {
        if (button.getAttribute('aria-pressed') === 'true') return;
        buttons.forEach((item, i) => item.setAttribute('aria-pressed', String(index === i)));
        panels.forEach((panel, i) => { panel.hidden = index !== i; });
        status.textContent = index === 0 ? 'Prévia para computador.' : 'Prévia para celular.';
        enter(panels[index]);
      }));
      controls.hidden = false;
    }
  }

  const cms = document.querySelector('[data-cms-demo]');
  if (cms) {
    const input = cms.querySelector('input');
    const apply = cms.querySelector('[data-demo-apply]');
    const title = cms.querySelector('[data-demo-title]');
    const status = cms.querySelector('[data-demo-status]');
    if (input && apply && title && status) {
      const update = () => {
        const value = input.value.trim().slice(0, 70);
        input.setCustomValidity(value ? '' : 'Escreva um título para testar a prévia.');
        if (!input.reportValidity()) return;
        title.textContent = value;
        status.textContent = 'Prévia atualizada nesta tela. Nada foi publicado ou salvo.';
        enter(title);
      };
      input.disabled = false;
      apply.disabled = false;
      apply.addEventListener('click', update);
      input.addEventListener('input', () => input.setCustomValidity(''));
      input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); update(); } });
    }
  }


  // Scroll interpolation smooths wheel steps without running a perpetual animation.
  const marquee = document.querySelector('.sales-marquee');
  if (marquee && typeof IntersectionObserver === 'function') {
    const lines = Array.from(marquee.querySelectorAll('.sales-marquee-line span'));
    let visible = false, raf = 0, current = 0, target = 0, last = 0;
    const paint = () => lines.forEach((line, i) => { line.style.transform = 'translate3d(' + (i ? -330 + current * 300 : -30 - current * 300).toFixed(3) + 'px,0,0)'; });
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; lines.forEach(line=>line.style.removeProperty('will-change')); };
    const render = time => {
      raf = 0;
      if (!visible || document.hidden || motion.matches) return stop();
      const elapsed = last ? Math.min(64,time-last) : 16;
      last = time;
      current += (target-current) * (1-Math.exp(-elapsed/90));
      if (Math.abs(target-current)<.0001) current=target;
      paint();
      if (current!==target) raf=requestAnimationFrame(render); else stop();
    };
    const update = () => {
      if (!visible || document.hidden || motion.matches) return stop();
      const rect=marquee.getBoundingClientRect();
      target=Math.max(0,Math.min(1,(window.innerHeight-rect.top)/(window.innerHeight+rect.height)));
      lines.forEach(line=>line.style.willChange='transform');
      if (!raf) raf=requestAnimationFrame(render);
    };
    new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if (visible) {
        const rect=marquee.getBoundingClientRect();
        current=target=Math.max(0,Math.min(1,(window.innerHeight-rect.top)/(window.innerHeight+rect.height)));
        if (!motion.matches) paint();
        update();
      } else stop();
    }).observe(marquee);
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update,{passive:true});
    document.addEventListener('visibilitychange',()=>document.hidden?stop():update());
    motion.addEventListener('change',()=>{
      stop();
      if (motion.matches) lines.forEach(line=>line.style.removeProperty('transform')); else update();
    });
  }

  const dialog = document.getElementById('project-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const heading = document.getElementById('project-dialog-title');
  const description = document.getElementById('project-dialog-description');
  const imageSlot = dialog.querySelector('[data-project-image-slot]');
  const frameSlot = dialog.querySelector('[data-project-frame]');
  const closeButton = dialog.querySelector('[data-close-project]');
  const status = dialog.querySelector('[data-project-status]');
  if (![heading,description,imageSlot,frameSlot,closeButton,status].every(Boolean)) return;
  const projects = {
    davi:{url:'../assets/previews/davi-v1/index.html',local:true},
    clp:{url:'https://clpfacilcursos.com/clp-do-zero-ao-avancado/Alt-jul26-001/'},
    juliana:{url:'https://www.julianagalvaopsi.com.br/birra-sob-controle/'},
    'forma-norte':{url:'../assets/previews/templates-v1/forma-norte/index.html',local:true,template:true},
    serena:{url:'../assets/previews/templates-v1/serena/index.html',local:true,template:true},
    eixo:{url:'../assets/previews/templates-v1/eixo/index.html',local:true,template:true},
    entrelacos:{url:'../assets/previews/templates-v1/entrelacos/index.html',local:true,template:true}
  };
  let opener;
  const clearFrame = () => frameSlot.replaceChildren();
  document.querySelectorAll('[data-open-project]').forEach(button => button.addEventListener('click', () => {
    const project = projects[button.dataset.openProject];
    const card = button.closest('.sales-project');
    const title = card && card.querySelector('h3');
    if (!project || !title) return;
    opener=button;
    clearFrame();
    imageSlot.hidden=true;
    heading.textContent=title.textContent;
    description.textContent=project.template
      ? 'Projeto demonstrativo adaptado de template adquirido. Explore a página e as animações nesta janela. Contatos, cadastros e compras estão desativados.'
      : project.local
      ? 'Prévia interativa de demonstração, hospedada no portfólio. Menus e animações disponíveis; contatos externos desativados. Não é uma transmissão ao vivo do site original.'
      : 'Prévia ao vivo do site externo. Ao abrir este projeto, seu navegador acessa serviços e cookies próprios dele. Navegue dentro desta janela.';
    status.textContent='Carregando a prévia…';
    const frame=document.createElement('iframe');
    frame.title='Prévia do projeto: '+title.textContent;
    frame.setAttribute('sandbox',project.local?'allow-scripts':'allow-scripts allow-same-origin');
    frame.referrerPolicy='no-referrer';
    frame.addEventListener('load',()=>{
      if (frame.isConnected) status.textContent='Role dentro da prévia para explorar o projeto. Feche no × para voltar ao portfólio.';
    });
    frame.src=project.url;
    frameSlot.append(frame);
    document.body.classList.add('sales-modal-open');
    dialog.showModal();
    dialog.querySelector('.sales-dialog-body').scrollTop=0;
    closeButton.focus();
  }));
  closeButton.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog) return;
    const bounds=dialog.getBoundingClientRect();
    if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close',()=>{
    clearFrame();
    document.body.classList.remove('sales-modal-open');
    if(opener&&opener.isConnected) opener.focus();
  });
})();
