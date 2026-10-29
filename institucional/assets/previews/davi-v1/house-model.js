(() => {
/** Subtle perspective on the approved photograph; no WebGL or 3D model download. */
const host = document.querySelector('#house-model');
const section = document.querySelector('.conversation');
const picture = host?.querySelector('.model-fallback');
const hint = document.querySelector('.model-scroll-hint');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const stopped = () => reduced.matches;
let visible = false, frame = 0, current = 0, target = 0;
function reset() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  picture.style.removeProperty('transform');
  picture.style.removeProperty('will-change');
  hint.hidden = true;
}
function render() {
  frame = 0;
  if (!visible || stopped() || document.hidden) return;
  current += (target - current) * .12;
  picture.style.transform = `perspective(1200px) rotateY(${current * 1.4}deg) rotateX(${current * -.4}deg) scale(1.035)`;
  if (Math.abs(target - current) > .001) frame = requestAnimationFrame(render);
}
function update() {
  if (!visible || stopped() || document.hidden) { reset(); return; }
  const rect = section.getBoundingClientRect();
  // Follow the section's passage through the viewport, without an artificial
  // sticky-scroll interval. This also works when the section is shorter than it.
  const distance = window.innerHeight + rect.height;
  target = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / distance)) * 2 - 1;
  picture.style.willChange = 'transform';
  hint.hidden = false;
  if (!frame) frame = requestAnimationFrame(render);
}
if (host && section && picture && hint && 'IntersectionObserver' in window) {
  hint.hidden = true;
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    update();
  }, {rootMargin: '80px'});
  observer.observe(host);
  window.addEventListener('scroll', update, {passive: true});
  window.addEventListener('resize', update, {passive: true});
  reduced.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', reset);
  window.addEventListener('pageshow', update);
}

})();