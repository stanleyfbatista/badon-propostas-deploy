// Tests the actual carousel code without browser dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
const elements = new Map();
function element(selector) {
  if (!elements.has(selector)) {
    const classes = new Set();
    const attributes = new Map();
    elements.set(selector, {
      _text: '', children: [], hidden: true, handlers: {},
      get textContent() { return this._text; },
      set textContent(value) { this._text = value; this.children = []; },
      replaceChildren(...children) { this._text = ''; this.children = children; },
      contains(child) { return this.children.includes(child); },
      classList: {
        add: value => classes.add(value),
        toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
        contains: value => classes.has(value)
      },
      setAttribute: (key, value) => attributes.set(key, value),
      getAttribute: key => attributes.get(key),
      addEventListener(type, callback) { this.handlers[type] = callback; }
    });
  }
  return elements.get(selector);
}
let imageId = 0;
const document = {createElement(tag) {
  assert.equal(tag, 'img');
  return element('image-' + imageId++);
}};
const context = vm.createContext({window: {}, document, $: element, Intl, Date});
vm.runInContext(fs.readFileSync(path.join(base, 'assets/js/reviews.js'), 'utf8'), context);
const main = fs.readFileSync(path.join(base, 'assets/js/main.js'), 'utf8');
const start = main.indexOf('  // Manual transcription');
const end = main.indexOf('  // Everything is readable', start);
assert(start >= 0 && end > start);
vm.runInContext(main.slice(start, end), context);
const reviews = context.window.BADON_REVIEWS;
assert.equal(reviews.length, 14);
assert.equal(new Set(reviews.map(r => r.name)).size, 14);
assert.equal(reviews.filter(r => r.photo).length, 11);
assert.equal(reviews.filter(r => !r.photo).map(r => r.name).join(', '), 'Sara Campos, Murilo Lima, Mayara Bento');
const expectedPhotos = {
  'Matheus Amaral': 'matheus-amaral', 'Lucas Toledo': 'lucas-toledo',
  'Isabella Morales': 'isabella-morales', 'Bia Campos': 'bia-campos',
  'Guilherme Poldi': 'guilherme-poldi', 'Clínica Jardim - Psicologia e Saúde': 'clinica-jardim',
  'Philippe Bento': 'philippe-bento', 'Evellyn Isley': 'evellyn-isley',
  'Guilherme Silva': 'guilherme-silva', 'Matheus Ferreira': 'matheus-ferreira',
  'Gabriel Barbosa dos Santos': 'gabriel-barbosa-dos-santos'
};
const avatar = element('#review-avatar');
const next = element('#review-next');
const prev = element('#review-prev');
const expand = element('#review-expand');
const text = element('#review-text');
for (const review of reviews) {
  if (review.photo) {
    assert.equal(review.photo, 'assets/img/reviews/' + expectedPhotos[review.name] + '.png');
    assert(fs.existsSync(path.join(base, review.photo)));
    assert.equal(avatar.children.length, 1);
    assert.equal(avatar.children[0].src, review.photo);
    assert.equal(avatar.children[0].alt, '');
  } else {
    assert.equal(avatar.children.length, 0);
    assert(avatar.textContent.length >= 2);
  }
  assert.equal(text.textContent, review.text);
  assert.equal(element('#review-name').textContent, review.name);
  assert.equal(element('#review-date').dateTime, review.date);
  assert.equal(element('.review-stars').getAttribute('aria-label'), '5 de 5 estrelas');
  assert.equal(element('#review-original').href, 'https://www.google.com/maps?cid=13259353907984930597');
  assert.equal(expand.getAttribute('aria-expanded'), 'false');
  assert.equal(expand.hidden, review.text.length < 200);
  if (!expand.hidden) {
    expand.handlers.click();
    assert.equal(expand.getAttribute('aria-expanded'), 'true');
    assert(!text.classList.contains('is-collapsed'));
    expand.handlers.click();
    assert(text.classList.contains('is-collapsed'));
  }
  next.handlers.click();
}
assert.equal(element('#review-name').textContent, reviews[0].name);
prev.handlers.click();
assert.equal(element('#review-name').textContent, reviews[13].name);
const card = element('.testimonial-card');
card.handlers.keydown({target:card, key:'ArrowRight', preventDefault(){}});
assert.equal(element('#review-name').textContent, reviews[0].name);
card.handlers.touchstart({changedTouches:[{clientX:200}]});
card.handlers.touchend({changedTouches:[{clientX:100}]});
assert.equal(element('#review-name').textContent, reviews[1].name);
// Broken images fall back to initials, but late errors cannot erase a newer slide.
prev.handlers.click();
const brokenImage = avatar.children[0];
brokenImage.handlers.error();
assert.equal(avatar.textContent, 'MA');
assert.equal(avatar.children.length, 0);
next.handlers.click();
next.handlers.click();
const currentImage = avatar.children[0];
brokenImage.handlers.error();
assert.equal(avatar.children[0], currentImage);
assert.equal(currentImage.src, reviews[2].photo);
console.log('PASS: 14 reviews, 11 matching photos, 3 initials, image error/race fallback, text, dates, stars, expansion, navigation and honest source links.');
