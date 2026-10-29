// Export only the institutional site's public files. Never remove other public routes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = path.resolve(__dirname, '..');
const target = path.resolve(source, '../public');
const origin = 'https://produtorabadon.com';
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const pages = [path.join(source,'index.html'), ...walk(path.join(source,'blog')), ...walk(path.join(source,'servicos'))].filter(p => p.endsWith('.html'));
const exported = [];
const publicPath = relative => relative.replace(/index\.html$/, '').replace(/^blog\/cara-de-empresa-grande\.html$/, 'blog/cara-de-empresa-grande');
for (const file of pages) {
  const relative = path.relative(source,file);
  const url = origin + '/' + publicPath(relative);
  let html = fs.readFileSync(file,'utf8')
    .replace(/<meta name="robots" content="noindex,\s*nofollow">/g, '<meta name="robots" content="index, follow">')
    .replace(/\s*<aside class="review-badge">[\s\S]*?<\/aside>/g, '')
    .replace('<br>Prévia para revisão, não publicada.', '')
    .replace('<small>Prévia local para revisão · ainda não publicada na hospedagem.</small>', '<small>© 2026 Produtora Bādon.</small>')
    .replace(/\s*<div class="client-logo"><img src="assets\/img\/clients\/escudo-h\.svg"[^>]*><span>Nome a confirmar<\/span><\/div>/g, '')
    .replace('Não foi confirmado qual repositório motivou a sugestão original desta pauta.', 'Recursos e disponibilidade podem mudar após a data da consulta.')
    .replace('https://produtorabadon.com/assets/img/og-badon.webp', 'https://produtorabadon.com/assets/img/hero-stanley.webp');
  html = html.replace('</head>', '<link rel="canonical" href="' + url + '">\n</head>');
  if (!html.includes('property="og:url"')) html = html.replace('</head>', '<meta property="og:url" content="' + url + '">\n</head>');
  assert(!/noindex|PRÉVIA PARA REVISÃO|Nome a confirmar|REVISAO\.md/.test(html), relative);
  const dest = path.join(target,relative);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,html);
  exported.push(relative);
}
// Copy approved asset trees; no tools, documentation, private config or node_modules.
for (const directory of ['css','js','svg','img','previews']) {
  for (const file of walk(path.join(source,'assets',directory))) {
    if (path.basename(file).startsWith('.')) continue;
    const relative = path.relative(source,file);
    const dest = path.join(target,relative);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(file,dest);
    exported.push(relative);
  }
}
fs.writeFileSync(path.join(target,'robots.txt'), 'User-agent: *\nDisallow: /admin/\nDisallow: /api/\nDisallow: /f/\nDisallow: /painel\nDisallow: /entrar\nDisallow: /propostas/\nDisallow: /relatorios/\nSitemap: '+origin+'/sitemap.xml\n');
fs.writeFileSync(path.join(target,'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(file => '  <url><loc>'+origin+'/'+publicPath(path.relative(source,file))+'</loc></url>').join('\n')+'\n</urlset>\n');
console.log('Exportadas '+pages.length+' páginas e '+(exported.length-pages.length)+' assets, robots.txt e sitemap.xml. Outras rotas preservadas.');
