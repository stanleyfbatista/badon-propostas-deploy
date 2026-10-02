import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
execFileSync(process.env.PHP_BIN || '/opt/homebrew/opt/php@8.4/bin/php', ['tests/pixel.php']);
const source = fs.readFileSync('public/forms-assets/meta-pixel.js', 'utf8');
class Element {
  children = []; dataset = {}; listeners = {}; hidden = false;
  append(...nodes) { this.children.push(...nodes); }
  before(node) { this.previous = node; }
  setAttribute() {}
  addEventListener(name, fn) { this.listeners[name] = fn; }
  click() { this.listeners.click?.(); }
}
const validResult = {ok: true, redirect: '/f/confirmacao.php?r=' + 'a'.repeat(48), pixel: {id: '123456789012345', form_id: 7, event_id: 'b'.repeat(64)}};
function setup({storage = new Map(), gpc = false, pixel = '123456789012345', failStorage = false} = {}) {
  const form = new Element(), head = new Element();
  form.dataset = {metaPixel: pixel, pixelPath: '/f/test'};
  form.elements = {form_id: {value: '7'}};
  form.action = 'https://example.invalid/api/enviar.php';
  const location = {href: 'https://example.invalid/f/index.php?slug=test&email=private@example.invalid&fbclid=abc_123#private', assign(url) { location.destination = url; }};
  const timers = new Map(); let timerId = 0;
  const calls = [];
  const context = vm.createContext({
    document: {querySelector: () => form, createElement: () => new Element(), head},
    navigator: {globalPrivacyControl: gpc},
    sessionStorage: {getItem(key) {if (failStorage) throw Error(); return storage.get(key) ?? null;}, setItem(key, value) {if (failStorage) throw Error(); storage.set(key,value);}},
    location, history: {state: null, replaceState(_state, _title, url) {location.href = new URL(url, location.href).href;}},
    URL, AbortController, FormData: class {constructor(value) {assert.equal(value, form);}},
    setTimeout(fn, ms) {const id = ++timerId; timers.set(id, {fn, ms}); return id;}, clearTimeout(id) {timers.delete(id);},
    fetch: async (url, options) => {calls.push({url, options}); return context.response;},
    response: {ok: true, status: 200, json: async () => validResult},
  });
  context.window = context;
  vm.runInContext(source, context);
  const buttons = () => form.previous.children[3].children;
  const events = () => Array.from(context.fbq?.queue || []).filter(args => ['trackSingle', 'trackSingleCustom'].includes(args[0]));
  return {context, form, head, location, storage, calls, events, timers, accept: () => buttons()[0].click(), refuse: () => buttons()[1].click()};
}
const p = setup();
assert.equal(p.head.children.length, 0);
assert.equal(p.context.fbq, undefined);
p.context.BadonPixel.start(); p.context.BadonPixel.step(2, 5);
assert.equal(p.head.children.length, 0, 'No SDK or event before consent');
p.accept();
assert.equal(p.head.children.length, 1);
assert.equal(p.head.children[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
assert.equal(p.location.href, 'https://example.invalid/f/test?fbclid=abc_123');
assert.equal(p.events().filter(args => args[2] === 'PageView').length, 1);
assert.equal(p.events().filter(args => args[2] === 'BadonFormStart').length, 0, 'No replay of activity before consent');
assert.ok(p.context.fbq.queue.some(args => args[0] === 'set' && args[1] === 'autoConfig' && args[2] === false));
assert.ok(p.context.fbq.queue.some(args => args[0] === 'init' && args.length === 2));
p.context.BadonPixel.start(); p.context.BadonPixel.step(3, 5); p.context.BadonPixel.step(3, 5); p.context.BadonPixel.review();
assert.equal(p.events().filter(args => args[2] === 'BadonFormStep' && args[3].step_index === 3).length, 1);
assert.equal(p.events().filter(args => args[2] === 'Lead').length, 0);
await p.context.BadonPixel.submit(new Element());
const leads = p.events().filter(args => args[2] === 'Lead');
assert.equal(leads.length, 1);
assert.deepEqual(Object.keys(leads[0][3]), ['form_id']);
assert.equal(leads[0][4].eventID, validResult.pixel.event_id);
assert.equal(p.calls[0].options.headers.Accept, 'application/json');
assert.equal(p.calls[0].url, 'https://example.invalid/api/enviar.php');
assert.ok(!JSON.stringify(p.events()).includes('private'));
assert.ok(!JSON.stringify(p.events()).includes('confirmacao'));
Array.from(p.timers.values()).find(t => t.ms === 250).fn();
assert.equal(p.location.destination, validResult.redirect);
const repeat = setup({storage: p.storage});
await repeat.context.BadonPixel.submit(new Element());
assert.equal(repeat.events().filter(args => args[2] === 'Lead').length, 0, 'No duplicated confirmed event on retry/reload');
assert.equal(setup({storage: p.storage, pixel: '987654321098765'}).head.children.length, 0, 'Consent is not shared with a different Pixel');
p.refuse();
const afterRevoke = p.events().length;
p.context.BadonPixel.step(4, 5); p.context.BadonPixel.review();
assert.equal(p.context.BadonPixel.canTrack(), false);
assert.equal(p.events().length, afterRevoke);
const denied = setup(); denied.refuse(); denied.context.BadonPixel.start();
assert.equal(denied.head.children.length, 0);
const gpc = setup({gpc: true}); gpc.accept();
assert.equal(gpc.head.children.length, 0);
assert.equal(gpc.context.BadonPixel.canTrack(), false);
const noStorage = setup({failStorage: true}); noStorage.accept(); noStorage.refuse();
assert.equal(noStorage.context.BadonPixel.canTrack(), false);
for (const response of [
  {ok: false, status: 422, json: async () => ({error: 'invalid'})},
  {ok: false, status: 500, json: async () => {throw Error();}},
  {ok: true, status: 200, json: async () => ({...validResult, redirect: 'https://evil.invalid'})},
]) {
  const failure = setup(); failure.accept(); failure.context.response = response;
  const button = new Element(); button.disabled = true;
  await failure.context.BadonPixel.submit(button);
  assert.equal(failure.events().filter(args => args[2] === 'Lead').length, 0);
  assert.equal(button.disabled, false);
  assert.equal(failure.location.destination, undefined);
}
assert.equal(setup({pixel: '<script>'}).context.BadonPixel, undefined);
console.log('OK: Pixel só após consentimento, etapas sem respostas, Lead só confirmado, deduplicação, recusa, GPC, falhas e URL privada protegida. Nenhuma chamada à Meta.');
