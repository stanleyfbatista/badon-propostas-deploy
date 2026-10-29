/* Progressive enhancement: the desktop preview remains visible without JS. */
(() => {
  'use strict';
  const demo = document.querySelector('[data-device-demo]');
  if (!demo) return;
  const controls = demo.querySelector('.sites-device-controls');
  const buttons = Array.from(demo.querySelectorAll('[data-device]'));
  const status = demo.querySelector('[data-device-status]');
  const panels = buttons.map(button => document.getElementById(button.getAttribute('aria-controls')));
  if (!controls || !status || buttons.length !== 2 || panels.some(panel => !panel)) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let transition;
  const stopMotion = () => { if (transition) transition.cancel(); transition = undefined; };
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      stopMotion();
      buttons.forEach((item, itemIndex) => item.setAttribute('aria-pressed', String(index === itemIndex)));
      panels.forEach((panel, panelIndex) => { panel.hidden = index !== panelIndex; });
      status.textContent = index === 0 ? 'Prévia para computador.' : 'Prévia para celular.';
      if (!motion.matches && typeof panels[index].animate === 'function') {
        transition = panels[index].animate([
          { opacity: 0, transform: 'translateY(8px) scale(.985)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' }
        ], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
  });
  if (typeof motion.addEventListener === 'function') motion.addEventListener('change', stopMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMotion(); });
  controls.hidden = false;
})();
