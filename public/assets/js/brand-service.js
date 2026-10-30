/* Progressive enhancement: no third-party scripts, tracking or persistent state. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const composition = document.querySelector('[data-brand-composition]');
  if (composition) {
    let frame = 0, x = 0, y = 0;
    const reset = () => { cancelAnimationFrame(frame); frame = 0; composition.style.removeProperty('--mx'); composition.style.removeProperty('--my'); };
    composition.addEventListener('pointermove', event => {
      if (reduced.matches || !fine.matches || event.pointerType === 'touch') return;
      const box = composition.getBoundingClientRect();
      x = Math.max(-7, Math.min(7, (event.clientX - box.left - box.width / 2) / box.width * 14));
      y = Math.max(-7, Math.min(7, (event.clientY - box.top - box.height / 2) / box.height * 14));
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; composition.style.setProperty('--mx', x + 'px'); composition.style.setProperty('--my', y + 'px'); });
    }, {passive:true});
    composition.addEventListener('pointerleave', reset);
    reduced.addEventListener('change', reset);
    document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  }
  const steps = [...document.querySelectorAll('.brand-step')];
  const number = document.querySelector('[data-process-number]');
  const label = document.querySelector('[data-process-label]');
  const progress = document.querySelector('[data-process-progress]');
  steps.forEach((step, index) => step.addEventListener('toggle', () => {
    if (!step.open) return;
    if (number) number.textContent = step.dataset.step;
    if (label) label.textContent = step.dataset.stepLabel;
    if (progress) progress.style.width = (index + 1) / steps.length * 100 + '%';
  }));
  const track = document.getElementById('brand-logo-track');
  const previous = document.querySelector('[data-brand-prev]');
  const next = document.querySelector('[data-brand-next]');
  if (track && previous && next) {
    document.querySelector('.brand-carousel-controls').hidden = false;
    const refresh = () => { previous.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2; };
    const move = direction => track.scrollBy({left: direction * (track.firstElementChild.getBoundingClientRect().width + 16), behavior: reduced.matches ? 'instant' : 'smooth'});
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('scroll', refresh, {passive:true});
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    window.addEventListener('resize', refresh, {passive:true});
    refresh();
  }
  const strip = document.querySelector('[data-brand-marquee]');
  if (strip && typeof IntersectionObserver === 'function') {
    let frame = 0, visible = false, current = 0, target = 0, last = 0;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
    const tick = time => {
      const elapsed = last ? Math.min(64, time - last) : 16;
      last = time;
      current += (target - current) * (1 - Math.exp(-elapsed / 90));
      strip.style.transform = 'translate3d(' + current.toFixed(3) + 'px,0,0)';
      if (Math.abs(target - current) > .05 && visible && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tick);
      else stop();
    };
    const update = () => {
      if (reduced.matches || document.hidden || !visible) { stop(); return; }
      target = Math.max(-300, Math.min(0, (strip.parentElement.getBoundingClientRect().top - window.innerHeight) * .2));
      if (!frame) frame = requestAnimationFrame(tick);
    };
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, {rootMargin:'100px'}).observe(strip.parentElement);
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update, {passive:true});
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', () => { stop(); if (reduced.matches) {current = 0; strip.style.removeProperty('transform');} else update(); });
  }
})();
