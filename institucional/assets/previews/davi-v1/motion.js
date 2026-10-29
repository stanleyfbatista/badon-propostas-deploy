/* Native, restrained motion. The content remains legible at every scroll position. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stopped = () => reduced.matches;
  const header = document.querySelector('.header');
  const progressBar = document.querySelector('.reading-progress');
  let scheduled = false;
  function update() {
    scheduled = false;
    const y = window.scrollY;
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 55);
    progressBar.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, y / distance)) : 0})`;
  }
  function queue() { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', queue, {passive:true});
  window.addEventListener('resize', queue, {passive:true});
  window.addEventListener('pageshow', queue);
  update();
  const serviceImage = document.querySelector('.service-photo__image');
  const serviceItems = [...document.querySelectorAll('.service-choice')];
  let imageChange;
  serviceItems.forEach(item => {
    item.addEventListener('click', () => {
      serviceItems.forEach(other => {
        const active = other === item;
        other.setAttribute('aria-pressed', String(active));
        document.getElementById(other.getAttribute('aria-controls')).hidden = !active;
      });
      clearTimeout(imageChange);
      const nextImage = item.dataset.image;
      if (serviceImage.getAttribute('src') === nextImage) { serviceImage.classList.remove('is-changing'); return; }
      serviceImage.classList.add('is-changing');
      imageChange = setTimeout(() => {
        window.SITE_IMAGES.set(serviceImage, {
          src: nextImage,
          width: Number(item.dataset.imageWidth),
          height: Number(item.dataset.imageHeight),
          sizes: serviceImage.sizes,
          alt: item.dataset.alt
        });
        serviceImage.style.objectPosition = item.dataset.position || 'center 38%';
        document.querySelector('.service-photo figcaption').textContent = item.dataset.caption || 'Imagem conceitual';
        serviceImage.classList.remove('is-changing');
      }, stopped() ? 0 : 140);
    });
  });

  // Each composition enters once. Content is visible by default, including if
  // JavaScript, the observer or the animation API is unavailable.
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const targets = [...document.querySelectorAll('[data-reveal]')];
  const revealed = new WeakSet();
  const active = new Map();
  const compact = window.matchMedia('(max-width: 560px)');
  const ease = 'cubic-bezier(.22, .7, .22, 1)';

  function animate(target, frames, duration, delay, owner) {
    const animation = target.animate(frames, {duration, delay, easing: ease, fill: 'both'});
    active.set(animation, owner);
    const release = () => { active.delete(animation); animation.cancel(); };
    animation.onfinish = release;
    animation.oncancel = () => active.delete(animation);
  }

  function splitWords(heading) {
    // Keep original line breaks, nested spans and whitespace. The heading's
    // accessible name is read as one sentence, never as separate word fragments.
    const readable = heading.cloneNode(true);
    readable.querySelectorAll('br').forEach(br => br.replaceWith(' '));
    heading.setAttribute('aria-label', readable.textContent.replace(/\s+/g, ' ').trim());
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const words = [];
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { fragment.append(document.createTextNode(part)); return; }
        const word = document.createElement('span');
        word.className = 'reveal-word';
        word.setAttribute('aria-hidden', 'true');
        word.textContent = part;
        fragment.append(word);
        words.push(word);
      });
      node.replaceWith(fragment);
    });
    return words;
  }

  function reveal(target, immediate = false) {
    if (revealed.has(target)) return;
    revealed.add(target);
    observer.unobserve(target);
    target.dataset.revealed = 'true';
    if (immediate || stopped() || target.contains(document.activeElement)) return;
    const delay = compact.matches ? 0 : Math.min(200, Number(target.dataset.revealDelay) || 0);
    if (target.dataset.reveal === 'words') {
      const words = splitWords(target);
      const step = Math.min(compact.matches ? 28 : 38, 280 / Math.max(1, words.length - 1));
      words.forEach((word, index) => animate(word, [
        {opacity: 0, transform: 'translateY(.24em)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], compact.matches ? 520 : 650, index * step, target));
    } else if (target.dataset.reveal === 'image') {
      animate(target, [
        {opacity: .35, clipPath: 'inset(5% 0 0 0)'},
        {opacity: 1, clipPath: 'inset(0% 0 0 0)'}
      ], compact.matches ? 760 : 950, delay, target);
    } else {
      animate(target, [{opacity: 0}, {opacity: 1}], compact.matches ? 500 : 650, delay, target);
    }
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) reveal(entry.target);
    });
  }, {threshold: .12, rootMargin: '0px 0px -24px 0px'});
  targets.forEach(target => observer.observe(target));

  function finishActive() {
    active.forEach((owner, animation) => animation.cancel());
    active.clear();
  }
  function syncPreference() {
    if (stopped()) finishActive();
  }
  reduced.addEventListener('change', syncPreference);
  // A focused link or control must never wait for its entrance to finish.
  document.addEventListener('focusin', event => {
    targets.forEach(target => {
      if (target.contains(event.target)) reveal(target, true);
    });
    active.forEach((owner, animation) => {
      if (owner.contains(event.target)) animation.cancel();
    });
  });
  window.addEventListener('beforeprint', () => {
    finishActive();
    targets.forEach(target => reveal(target, true));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishActive();
  });
})();
