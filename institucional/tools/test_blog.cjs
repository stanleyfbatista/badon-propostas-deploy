const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const articles = ['cara-de-empresa-grande', 'antes-de-anunciar', 'site-e-contato', 'perfil-local', 'marca-consistente', 'atualizacao-chatgpt-astra-sol', 'atualizacao-claude-haiku', 'engenharia-reversa-ia', 'google-atrair-clientes-regiao', 'algoritmo-instagram-conteudo'];
const archive = read('blog/index.html');
const home = read('index.html');
const script = read('assets/js/main.js');
assert.match(read('assets/css/blog.css'), /\.journal-header img\{object-fit:contain;height:auto\}/, 'Logo deve preservar a proporção sem cortar as letras');
for (const slug of articles) {
  const html = read('blog/' + slug + '.html');
  assert.ok(archive.includes(slug === 'cara-de-empresa-grande' ? 'href="' + slug + '"' : slug + '.html'));
  assert.match(script, new RegExp(slug));
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /assets\/css\/blog\.css/);
  assert.match(html, /aria-label="Neste artigo"/);
  assert.match(html, slug === 'cara-de-empresa-grande' ? /id="conversar"/ : /id="checklist"/);
  assert.match(html, /Fontes e leitura complementar/);
  assert.match(html, /https:\/\/unsplash.com\/license/);
  assert.match(html, /Redação Bādon/);
  assert.match(html, /noindex, nofollow/);
  assert.doesNotMatch(html, /CONTEÚDO DEMONSTRATIVO|EXEMPLO FICTÍCIO/);
  const source = html.match(/class="article-hero"><img src="([^"]+)"/)[1];
  assert.ok(fs.statSync(path.resolve(root, 'blog', source)).size > 1000);
  const text = html.split('class="article-prose">')[1].split('<section class="article-sources">')[0].replace(/<[^>]+>/g, ' ');
  assert.ok(text.split(/\s+/).length > 350);
}
assert.match(home, /id="all-posts" href="blog\/index.html"/);
assert.doesNotMatch(script, /function openPost|ARTIGOS DE EXEMPLO|post\.paragraphs/);
assert.match(script, /location\.replace\('blog\//);
for (const service of ['trafego-pago', 'sites', 'google-meu-negocio', 'identidade-visual']) {
  const html = read('servicos/' + service + '.html');
  assert.match(html, /\.\.\/blog\/[a-z-]+\.html/);
  assert.doesNotMatch(html, /Ler exemplo|Conteúdo demonstrativo/);
}
assert.equal((archive.match(/<article class="journal-card"/g) || []).length, 10);
const reverse = read('blog/engenharia-reversa-ia.html');
for (const term of ['PhotoCraft', 'LightCraft', 'Remaster', 'Replica', 'REA', 're-skill']) {
  assert.ok(reverse.includes(term), 'Exemplo pesquisado ausente: ' + term);
}
assert.doesNotMatch(reverse, /mythos-preview|2605\.04114/);
assert.match(reverse, /sem instalação nem testes independentes/);
for (let section = 1; section <= 6; section++) {
  assert.ok(reverse.includes('href="#secao-' + section + '"'));
  assert.ok(reverse.includes('id="secao-' + section + '"'));
}
assert.equal((home.match(/data-page="/g) || []).length, 5);
assert.match(archive, /id="blog-category"/);
assert.match(archive, /assets\/js\/blog\.js/);
const vm = require('node:vm');
const cards = [{dataset:{category:'Inteligência artificial'}},{dataset:{category:'Inteligência artificial'}},{dataset:{category:'Sites'}}];
const select = {value:'',addEventListener(event, handler){this.change=handler;}};
const count = {};
const filter = {hidden:true};
vm.runInNewContext(read('assets/js/blog.js'), {document:{
  querySelector: selector => ({'#blog-category':select,'#blog-count':count,'.journal-filter':filter}[selector]),
  querySelectorAll: () => cards
}});
assert.equal(filter.hidden, false);
select.value = 'Inteligência artificial'; select.change();
assert.deepEqual(cards.map(card => card.hidden), [false,false,true]);
assert.equal(count.textContent, '2 artigos');
select.value = 'Sites'; select.change();
assert.equal(count.textContent, '1 artigo');
select.value = ''; select.change();
assert.ok(cards.every(card => !card.hidden));
console.log('Blog: 10 artigos, 5 páginas na home, filtros, imagens, fontes e links validados.');
