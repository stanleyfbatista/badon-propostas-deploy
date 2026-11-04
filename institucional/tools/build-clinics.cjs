// Editorial input supplied by the client. Never execute scripts from that file.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'conteudo/clinicas-base.html'),'utf8');
const route='https://produtorabadon.com/servicos/clinicas-de-estetica.html';
let css=html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/url\('https:\/\/images\.unsplash\.com[^']+'\)/g,"url('../img/clinicas/ambiente-clinica.webp')");
fs.writeFileSync(path.join(root,'assets/css/clinicas-base.css'),css.replace(/[ \t]+$/gm,'').trimEnd()+'\n');
html=html.replace(/<style>[\s\S]*?<\/style>/,'<link rel="stylesheet" href="../assets/css/clinicas-base.css?v=20261104-1">\n<link rel="stylesheet" href="../assets/css/clinicas.css?v=20261104-1">');
html=html.replace(/<script>([\s\S]*?)<\/script>/g,'');
html=html.replace(/\s*<link[^>]+(?:fonts\.googleapis|fonts\.gstatic|images\.unsplash)[^>]*>/g,'');
html=html.replace(/\s*<link rel="canonical"[^>]+>/,'');
html=html.replaceAll('https://produtorabadon.com/aquisicao-de-pacientes-para-clinicas/',route);
html=html.replace('<title>Aquisição de Pacientes para Clínicas de Estética | Bādon</title>','<title>Marketing e aquisição para clínicas de estética | Bādon</title>');
html=html.replace('</head>',`<meta name="robots" content="noindex,nofollow"><meta property="og:type" content="website"><meta property="og:title" content="Sua clínica merece uma estratégia à altura | Bādon"><meta property="og:description" content="Estratégia, site, Google, anúncios e atendimento conectados à aquisição de clientes para clínicas de estética."><meta property="og:image" content="https://produtorabadon.com/assets/img/clinicas/ambiente-clinica.webp"><meta property="og:image:alt" content="Ambiente de clínica estética, fotografia de referência"><link rel="icon" href="../assets/svg/favicon.svg"><script src="../assets/js/clinicas.js?v=20261104-1" defer></script></head>`);
const logo='<img src="../assets/svg/logo-badon.svg" width="184" height="30" alt="Produtora Bādon">';
html=html.replaceAll('bādon<span>.</span></a>',logo+'</a>');
html=html.replace('<main>','<a class="skip-link" href="#conteudo">Pular para o conteúdo</a><main id="conteudo">');
html=html.replace('<a href="#metodo">O método</a>','<a href="../index.html">Início</a><a href="#metodo">O método</a>');
html=html.replace('Bādon aquisição / clínicas de estética','Aquisição estratégica para clínicas de estética');
html=html.replace('<em>estratégia à altura.</em>','estratégia à altura.');
// Remove redundant labels, not the actual service/process explanations.
html=html.replace(/<div class="trust">[\s\S]*?<\/div>/,'');
html=html.replace(/<div class="marquee"[\s\S]*?<\/div><\/div>/,'');
html=html.replace('<summary>Vocês fazem só os anúncios?</summary><p>Não. O plano integra estratégia, campanhas, criativos, presença digital, site, Google e preparação comercial. O escopo específico é definido na proposta de cada clínica.</p>','<summary>Vocês criam, publicam e gerenciam anúncios na Meta e no Google?</summary><p>Sim. A Bādon planeja as campanhas, produz os criativos, publica os anúncios e gerencia a mídia na Meta (Instagram e Facebook) e no Google Ads. Acompanhamos os indicadores e fazemos ajustes contínuos. Essa operação faz parte da geração de demanda e se conecta ao site, ao CRM e ao atendimento da clínica. A verba de mídia é separada da gestão e definida na proposta.</p>');
html=html.replace('Planejamos e operamos anúncios no Google e Meta, com peças, copies, roteiros e edição de vídeos necessários às campanhas.','Criamos, publicamos e gerenciamos anúncios na Meta e no Google Ads. Planejamento, criativos, acompanhamento e otimização fazem parte da geração de demanda.');
html=html.replace(/<div class="hero-photo">[\s\S]*?<\/div><\/div><\/section>/,`<figure class="clinic-hero-visual"><img class="clinic-portrait" src="../assets/img/clinicas/profissional-estetica.webp" width="1200" height="1800" alt="Profissional de estética em um ambiente de atendimento" fetchpriority="high"><div class="clinic-room"><img src="../assets/img/clinicas/ambiente-clinica.webp" width="1600" height="864" alt="Sala real de uma clínica de estética" loading="eager"><span>O cuidado começa antes da consulta.</span></div><a class="hero-demo-link" href="#hub"><span class="demo-orbit" aria-hidden="true">↗</span><span>Do interesse ao agendamento.<small>Explore a demonstração do painel</small></span></a><figcaption>Fotografias de referência do segmento, não de clientes Bādon.</figcaption></figure></div></section>`);
html=html.replace(/<div class="visual-stack reveal"[\s\S]*?<\/div><div class="reveal"><span class="eyebrow">Seu site/,`<div class="visual-stack" aria-label="Demonstração de site e perfil no Google"><div class="clinic-laptop"><div class="device-chrome"><span aria-hidden="true">● ● ●</span><span>Serena · saúde e estética</span></div><button class="site-screen" type="button" id="open-clinic-preview" aria-haspopup="dialog"><img src="../assets/img/cases/paginas-de-vendas/serena-notebook-v1.webp" alt="Explorar o site demonstrativo Serena Saúde e Estética" width="1448" height="1086" loading="lazy"><span>Explorar o site <b aria-hidden="true">↗</b></span></button></div><div class="google-card"><strong><span class="google-g" aria-hidden="true">G</span> Perfil da sua clínica</strong><small>Estética e cuidado · Sua cidade</small><span class="stars" aria-label="Cinco estrelas ilustrativas">★★★★★</span><small>Exemplo visual, não uma avaliação real.</small><div class="map-actions"><span>Site</span><span>Como chegar</span></div></div><p class="visual-note">Site demonstrativo do nosso portfólio. Abra e navegue sem sair desta página.</p></div><div class="reveal"><span class="eyebrow">Seu site`);
const hub=fs.readFileSync(path.join(root,'conteudo/clinicas-hub.html'),'utf8');
const team=fs.readFileSync(path.join(root,'conteudo/clinicas-equipe.html'),'utf8');
html=html.replace(/<section class="section hub"[\s\S]*?<\/section>/,team+'\n'+hub);
html=html.replace('Bādon Hub','painel Bādon');
html=html.replace('os avanços ficam disponíveis no Hub.','os avanços ficam organizados no painel do projeto.');
html=html.replace('Hub, indicadores e acompanhamento de desempenho','Painel do projeto, indicadores e acompanhamento de desempenho');
html=html.replace('© <span id="year">2026</span> Bādon. Todos os direitos reservados.','© <span id="year">2026</span> Produtora Bādon.');
html=html.replace('<span>Proposta de serviço sujeita a diagnóstico e contrato.</span>','<span>Proposta sujeita a diagnóstico e contrato. <a href="/privacidade/">Privacidade</a></span>');
html=html.replace('</body>',`<dialog id="clinic-preview" aria-labelledby="clinic-preview-title"><div class="preview-top"><h2 id="clinic-preview-title">Serena Saúde & Estética · demonstração</h2><button type="button" id="close-clinic-preview" aria-label="Fechar prévia do site">✕</button></div><p>Prévia de navegação. Não é uma clínica atendida nem um resultado comercial.</p><iframe title="Prévia navegável de site de saúde e estética" sandbox="allow-scripts" referrerpolicy="no-referrer" data-src="../assets/previews/templates-v1/serena/index.html"></iframe></dialog></body>`);
// Original generated imagery; Pinterest inputs are mood references only.
html=html.replaceAll('profissional-estetica.webp','gestora-clinica-premium.webp')
  .replaceAll('ambiente-clinica.webp','recepcao-clinica-premium.webp')
  .replace('width="1200" height="1800"','width="1122" height="1402"')
  .replaceAll('width="1600" height="864"','width="1536" height="1024"')
  .replace('alt="Profissional de estética em um ambiente de atendimento"','alt="Retrato ilustrativo gerado por IA de uma gestora em consultório de estética"')
  .replace('alt="Sala real de uma clínica de estética"','alt="Recepção ilustrativa de clínica com madeira, pedra clara e luz quente, gerada por IA"')
  .replace('content="Ambiente de clínica estética, fotografia de referência"','content="Recepção de clínica estética, imagem ilustrativa gerada por IA"')
  .replace('<figcaption>Fotografias de referência do segmento, não de clientes Bādon.</figcaption>','')
  .replace('<p class="visual-note">Site demonstrativo do nosso portfólio. Abra e navegue sem sair desta página.</p>','')
  .replace('Perfil da sua clínica','Serena Saúde & Estética')
  .replace('Estética e cuidado · Sua cidade','Estética e cuidado · Limeira')
  .replace('../assets/img/cases/paginas-de-vendas/serena-notebook-v1.webp','../assets/img/clinicas/site-serena-tela.webp')
  .replace('width="1448" height="1086"','width="1440" height="1000"')
  .replace('<p>Prévia de navegação. Não é uma clínica atendida nem um resultado comercial.</p>','');
html=html.replaceAll('20261104-1','20261104-4');
fs.writeFileSync(path.join(root,'servicos/clinicas-de-estetica.html'),html.replace(/[ \t]+$/gm,'').trimEnd()+'\n');
console.log('Página de clínicas gerada a partir do conteúdo fornecido; scripts originais não executados.');
