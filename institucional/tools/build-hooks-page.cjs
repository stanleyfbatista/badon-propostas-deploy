// Standalone gift delivery. Does not alter the blog, home or application routes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'institucional/guias/50-ganchos');
const target = path.join(root, 'public/presentes/50-ganchos');
const read = name => fs.readFileSync(path.join(source,'content',name),'utf8').trim();
const hooks = JSON.parse(read('50-ganchos.json'));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
assert.equal(hooks.length,50);
assert.equal(new Set(hooks.map(h=>h.gancho)).size,50);
const categories = [...new Set(hooks.map(h=>h.categoria))];
assert.equal(categories.length,5);
const prompts = ['adaptacao','reels','carrossel'].map(id=>({id,text:read('prompt-'+id+'.txt')}));
const promptNames = ['Escolher e adaptar ganchos','Criar um roteiro de Reel','Criar um carrossel'];
function editorial(text) {
  return text.split(/\n\s*\n/).filter(b=>! /^(Botão|Botões|Mensagem após|Mensagem se|Texto de apoio|Mensagem sugerida|“Oi, Stanley!)/.test(b)).map(b=>{
    if(b===b.toUpperCase() && b.length>8 && !b.includes('\n'))return '<h3>'+esc(b.charAt(0)+b.slice(1).toLowerCase()).replace(' ia',' IA')+'</h3>';
    return '<p>'+esc(b).replaceAll('\n','<br>')+'</p>';
  }).join('\n');
}
const closing = read('fechamento.txt');
const beforePrompts=closing.split('PROMPTS COPIÁVEIS')[0];
const checklist=closing.split('CHECKLIST ANTES DE PUBLICAR\n\n')[1].split('\n\nCOMO DESCOBRIR')[0].split('\n').map(l=>l.replace(/^□\s*/,''));
const learning=closing.split('COMO DESCOBRIR O QUE FUNCIONA PARA VOCÊ\n\n')[1].split('\n\nPERGUNTAS FREQUENTES')[0];
const faq=closing.split('PERGUNTAS FREQUENTES\n\n')[1].split('\n\nPRÓXIMO PASSO')[0].split('\n\n').map(pair=>{const [question,...answer]=pair.split('\n');return {question,answer:answer.join('\n')};});
const whatsapp=topic=>'https://wa.me/5519983256292?text='+encodeURIComponent('Oi, Stanley! Vim pelo guia dos 50 ganchos e quero conversar sobre '+topic+'.');
const cards=hooks.map(h=>`<article class="hook" data-category="${esc(h.categoria)}" id="gancho-${h.numero}">
  <details><summary><span class="hook-number">${String(h.numero).padStart(2,'0')}</span><span class="hook-heading"><span class="hook-category">${esc(h.categoria)}</span><span class="hook-title">${esc(h.gancho)}</span></span><span class="expand-mark" aria-hidden="true">+</span></summary>
  <div class="hook-content"><dl>${[['quando_usar_e_por_que','Quando usar e por quê'],['exemplo','Um exemplo'],['como_desenvolver','Como desenvolver'],['cuidado','Cuidado ao usar']].map(([k,label])=>`<div class="${k==='exemplo'?'hook-example':''}"><dt>${label}</dt><dd>${esc(h[k])}</dd></div>`).join('')}</dl>
  <div class="hook-actions" data-enhanced hidden><button type="button" data-copy-hook="${h.numero}" class="button button-small">Copiar gancho</button><button type="button" data-copy-card="${h.numero}" class="text-button">Copiar exemplo e orientações</button></div>
  <div class="hook-prompt-actions" data-enhanced hidden><span>Leve este gancho para a IA:</span><button type="button" data-hook-prompt="reels" data-hook="${h.numero}" class="text-button">Copiar prompt de Reel</button><button type="button" data-hook-prompt="carrossel" data-hook="${h.numero}" class="text-button">Copiar prompt de carrossel</button></div></div></details></article>`).join('\n');
const html=`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Seu presente: 50 ganchos para criar conteúdo | Stanley Batista · Bādon</title>
<meta name="description" content="Seu guia gratuito com 50 ganchos explicados, exemplos e prompts copiáveis para Reels e carrosséis. Por Stanley Batista, gestor de marketing da Produtora Bādon.">
<meta name="theme-color" content="#0a0a0c"><meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://produtorabadon.com/presentes/50-ganchos/">
<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Parabéns, aqui está o seu presente.">
<meta property="og:description" content="50 ganchos, exemplos e prompts para tirar suas próximas ideias do papel. Um presente de Stanley Batista e da Bādon.">
<meta property="og:url" content="https://produtorabadon.com/presentes/50-ganchos/">
<meta property="og:image" content="https://produtorabadon.com/presentes/50-ganchos/stanley-batista.webp">
<meta property="og:image:alt" content="Stanley Batista, gestor de marketing da Produtora Bādon">
<link rel="icon" href="simbolo-badon.svg" type="image/svg+xml">
<link rel="stylesheet" href="guia.css?v=20261031-1"><script src="guia.js?v=20261031-1" defer></script>
</head>
<body>
<a class="skip-link" href="#biblioteca">Pular para os 50 ganchos</a>
<header class="topbar wrap"><a href="/" aria-label="Ir ao site da Produtora Bādon"><img src="logo-badon.svg" width="172" height="28" alt="Produtora Bādon"></a><a href="/" class="site-link">Conhecer a Bādon <span aria-hidden="true">↗</span></a></header>
<main id="conteudo">
<section class="welcome wrap" aria-labelledby="welcome-title">
<div class="welcome-light" aria-hidden="true"></div>
<div class="gift-status"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span>Um presente para sua próxima ideia</span></div>
<h1 id="welcome-title">Parabéns, aqui está<br>o seu presente.</h1>
<p class="welcome-intro">Você veio pelo conteúdo. Agora é a sua vez de criar.</p>
<div class="gift-panel">
<div class="gift-content"><p class="gift-label">Guia prático de criação de conteúdo</p><h2>50 ganchos para seus<br class="desktop-break"> próximos conteúdos.</h2><p>Encontre uma boa abertura, entenda como usar e transforme a ideia em Reel ou carrossel com a ajuda da IA.</p>
<div class="hero-actions"><a class="button primary" href="#biblioteca">Explorar os 50 ganchos <span aria-hidden="true">↓</span></a></div>
<p class="download-note">Gratuito. Sem cadastro. Para consultar, copiar e adaptar.</p></div>
<div class="author"><img src="stanley-batista.webp" alt="Stanley Batista" width="900" height="900" fetchpriority="high"><div><h3>Eu sou Stanley Batista.</h3><p>Gestor de marketing, à frente da Produtora Bādon. Há mais de 6 anos, crio e cuido de marcas.</p><p class="author-note">Preparei este guia para ajudar você a mostrar o que sabe, com mais clareza e com o seu jeito de falar.</p></div></div>
</div>
</section>
<nav class="guide-nav wrap" aria-label="Navegação do presente"><a href="#como-usar">Como usar</a><a href="#biblioteca">Os 50 ganchos</a><a href="#prompts">Prompts para IA</a><a href="#conversar">Falar comigo</a></nav>
<section id="como-usar" class="section wrap">
<div class="section-heading"><p class="section-kicker">Da ideia ao conteúdo</p><h2>Uma boa abertura.<br>Uma entrega que faz sentido.</h2><p>O gancho é o começo da conversa, não uma promessa de viralização. Escolha uma pergunta real do seu público e responda com algo que você consegue mostrar.</p></div>
<ol class="quick-steps"><li><span>01</span><h3>Escolha a intenção</h3><p>Despertar curiosidade, ensinar, ajudar uma decisão ou mostrar seus bastidores?</p></li><li><span>02</span><h3>Traga para sua realidade</h3><p>Troque os campos entre colchetes. Use exemplos reais e o vocabulário do seu público.</p></li><li><span>03</span><h3>Desenvolva e revise</h3><p>Copie um prompt, preencha seu contexto e confira se o conteúdo entrega o que prometeu.</p></li></ol>
<details class="reading-panel"><summary>Entenda os ganchos e veja o passo a passo completo <span aria-hidden="true">+</span></summary><div class="reading-content">${editorial(read('abertura.txt').split('O QUE É UM GANCHO')[1].split('OS 50 GANCHOS')[0].replace(/^/,'O QUE É UM GANCHO'))}</div></details>
</section>
<section id="biblioteca" class="section library wrap" aria-labelledby="library-title">
<div class="section-heading"><p class="section-kicker">Sua biblioteca de aberturas</p><h2 id="library-title">Encontre o começo<br>da sua próxima conversa.</h2><p>Abra um gancho para ver quando usar, um exemplo e como desenvolver. Os colchetes mostram o que você deve personalizar.</p></div>
<div class="library-tools" data-enhanced hidden>
<label class="search-label" for="hook-search">Buscar por tema ou palavra</label><div class="search-row"><input id="hook-search" type="search" placeholder="Ex.: vídeo, site, fotografia..." autocomplete="off" aria-controls="hook-list"><button id="clear-filters" type="button" class="text-button">Limpar filtros</button></div>
<div class="filters" role="group" aria-label="Filtrar ganchos por intenção"><button type="button" data-filter="Todos" aria-pressed="true">Todos <span>50</span></button>${categories.map(c=>`<button type="button" data-filter="${esc(c)}" aria-pressed="false">${esc(c)} <span>10</span></button>`).join('')}</div>
<p id="result-count" role="status" aria-live="polite"></p></div>
<div id="hook-list">${cards}</div>
<div id="empty-state" class="empty-state" hidden><h3>Nenhum gancho encontrado.</h3><p>Tente outra palavra ou escolha outra categoria.</p></div>
<div class="library-more"><button id="show-more" type="button" class="button secondary" hidden>Mostrar mais 10 ganchos</button></div>
<noscript><p>Todos os 50 ganchos estão disponíveis abaixo dos filtros. Selecione os textos para copiar ou baixe o PDF.</p></noscript>
<p class="editorial-note">Os exemplos mostram possibilidades de aplicação, não resultados de clientes. Adapte e teste sem inventar histórias ou promessas.</p>
</section>
<section id="prompts" class="section prompts-section"><div class="wrap">
<div class="section-heading"><p class="section-kicker">Seu contexto faz a diferença</p><h2>Um gancho escolhido.<br>Agora, dê direção à IA.</h2><p>Copie um dos prompts completos, preencha os campos entre colchetes e use na IA de texto que preferir. Não precisa enviar dados pessoais de clientes ou informações confidenciais.</p></div>
<details class="reading-panel"><summary>Veja como preencher o contexto e usar os prompts <span aria-hidden="true">+</span></summary><div class="reading-content">${editorial(beforePrompts)}</div></details>
<div class="prompt-list">${prompts.map((p,i)=>`<article class="prompt-card"><div class="prompt-header"><h3>${promptNames[i]}</h3><button type="button" class="button button-small" data-copy-prompt="${p.id}" data-enhanced hidden aria-label="Copiar prompt: ${promptNames[i]}">Copiar prompt</button></div><p>${['Para encontrar a abertura que combina com sua entrega.','Para planejar fala, cenas e uma conclusão coerente.','Para criar uma sequência que desenvolve a ideia, slide a slide.'][i]}</p><details><summary>Ler o prompt completo <span aria-hidden="true">+</span></summary><pre id="prompt-${p.id}" tabindex="0">${esc(p.text)}</pre></details></article>`).join('')}</div>
</div></section>
<section class="section wrap" id="revisao"><div class="section-heading"><h2>Antes de publicar,<br>faça esta revisão.</h2><p>Use a lista como apoio. As marcações ficam apenas nesta página e não são enviadas para ninguém.</p></div>
<div class="checklist">${checklist.map((item,i)=>`<label><input type="checkbox" name="review-${i}"><span>${esc(item)}</span></label>`).join('')}</div>
<details class="reading-panel"><summary>Como descobrir o que funciona para você <span aria-hidden="true">+</span></summary><div class="reading-content">${editorial(learning)}</div></details>
</section>
<section class="section wrap faq"><div class="section-heading"><h2>Antes de começar,<br>algumas respostas.</h2></div>${faq.map(f=>`<details class="faq-item"><summary>${esc(f.question)}<span aria-hidden="true">+</span></summary><p>${esc(f.answer)}</p></details>`).join('')}</section>
<section id="conversar" class="section wrap"><div class="contact-panel"><img src="stanley-batista.webp" alt="" width="80" height="80" loading="lazy"><h2>Vamos cuidar do próximo<br>passo da sua marca?</h2><p>Um bom conteúdo começa com uma ideia. Uma marca bem cuidada conecta essa ideia ao site, à comunicação e ao negócio.</p><p>Se você quer apoio para colocar isso em prática, me conte o que faz e o que quer melhorar.</p><div class="service-contacts" aria-label="Conversar sobre um serviço">${[['consultoria','Consultoria'],['criação de sites','Criação de sites'],['gestão de marketing','Gestão de marketing'],['criação de conteúdo','Criação de conteúdo']].map(([topic,label])=>`<a href="${esc(whatsapp(topic))}" target="_blank" rel="noopener noreferrer" aria-label="Conversar sobre ${label} no WhatsApp">${label}<span aria-hidden="true">↗</span></a>`).join('')}</div><a class="button primary" href="${esc(whatsapp('minha marca'))}" target="_blank" rel="noopener noreferrer">Conversar com Stanley no WhatsApp <span aria-hidden="true">↗</span></a><a class="site-link contact-site" href="/">Conhecer o site principal da Bādon</a></div></section>
<section class="section wrap" id="baixar-guia" aria-labelledby="download-title"><div class="download-strip"><div><h2 id="download-title">Leve seu presente com você.</h2><p>Baixe o PDF com os 50 ganchos explicados, os três prompts e todas as orientações. Consulte quando precisar, copie ou envie o arquivo à sua IA.</p></div><a class="button primary" href="guia-50-ganchos-badon.pdf" download="Guia-50-Ganchos-Badon.pdf">Baixar o guia completo em PDF <span aria-hidden="true">↓</span></a></div></section>
</main>
<footer class="wrap footer"><a href="/" aria-label="Site da Produtora Bādon"><img src="logo-badon.svg" width="172" height="28" alt="Produtora Bādon" loading="lazy"></a><p>Conteúdo de Stanley Batista e Produtora Bādon.<br>Um presente para adaptar à sua realidade.</p><a href="/privacidade/">Privacidade</a></footer>
<div class="copy-feedback" id="copy-feedback" role="status" aria-live="polite" aria-atomic="true"></div>
<dialog id="copy-fallback" aria-labelledby="copy-title"><h2 id="copy-title">Selecione e copie o texto</h2><p>A cópia automática não está disponível neste navegador. Toque no texto para selecionar e copiar.</p><textarea id="copy-text" readonly aria-label="Texto para copiar"></textarea><button type="button" class="button primary" id="close-copy">Fechar</button></dialog>
</body></html>`;
fs.writeFileSync(path.join(source,'index.html'),html);
fs.writeFileSync(path.join(source,'ganchos-data.json'),JSON.stringify({hooks,prompts},null,2)+'\n');
// Plain text uses exactly the same editorial sources and all full prompt fields.
const fullText=['Parabéns, aqui está o seu presente.','Eu sou Stanley Batista, gestor de marketing. Há mais de 6 anos, crio e cuido de marcas.',read('abertura.txt').split('\n').filter(l=>!l.startsWith('Botão')).join('\n'),...hooks.map(h=>Object.entries(h).map(([k,v])=>k+': '+v).join('\n')),beforePrompts,...prompts.map(p=>p.text),closing.slice(closing.indexOf('CHECKLIST ANTES DE PUBLICAR'))].join('\n\n');
fs.writeFileSync(path.join(source,'guia-50-ganchos-badon.txt'),fullText);
const files=['index.html','guia.css','guia.js','ganchos-data.json','stanley-batista.webp','logo-badon.svg','simbolo-badon.svg','guia-50-ganchos-badon.pdf','guia-50-ganchos-badon.txt'];
fs.mkdirSync(target,{recursive:true});
for(const file of files)fs.copyFileSync(path.join(source,file),path.join(target,file));
console.log('Guia independente exportado para /presentes/50-ganchos/: 50 ganchos, 3 prompts, PDF e 9 perguntas frequentes.');
