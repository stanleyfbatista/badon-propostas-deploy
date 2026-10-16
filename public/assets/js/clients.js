/* Manual client carousel. All logos remain readable if JavaScript is unavailable. */
(() => {
  'use strict';
  const grid = document.getElementById('clients-grid');
  const controls = document.getElementById('clients-controls');
  if (!grid || !controls) return;
  const cards = [...grid.querySelectorAll('.client-logo')];
  if (!cards.length) return;
  const previous = document.getElementById('clients-prev');
  const next = document.getElementById('clients-next');
  const position = document.getElementById('clients-position');
  const mobile = matchMedia('(max-width: 640px)');
  const tablet = matchMedia('(max-width: 1024px)');
  const pageSize = () => mobile.matches ? 4 : tablet.matches ? 8 : 12;
  let size = pageSize();
  let page = 0;

  function render() {
    const pages = Math.ceil(cards.length / size);
    const start = page * size;
    cards.forEach((card, index) => { card.hidden = index < start || index >= start + size; });
    position.textContent = 'Página ' + (page + 1) + ' de ' + pages + ' · ' +
      (start + 1) + '–' + Math.min(start + size, cards.length) + ' de ' + cards.length + ' marcas';
    controls.hidden = pages < 2;
    window.ScrollTrigger?.refresh();
  }
  function move(step) {
    const pages = Math.ceil(cards.length / size);
    page = (page + step + pages) % pages;
    render();
  }
  function resize() {
    const firstVisible = page * size;
    size = pageSize();
    page = Math.floor(firstVisible / size);
    render();
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  grid.addEventListener('keydown', event => {
    if (event.target !== grid) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      move(event.key === 'ArrowRight' ? 1 : -1);
    } else {
      page = event.key === 'Home' ? 0 : Math.ceil(cards.length / size) - 1;
      render();
    }
  });
  let touch = null;
  grid.addEventListener('touchstart', event => {
    touch = event.touches.length === 1 ? event.touches[0] : null;
  }, { passive: true });
  grid.addEventListener('touchend', event => {
    if (!touch || !event.changedTouches.length) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - touch.clientX;
    const dy = end.clientY - touch.clientY;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  }, { passive: true });
  grid.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
  mobile.addEventListener('change', resize);
  tablet.addEventListener('change', resize);
  grid.classList.add('clients-paged');
  grid.setAttribute('tabindex', '0');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-roledescription', 'carrossel');
  grid.setAttribute('aria-describedby', 'clients-position');
  render();
})();
