const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/clients.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const count = (html.match(/class="client-logo"/g) || []).length;
assert.equal(count, 31);
const logoPaths = [...html.matchAll(/class="client-logo"><img src="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(logoPaths).size, 31, 'No duplicate logos');
const priorityLogos = ['falcao.png', 'sali-pilates.svg', 'stefane-medina.png', 'bios.png', 'batista.png', 'tera-science.png', 'face-doctor.png'];
for (const file of priorityLogos) {
  assert(logoPaths.slice(0, 12).includes('assets/img/clients/' + file), file + ' must appear on the first desktop page');
}
assert.deepEqual(logoPaths.slice(0, 4).map(file => path.basename(file)), ['falcao.png', 'clinica-jardim.svg', 'bios.png', 'sttudio-art-life.svg']);
assert(!html.includes('class="client-logo" data-reveal'));
function setup(width, absent = false) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, handlers: {}, attributes: {}, textContent: '',
      classList: {add() {}},
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(event, handler) { this.handlers[event] = handler; }
    });
    return elements.get(id);
  }
  const cards = Array.from({length: count}, (_, i) => element('logo-' + i));
  const grid = element('clients-grid');
  grid.querySelectorAll = () => cards;
  const queries = new Map();
  function matchMedia(query) {
    const max = Number(query.match(/\d+/)[0]);
    const media = {matches: width <= max, addEventListener(event, fn) { this.change = fn; }};
    queries.set(max, media);
    return media;
  }
  vm.runInNewContext(source, {
    document: {getElementById: id => absent ? null : element(id)},
    window: {}, matchMedia
  });
  return {
    element, cards, grid,
    shown: () => cards.map((c, i) => !c.hidden ? i : -1).filter(i => i >= 0),
    resize(nextWidth) {
      const changed = [...queries].filter(([max, media]) => media.matches !== (nextWidth <= max));
      for (const [max, media] of queries) media.matches = nextWidth <= max;
      for (const [,media] of changed) media.change();
    }
  };
}
for (const [width, size] of [[1440,12],[1025,12],[1024,8],[768,8],[641,8],[640,4],[390,4],[320,4]]) {
  const s = setup(width);
  assert.equal(s.shown().length, size);
  const pages = Math.ceil(count / size);
  const visited = new Set();
  for (let page = 0; page < pages; page++) {
    const shown = s.shown();
    assert.deepEqual(shown, Array.from({length:Math.min(size,count-page*size)},(_,i)=>page*size+i));
    shown.forEach(i => visited.add(i));
    assert(s.element('clients-position').textContent.startsWith('Página ' + (page+1) + ' de ' + pages));
    s.element('clients-next').handlers.click();
  }
  assert.equal(visited.size, count);
  assert.equal(s.shown()[0], 0);
  s.element('clients-prev').handlers.click();
  assert.equal(s.shown()[0], (pages-1)*size);
  for (const [key, first] of [['Home',0],['ArrowRight',size],['ArrowLeft',0],['End',(pages-1)*size]]) {
    s.grid.handlers.keydown({target:s.grid,key,preventDefault(){}});
    assert.equal(s.shown()[0],first);
  }
  s.grid.handlers.touchstart({touches:[{clientX:200,clientY:100}]});
  s.grid.handlers.touchend({changedTouches:[{clientX:80,clientY:110}]});
  assert.equal(s.shown()[0],0);
  s.grid.handlers.touchstart({touches:[{clientX:200,clientY:100}]});
  s.grid.handlers.touchend({changedTouches:[{clientX:140,clientY:300}]});
  assert.equal(s.shown()[0],0, 'Vertical scroll must not change pages');
}
const resized = setup(1440);
resized.element('clients-next').handlers.click();
resized.element('clients-next').handlers.click();
resized.resize(390);
assert.equal(resized.shown()[0],24);
assert.equal(resized.shown().length,4);
resized.resize(768);
assert.equal(resized.shown()[0],24);
assert.equal(resized.shown().length,7);
resized.resize(1440);
assert.equal(resized.shown()[0],24);
setup(1440,true); // Service pages without this section must remain safe.
assert(!/setInterval|setTimeout/.test(source), 'No autoplay timers');
console.log('PASS: 31 logos, 12/8/4 per page, all pages reachable, wraparound, keyboard, swipe, vertical scroll, breakpoint changes and no autoplay.');
