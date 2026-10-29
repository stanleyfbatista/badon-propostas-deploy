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

  const track = document.getElementById('project-track');
  const prev = document.querySelector('[data-project-prev]');
  const next = document.querySelector('[data-project-next]');
  if (track && prev && next) {
    const refresh = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    const move = direction => {
      const card = track.querySelector('.sales-project');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({left:direction * ((card ? card.getBoundingClientRect().width : track.clientWidth) + gap), behavior:motion.matches ? 'instant' : 'smooth'});
    };
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', refresh, {passive:true});
    window.addEventListener('resize', refresh, {passive:true});
    const controls = document.querySelector('.sales-carousel-controls');
    if (controls) controls.hidden = false;
    refresh();
  }

  const dialog = document.getElementById('project-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const heading = document.getElementById('project-dialog-title');
  const description = document.getElementById('project-dialog-description');
  const external = dialog.querySelector('[data-project-external]');
  const imageSlot = dialog.querySelector('[data-project-image-slot]');
  const frameSlot = dialog.querySelector('[data-project-frame]');
  const liveButton = dialog.querySelector('[data-load-project]');
  const closeButton = dialog.querySelector('[data-close-project]');
  const status = dialog.querySelector('[data-project-status]');
  if (![heading, description, external, imageSlot, frameSlot, liveButton, closeButton, status].every(Boolean)) return;
  const allowedOrigins = new Set(['https://clpfacilcursos.com', 'https://www.julianagalvaopsi.com.br', 'https://daviguedesengenharia.com.br']);
  let current;
  let opener;
  const clearFrame = () => frameSlot.replaceChildren();
  document.querySelectorAll('[data-open-project]').forEach(link => link.addEventListener('click', event => {
    const url = new URL(link.href);
    if (!allowedOrigins.has(url.origin)) return;
    const card = link.closest('.sales-project');
    const image = card && card.querySelector('img');
    const title = card && card.querySelector('h3');
    if (!image || !title) return;
    event.preventDefault();
    opener = link;
    const isStatic = link.dataset.openProject === 'davi';
    current = {url:url.href, name:title.textContent, isStatic};
    clearFrame();
    const preview = document.createElement('img');
    preview.src = isStatic ? '../assets/img/cases/paginas-de-vendas/davi-guedes-site-completo.webp' : image.getAttribute('src');
    preview.alt = isStatic ? 'Captura completa do site Davi Guedes Engenharia. Role para conhecer a apresentação.' : image.alt;
    preview.width = isStatic ? 1200 : image.width;
    preview.height = isStatic ? 5446 : image.height;
    imageSlot.replaceChildren(preview);
    imageSlot.hidden = false;
    external.href = current.url;
    heading.textContent = current.name;
    description.textContent = isStatic
      ? 'Apresentação com rolagem. Este projeto não permite incorporação; para usar menus e animações, abra o site completo.'
      : 'A prévia abaixo é uma imagem. Ao carregar a versão ao vivo, seu navegador acessa o site externo, que pode usar cookies e serviços próprios. Use a prévia para navegar ou abra o site completo.';
    liveButton.hidden = isStatic;
    liveButton.disabled = false;
    status.textContent = '';
    document.body.classList.add('sales-modal-open');
    dialog.showModal();
    dialog.querySelector('.sales-dialog-body').scrollTop = 0;
    closeButton.focus();
  }));
  liveButton.addEventListener('click', () => {
    if (!current || current.isStatic || liveButton.disabled) return;
    const frame = document.createElement('iframe');
    frame.title = 'Prévia ao vivo: ' + current.name;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    frame.referrerPolicy = 'no-referrer';
    frame.src = current.url;
    clearFrame();
    frameSlot.append(frame);
    imageSlot.hidden = true;
    liveButton.disabled = true;
    description.textContent = 'Você está acessando o site externo dentro desta janela. Ele pode usar cookies e serviços próprios. A prévia termina quando você fecha o projeto.';
    status.textContent = 'Prévia ao vivo solicitada. Role dentro dela para navegar. Se não aparecer ou alguma função estiver limitada, use “Abrir site completo”.';
    dialog.querySelector('.sales-dialog-body').scrollTop = 0;
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    clearFrame();
    imageSlot.replaceChildren();
    current = undefined;
    document.body.classList.remove('sales-modal-open');
    if (opener && opener.isConnected) opener.focus();
  });
})();
