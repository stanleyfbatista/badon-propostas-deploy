const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
const section = html.match(/<section[^>]+id="cases"[\s\S]*?<\/section>/)[0];
const cards = [...section.matchAll(/<article class="case-card[\s\S]*?<\/article>/g)].map(m => m[0]);
const expected = ['birra-sob-controle', 'clp-facil', 'clinica-jardim', 'translife', 'nova-molina', 'casa-supremo'];
const source = js.slice(js.indexOf('const detailContent = {') + 'const detailContent = '.length, js.indexOf('\n\n  function openDialog'));
const details = vm.runInNewContext('(' + source.trim().replace(/;$/, '') + ')', {}, {timeout: 1000});
assert.equal(cards.length, 6);
assert.match(cards[0], /juliana-macbook-v1\.webp/);
assert.match(cards[1], /clp-facil-macbook-v1\.webp/);
assert.match(details['birra-sob-controle'].body, /birra-sob-controle\.png/);
assert.match(details['clp-facil'].body, /clp-facil\.png/);
assert.deepEqual(cards.map(card => card.match(/data-detail="([^"]+)"/)[1]), expected);
assert.doesNotMatch(section, /fictício|demonstração|demo-tag|Ver projeto de exemplo/i);
for (const [index, id] of expected.entries()) {
  assert.ok(details[id], 'Missing modal: ' + id);
  assert.doesNotMatch(details[id].body, /fictício|demonstração de layout/i);
  assert.ok(cards[index].includes('aria-label="Ver projeto ' + details[id].title + '"'));
  for (const match of (cards[index] + details[id].body).matchAll(/<img\b[^>]*>/g)) {
    const src = match[0].match(/src="([^"]+)"/)[1];
    assert.ok(fs.existsSync(path.join(root, src)), 'Missing image: ' + src);
    assert.match(match[0], /alt="[^"]+"/);
  }
}
assert.match(details['birra-sob-controle'].body, /https:\/\/www.julianagalvaopsi.com.br\/birra-sob-controle\//);
assert.doesNotMatch(details['birra-sob-controle'].body, /CLP Fácil/);
assert.match(details['clp-facil'].body, /https:\/\/clpfacilcursos.com\/clp-do-zero-ao-avancado\/Alt-jul26-001\//);
assert.doesNotMatch(details['clp-facil'].body, /Juliana Galvão/);
for (const term of ['Criação do produto digital', 'Criação da página de vendas', 'Criação do e-book', 'Gestão de tráfego para vendas', 'Estratégias de vendas']) {
  assert.ok(details['birra-sob-controle'].body.includes(term), 'Missing Juliana scope: ' + term);
}
for (const term of ['Criação da página de vendas', 'Coprodução', 'Gestão de anúncios', 'Estratégia de vendas']) {
  assert.ok(details['clp-facil'].body.includes(term), 'Missing CLP scope: ' + term);
}
console.log('PASS: six real cases, individual sales projects, matching modals, accessible labels and existing images.');
