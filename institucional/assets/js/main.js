/* Conteúdo estático, sem formulário, cookie ou envio automático de dados. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lenis = null;
  let menuOpen = false;
  const header = $('.site-header');
  const menu = $('#primary-nav');
  const menuButton = $('.menu-toggle');
  const mobileQuery = matchMedia('(max-width: 640px)');
  const refreshHeader = () => header?.classList.toggle('sticky', scrollY > 80);
  refreshHeader();
  addEventListener('scroll', refreshHeader, { passive: true });

  function setMenu(open, restoreFocus = false) {
    menuOpen = open;
    menu?.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    const icon = menuButton?.querySelector('use');
    if (icon) icon.setAttribute('href', 'assets/svg/icons.svg#' + (open ? 'close' : 'menu'));
    if (open) {
      lenis?.stop();
      $$('main, footer, .floating-whatsapp, .review-badge').forEach(el => { el.inert = true; });
      $('a', menu)?.focus();
    } else {
      lenis?.start();
      $$('main, footer, .floating-whatsapp, .review-badge').forEach(el => { el.inert = false; });
      if (restoreFocus) menuButton?.focus();
    }
  }
  menuButton?.addEventListener('click', () => setMenu(!menuOpen, menuOpen));
  mobileQuery.addEventListener('change', event => { if (!event.matches) setMenu(false); });
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      if (menuOpen) setMenu(false);
      if (lenis && !reducedMotion.matches) {
        event.preventDefault();
        lenis.scrollTo(target, { offset: -90, onComplete: () => {
          history.replaceState(null, '', link.hash);
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        } });
      }
    });
  });
  addEventListener('keydown', event => {
    if (!menuOpen) return;
    if (event.key === 'Escape') { setMenu(false, true); return; }
    if (event.key === 'Tab') {
      const focusable = [menuButton, ...$$('a', menu)];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  if ('IntersectionObserver' in window && menu) {
    const navLinks = $$('a', menu).filter(link => link.hash && !link.classList.contains('mobile-contact'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(link => {
          const active = link.hash === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    navLinks.forEach(link => { const section = $(link.hash); if (section) observer.observe(section); });
  }

  // Tabs use progressive enhancement: without JS all four services remain visible.
  const tabList = $('.service-tabs');
  const tabs = $$('.service-tab');
  const panels = $$('.service-panel');
  const autoButton = $('.auto-tabs');
  const glow = $('.tab-glow');
  let activeTab = 0, autoAllowed = !reducedMotion.matches, tabsVisible = false;
  let autoTimer = null, serviceAnimation = null;
  function moveGlow(animate = true) {
    if (!glow || !tabs.length) return;
    const target = tabs[activeTab];
    const values = { x: target.offsetLeft, width: target.offsetWidth };
    if (window.gsap && !reducedMotion.matches && animate) gsap.to(glow, { ...values, duration: .4, ease: 'power2.out', overwrite: true });
    else { glow.style.transform = 'translateX(' + values.x + 'px)'; glow.style.width = values.width + 'px'; }
  }
  function stopAuto() {
    autoAllowed = false;
    if (autoButton) { autoButton.setAttribute('aria-pressed', 'false'); autoButton.innerHTML = 'Ativar troca automática <span aria-hidden="true">▶</span>'; }
    clearInterval(autoTimer); autoTimer = null;
  }
  function scheduleAuto() {
    clearInterval(autoTimer); autoTimer = null;
    if (!autoAllowed || !tabsVisible || document.hidden || reducedMotion.matches) return;
    autoTimer = setInterval(() => showTab((activeTab + 1) % tabs.length, false), 6000);
  }
  function showTab(index, userInitiated = true) {
    if (!tabs.length) return;
    if (userInitiated) stopAuto();
    activeTab = index;
    serviceAnimation?.kill();
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      panel.style.opacity = '';
      panel.style.transform = '';
    });
    moveGlow();
    if (window.gsap && !reducedMotion.matches) {
      serviceAnimation = gsap.fromTo(panels[index], { opacity: .3 }, { opacity: 1, duration: .4, clearProps: 'opacity' });
      gsap.fromTo($$('.art-piece', panels[index]), { scale: .8, y: 16 }, { scale: 1, y: 0, duration: .55, stagger: .06, ease: 'power3.out', overwrite: true, clearProps: 'transform' });
    }
    window.ScrollTrigger?.refresh();
  }
  if (tabList) {
    tabList.setAttribute('role', 'tablist');
    tabs.forEach((tab, i) => {
      tab.setAttribute('role', 'tab');
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].tabIndex = 0;
      tab.addEventListener('click', () => showTab(i));
      tab.addEventListener('keydown', event => {
        let next = i;
        if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); showTab(next); tabs[next].focus();
      });
    });
    showTab(0, false);
    autoButton.hidden = reducedMotion.matches;
    autoButton.addEventListener('click', () => {
      if (autoAllowed) stopAuto();
      else { autoAllowed = true; autoButton.setAttribute('aria-pressed', 'true'); autoButton.innerHTML = 'Pausar troca automática <span aria-hidden="true">Ⅱ</span>'; scheduleAuto(); }
    });
    // Never replace a panel while someone is reading or using its controls.
    $('.service-content').addEventListener('focusin', stopAuto);
    tabList.addEventListener('focusin', stopAuto);
    $('.services').addEventListener('pointerenter', () => { clearInterval(autoTimer); });
    $('.services').addEventListener('pointerleave', scheduleAuto);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        tabsVisible = entries[0].isIntersecting; scheduleAuto();
      }, { threshold: .3 }).observe(tabList);
    }
    addEventListener('resize', () => moveGlow(false), { passive: true });
    document.addEventListener('visibilitychange', scheduleAuto);
  }

  // Local editorial preview. Each entry has its own static article page.
  const posts = [
  {
    "id": "cara-de-empresa-grande",
    "title": "Coisas que deixam seu negócio com cara de grande",
    "category": "Presença profissional",
    "image": "blog/marca.webp",
    "alt": "Amostras de cores para uma identidade visual consistente",
    "summary": "8 cuidados para apresentar bem o seu negócio e transmitir mais confiança.",
    "minutes": 9,
    "height": 933,
    "displayDate": "29 OUT 2026"
  },
  {
    "id": "atualizacao-chatgpt-astra-sol",
    "title": "Atualização do ChatGPT: o que muda com Astra e GPT-6.1 Sol",
    "category": "Inteligência artificial",
    "image": "blog/chatgpt.webp",
    "alt": "ChatGPT aberto em um smartphone ao lado de um notebook",
    "summary": "Astra, GPT-6.1 Sol e ChatGPT Work: entenda as mudanças e como testar a IA na sua rotina.",
    "minutes": 4,
    "height": 934
  },
  {
    "id": "atualizacao-claude-haiku",
    "title": "Atualização do Claude: Haiku 5.5 e as mudanças na família de modelos",
    "category": "Inteligência artificial",
    "image": "blog/claude.webp",
    "alt": "Página do Claude em uma tela, com identidade visual preta e laranja",
    "summary": "O que mudou em Haiku, Sonnet e Opus 5.5 e como comparar os modelos com tarefas reais.",
    "minutes": 4,
    "height": 1023
  },
  {
    "id": "engenharia-reversa-ia",
    "title": "Engenharia reversa com IA: como agentes recriam aplicativos e jogos",
    "category": "Tecnologia",
    "image": "blog/codigo.webp",
    "alt": "Detalhe de código de programação em uma tela",
    "summary": "Alternativas a apps da Adobe, jogos retrô e skills no GitHub: como a IA transforma observação em uma nova implementação.",
    "minutes": 6,
    "height": 935
  },
  {
    "id": "google-atrair-clientes-regiao",
    "title": "Como usar o Perfil da Empresa no Google para atrair clientes da sua região",
    "category": "Google Meu Negócio",
    "image": "blog/google.webp",
    "alt": "Entrada de uma cafeteria com fachada identificada",
    "summary": "Cadastro, presença local, avaliações e métricas para aproximar sua empresa de quem procura na região.",
    "minutes": 4,
    "height": 1652
  },
  {
    "id": "algoritmo-instagram-conteudo",
    "title": "Como entender o algoritmo do Instagram e melhorar sua estratégia de conteúdo",
    "category": "Redes sociais",
    "image": "blog/instagram.webp",
    "alt": "Smartphone exibindo um perfil no Instagram",
    "summary": "Originalidade, métricas e testes: como analisar seu conteúdo sem depender de fórmulas de alcance.",
    "minutes": 4,
    "height": 2100
  },
  {
    "id": "antes-de-anunciar",
    "title": "Antes de anunciar, o que vale conferir?",
    "category": "Tráfego pago",
    "image": "blog/trafego.webp",
    "alt": "Notebook com relatório de acessos e gráficos de análise",
    "summary": "Oferta, página, atendimento e medição: uma revisão prática antes de investir em anúncios.",
    "minutes": 3,
    "height": 933
  },
  {
    "id": "site-e-contato",
    "title": "O caminho entre visitar seu site e falar com você",
    "category": "Sites",
    "image": "blog/sites.webp",
    "alt": "Página de um site aberta em um dispositivo móvel",
    "summary": "Como organizar a informação e facilitar o próximo passo de quem chega ao seu site.",
    "minutes": 3,
    "height": 787
  },
  {
    "id": "perfil-local",
    "title": "O que revisar no perfil da sua empresa no Google",
    "category": "Google Meu Negócio",
    "image": "blog/google.webp",
    "alt": "Fachada de uma cafeteria com entrada e identificação visíveis",
    "summary": "Uma lista para conferir informações, fotos, avaliações e caminhos de contato do seu negócio.",
    "minutes": 3,
    "height": 1652
  },
  {
    "id": "marca-consistente",
    "title": "Como manter a mesma marca em cada ponto de contato",
    "category": "Identidade visual",
    "image": "blog/marca.webp",
    "alt": "Leque de amostras de cores em tons de verde, azul e violeta",
    "summary": "Do Instagram à proposta comercial: como organizar cores, tipografia, imagens e modelos.",
    "minutes": 3,
    "height": 933
  }
];
  const visiblePosts = posts;
  const postPath = id => id + (id === 'cara-de-empresa-grande' ? '' : '.html');
  const postMarkup = post => '<article class="post-card"><a class="post-image" style="display:block" href="blog/' + postPath(post.id) + '" tabindex="-1" aria-hidden="true"><img src="assets/img/' + post.image + '" alt="" width="1400" height="933" loading="lazy"><span class="post-notch">↗</span></a><div class="post-meta">' + (post.displayDate || '16 OUT 2026') + ' / REDAÇÃO BĀDON</div><h3><a href="blog/' + postPath(post.id) + '">' + post.title + '</a></h3><p>' + post.summary + '</p><div class="post-bottom"><span>/ ' + post.category + ' /</span><a class="read-more" href="blog/' + postPath(post.id) + '">LEIA MAIS ↗</a></div></article>';
  function renderPosts(page) {
    const grid = $('#posts-grid');
    if (!grid) return;
    grid.innerHTML = visiblePosts.slice((page - 1) * 2, page * 2).map(postMarkup).join('');
    $$('[data-page]').forEach(button => {
      const current = Number(button.dataset.page) === page;
      button.classList.toggle('active', current);
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      button.hidden = Number(button.dataset.page) > Math.ceil(visiblePosts.length / 2);
    });
    window.ScrollTrigger?.refresh();
  }
  $$('[data-page]').forEach(button => button.addEventListener('click', () => renderPosts(Number(button.dataset.page))));
  if ($('#posts-grid')) renderPosts(1);

  const detailDialog = $('.detail-dialog');
  let dialogOpener = null;
  const detailContent = {
    stanley: { title: 'Stanley Batista', body: '<p>Gestor de marketing</p>' },
    guilherme: { title: 'Guilherme Domério', body: '<p>Gestor comercial</p>' },
    'birra-sob-controle': {"title":"Juliana Galvão","body":"<div class=\"sales-study\"><section class=\"sales-project\" aria-labelledby=\"sales-birra-title\">\n          <p class=\"sales-eyebrow\">Juliana Galvão</p>\n          <h3 id=\"sales-birra-title\">Birra Sob Controle</h3>\n          <img class=\"sales-project-preview\" src=\"assets/img/cases/paginas-de-vendas/birra-sob-controle.png\" alt=\"Prévia da abertura da página Birra Sob Controle\" width=\"2033\" height=\"1059\" loading=\"lazy\">\n          <p>Para o projeto Birra Sob Controle, de Juliana Galvão, atuamos na criação do produto digital, da página de vendas e do e-book O Vulcão Por Dentro. O trabalho também inclui gestão de tráfego e estratégias de vendas, conectando a apresentação da oferta à divulgação do produto.</p>\n          <h4>Escopo do projeto</h4><ul><li>Criação do produto digital</li><li>Criação da página de vendas</li><li>Criação do e-book</li><li>Gestão de tráfego para vendas</li><li>Estratégias de vendas</li></ul>\n          <h4>A lógica da página</h4>\n          <p>O conteúdo parte das dificuldades do público, apresenta a abordagem do curso e detalha o que está incluído. A especialista, os materiais e o e-book O Vulcão Por Dentro ajudam o visitante a entender a oferta antes de seguir para a inscrição.</p>\n          <h4>Direção visual e experiência</h4>\n          <p>Tons quentes, ilustrações e uma linguagem acolhedora acompanham o tema. As seções organizam a leitura e os botões conectam a apresentação ao checkout.</p>\n          <a class=\"button button-blue\" href=\"https://www.julianagalvaopsi.com.br/birra-sob-controle/\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Visitar Birra Sob Controle, abre em nova aba\">Visitar Birra Sob Controle ↗</a>\n        </section></div>"},
    'clp-facil': {"title":"CLP Fácil","body":"<div class=\"sales-study\"><section class=\"sales-project\" aria-labelledby=\"sales-clp-title\">\n          <p class=\"sales-eyebrow\">CLP Fácil</p>\n          <h3 id=\"sales-clp-title\">CLP do Zero ao Avançado</h3>\n          <img class=\"sales-project-preview\" src=\"assets/img/cases/paginas-de-vendas/clp-facil.png\" alt=\"Prévia da abertura da página de vendas do curso CLP Fácil\" width=\"2040\" height=\"1007\" loading=\"lazy\">\n          <p>No projeto CLP Fácil, atuamos na criação da página de vendas, na coprodução, na gestão de anúncios e na estratégia. O trabalho conecta a apresentação do treinamento CLP do Zero ao Avançado às ações de divulgação e venda.</p>\n          <h4>Escopo do projeto</h4><ul><li>Criação da página de vendas</li><li>Coprodução</li><li>Gestão de anúncios</li><li>Estratégia de vendas</li></ul>\n          <h4>A lógica da página</h4>\n          <p>A estrutura reúne apresentação do professor, depoimentos de alunos, grade de conteúdo, simulador, bônus e dúvidas frequentes. Esses blocos ajudam o visitante a avaliar o treinamento e entender como estudar antes de acessar a inscrição.</p>\n          <h4>Direção visual e experiência</h4>\n          <p>Fundo escuro, elementos técnicos e imagens de equipamentos aproximam o projeto do universo industrial. A hierarquia destaca o conteúdo do curso e distribui chamadas para a oferta ao longo da página.</p>\n          <a class=\"button button-blue\" href=\"https://clpfacilcursos.com/clp-do-zero-ao-avancado/Alt-jul26-001/\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Visitar CLP Fácil, abre em nova aba\">Visitar CLP Fácil ↗</a>\n        </section></div>"},
    'translife': {"title":"Translife","body":"<div class=\"brand-case-study\"><p class=\"brand-case-kicker\">Branding e identidade visual</p><p class=\"brand-case-intro\">Uma marca pronta para acompanhar cada destino.</p><p>A Translife atua no transporte e fretamento de ônibus. O projeto reuniu branding, nova identidade visual e aplicações para dar unidade à forma como a empresa se apresenta.</p><h3>Identidade em movimento</h3><p>A direção da marca conecta presença, organização e dinamismo. A tipografia inclinada e a combinação de azul com verde criam uma linguagem visual reconhecível, pensada para acompanhar a empresa no atendimento, na comunicação e nos deslocamentos.</p><h3>Galeria do projeto</h3><figure class=\"brand-case-board\"><img src=\"assets/img/cases/translife/capa-ecobag-v1.webp\" alt=\"Ecobag com a identidade visual da Translife aplicada em azul e verde\" width=\"874\" height=\"583\" loading=\"lazy\"><figcaption>Aplicação em destaque.</figcaption></figure><figure class=\"brand-case-board\"><a href=\"assets/img/cases/translife/aplicacoes.jpg\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Abrir painel completo de aplicações em nova aba\"><img src=\"assets/img/cases/translife/aplicacoes.jpg\" alt=\"Identidade da Translife aplicada a veículo, uniforme, papelaria e materiais de comunicação\" width=\"1080\" height=\"1350\" loading=\"lazy\"></a><figcaption>Grid completo de identidade visual e aplicações. Clique na imagem para ampliar.</figcaption></figure><h3>A marca nos pontos de contato</h3><p>A apresentação reúne aplicações em veículo, uniforme, crachás, papelaria, brindes e presença digital. São diferentes suportes unidos por um mesmo sistema visual, para que a Translife seja reconhecida em cada contato.</p><h3>O que desenvolvemos</h3><ul><li>Branding e direção de marca</li><li>Redesign do logotipo</li><li>Sistema de identidade visual</li><li>Aplicações institucionais e de comunicação</li></ul></div>"},
    'nova-molina': {"title":"Nova Molina","body":"<div class=\"brand-case-study\"><p class=\"brand-case-kicker\">Naming e identidade visual</p><p class=\"brand-case-intro\">Da escolha do nome à construção de uma marca.</p><p>Para a Nova Molina, construtora e incorporadora, desenvolvemos o naming, o logotipo e a identidade visual. Um projeto que começa no nome e ganha forma nos materiais usados para apresentar a empresa.</p><h3>Nome, símbolo e presença</h3><p>O nome Nova Molina é o ponto de partida da identidade. O símbolo reúne as iniciais em uma construção geométrica, com laranja e grafite criando contraste e personalidade. A proposta visual aproxima a marca do seu setor sem abrir mão de uma assinatura própria.</p><h3>Galeria do projeto</h3><figure class=\"brand-case-board\"><img src=\"assets/img/cases/nova-molina/capa-construcao-marca-v1.webp\" alt=\"Malha de construção do logotipo da Nova Molina, Construtora e Incorporadora\" width=\"2880\" height=\"1800\" loading=\"lazy\"><figcaption>Aplicação em destaque.</figcaption></figure><figure class=\"brand-case-board\"><a href=\"assets/img/cases/nova-molina/aplicacoes.jpg\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Abrir painel completo de aplicações em nova aba\"><img src=\"assets/img/cases/nova-molina/aplicacoes.jpg\" alt=\"Marca Nova Molina aplicada a papelaria, materiais de obra e apresentação institucional\" width=\"1080\" height=\"1350\" loading=\"lazy\"></a><figcaption>Grid completo de identidade visual e aplicações. Clique na imagem para ampliar.</figcaption></figure><h3>A marca nos pontos de contato</h3><p>A marca se desdobra em cartões, papelaria, apresentação institucional e materiais ligados ao ambiente de obra. A consistência entre essas aplicações ajuda a construir uma comunicação clara, do primeiro contato à apresentação dos empreendimentos.</p><h3>O que desenvolvemos</h3><ul><li>Naming</li><li>Criação do logotipo</li><li>Sistema de identidade visual</li><li>Papelaria e aplicações institucionais</li></ul></div>"},
    'casa-supremo': {"title":"Casa Supremo","body":"<div class=\"brand-case-study\"><p class=\"brand-case-kicker\">Identidade visual</p><p class=\"brand-case-intro\">Uma identidade à altura de encontros especiais.</p><p>A Casa Supremo é um espaço para casamentos e eventos corporativos de alto padrão. Desenvolvemos sua identidade visual para traduzir a elegância do negócio em uma marca com presença e cuidado nos detalhes.</p><h3>Elegância com assinatura própria</h3><p>O monograma CS e o desenho do nome trabalham juntos como elementos centrais da identidade. O contraste entre preto, branco e tons neutros cria uma linguagem sóbria, que permite à marca acompanhar tanto celebrações quanto ocasiões corporativas.</p><h3>Galeria do projeto</h3><figure class=\"brand-case-board\"><img src=\"assets/img/cases/casa-supremo/capa-painel-v1.webp\" alt=\"Mockup de painel publicitário com a identidade visual da Casa Supremo\" width=\"388\" height=\"437\" loading=\"lazy\"><figcaption>Aplicação em destaque.</figcaption></figure><figure class=\"brand-case-board\"><a href=\"assets/img/cases/casa-supremo/aplicacoes.jpg\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Abrir painel completo de aplicações em nova aba\"><img src=\"assets/img/cases/casa-supremo/aplicacoes.jpg\" alt=\"Identidade da Casa Supremo com monograma, cartões e aplicações para eventos\" width=\"1080\" height=\"1350\" loading=\"lazy\"></a><figcaption>Grid completo de identidade visual e aplicações. Clique na imagem para ampliar.</figcaption></figure><h3>A marca nos pontos de contato</h3><p>Cartões, papelaria e peças de comunicação mostram como a identidade se adapta a diferentes formatos. O sistema mantém a mesma assinatura visual nos materiais de apresentação e nas aplicações ligadas à experiência de eventos.</p><h3>O que desenvolvemos</h3><ul><li>Criação do logotipo e monograma</li><li>Sistema de identidade visual</li><li>Papelaria institucional</li><li>Aplicações de comunicação</li></ul></div>"},
    'clinica-jardim': {
      title: 'Clínica Jardim',
      body: `<div class="case-study-jardim">
        <p class="jardim-kicker">Psicologia &amp; Saúde · Identidade visual</p>
        <div class="jardim-brand"><img src="assets/img/cases/clinica-jardim/logo.png" alt="Clínica Jardim, Psicologia e Saúde" width="363" height="147"></div>
        <p class="jardim-intro">Uma marca que acolhe antes mesmo da primeira conversa.</p>
        <p>Para a Clínica Jardim, conectamos estratégia de marca, identidade visual e fotografia em uma mesma direção: expressar o cuidado humano que está no centro da clínica.</p>
        <h3>Estratégia e posicionamento</h3>
        <p>O ponto de partida foi traduzir a essência da Jardim em uma presença acolhedora e profissional. Cuidado, ética e colaboração orientam uma comunicação próxima, pensada para transmitir confiança a quem busca atendimento e pertencimento aos profissionais de saúde.</p>
        <h3>Uma identidade que nasce do cuidado</h3>
        <p>A árvore e suas folhas traduzem crescimento e renovação. O desenho orgânico encontra uma assinatura fluida, acompanhada por verdes suaves, tons de areia e dourado. Um sistema visual sereno, com personalidade, para acompanhar a marca em diferentes pontos de contato.</p>
        <div class="jardim-gallery">
          <figure><img src="assets/img/cases/clinica-jardim/papelaria.png" alt="Pasta, papel timbrado e envelope com a identidade visual da Clínica Jardim" width="363" height="405" loading="lazy"><figcaption>Identidade aplicada à papelaria.</figcaption></figure>
          <figure><img src="assets/img/cases/clinica-jardim/cartao.png" alt="Cartão da Clínica Jardim em tom verde suave, com assinatura dourada" width="363" height="376" loading="lazy"><figcaption>Detalhes que conectam a marca.</figcaption></figure>
        </div>
        <h3>Fotografia com presença humana</h3>
        <p>Os retratos e os registros do espaço aproximam a comunicação da experiência de estar na clínica. Luz, enquadramento e tons naturais reforçam a sensação de acolhimento e criam unidade entre as pessoas, o ambiente e a identidade visual.</p>
        <div class="jardim-gallery jardim-photos">
          <figure><img src="assets/img/cases/clinica-jardim/retrato.png" alt="Retrato profissional realizado no ambiente da Clínica Jardim" width="283" height="573" loading="lazy"><figcaption>Pessoas no centro da comunicação.</figcaption></figure>
          <figure><img src="assets/img/cases/clinica-jardim/recepcao.png" alt="Recepção da Clínica Jardim com a marca na parede e banco em tons claros" width="363" height="376" loading="lazy"><figcaption>A marca também vive no espaço.</figcaption></figure>
        </div>
        <h3>Coerência em cada aplicação</h3>
        <p>O manual reúne assinaturas, paleta de cores, tipografia e orientações de uso. Da papelaria à apresentação institucional, cada escolha sustenta a mesma intenção: uma marca reconhecível, sensível e próxima.</p>
        <ul class="jardim-scope"><li>Estratégia de marca e posicionamento</li><li>Redesign e sistema de identidade visual</li><li>Fotografia institucional</li><li>Papelaria e manual da marca</li></ul>
      </div>`
    },
  };

  function openDialog(title, body, opener) {
    if (!detailDialog) return;
    dialogOpener = opener || document.activeElement;
    $('#dialog-content').innerHTML = '<h2 id="dialog-title">' + title + '</h2>' + body;
    if (!detailDialog.open) detailDialog.showModal();
    document.body.classList.add('dialog-open');
    lenis?.stop();
    detailDialog.scrollTop = 0;
    $('.dialog-close').focus();
  }
  document.addEventListener('click', event => {
    const detail = event.target.closest('[data-detail]');
    if (detail && detailContent[detail.dataset.detail]) {
      const content = detailContent[detail.dataset.detail];
      openDialog(content.title, content.body, detail);
    }
  });
  $('.dialog-close')?.addEventListener('click', () => detailDialog.close());
  detailDialog?.addEventListener('click', event => {
    const bounds = detailDialog.getBoundingClientRect();
    if (event.target === detailDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) detailDialog.close();
  });
  detailDialog?.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    lenis?.start();
    if (dialogOpener?.isConnected) dialogOpener.focus({ preventScroll: true });
  });

  // Manual transcription of supplied screenshots; no API or automatic sync.
  const reviews = window.BADON_REVIEWS || [];
  let reviewIndex = 0;
  const reviewText = $('#review-text');
  const reviewExpand = $('#review-expand');
  function renderReview(step = 0) {
    if (!reviews.length || !reviewText) return;
    reviewIndex = (reviewIndex + step + reviews.length) % reviews.length;
    const review = reviews[reviewIndex];
    reviewText.textContent = review.text;
    reviewText.classList.add('is-collapsed');
    reviewExpand.hidden = review.text.length < 200;
    reviewExpand.textContent = 'Ler mais';
    reviewExpand.setAttribute('aria-expanded', 'false');
    const words = review.name.trim().split(/\s+/);
    const avatar = $('#review-avatar');
    const initials = words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '');
    avatar.textContent = initials;
    if (review.photo) {
      const photo = document.createElement('img');
      photo.alt = ''; // The adjacent name identifies this decorative avatar.
      photo.width = 40;
      photo.height = 40;
      photo.addEventListener('error', () => {
        // A delayed failure from a previous slide must not replace the current image.
        if (avatar.contains(photo)) avatar.textContent = initials;
      });
      photo.src = review.photo;
      avatar.replaceChildren(photo);
    }
    $('#review-name').textContent = review.name;
    $('#review-date').dateTime = review.date;
    $('#review-date').textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(review.date + 'T12:00:00Z'));
    $('#review-position').textContent = String(reviewIndex + 1).padStart(2, '0') + ' / ' + reviews.length + ' · DEPOIMENTOS SELECIONADOS';
    $('.review-stars').setAttribute('aria-label', review.rating + ' de 5 estrelas');
    // A business-profile link must not be presented as an individual review link.
    $('#review-original').href = review.reviewUrl || 'https://www.google.com/maps?cid=13259353907984930597';
    $('#review-original').textContent = review.reviewUrl ? 'Ver esta avaliação no Google ↗' : 'Consultar perfil da Bādon no Google ↗';
    window.ScrollTrigger?.refresh();
  }
  reviewExpand?.addEventListener('click', () => {
    const expanded = reviewExpand.getAttribute('aria-expanded') !== 'true';
    reviewExpand.setAttribute('aria-expanded', String(expanded));
    reviewExpand.textContent = expanded ? 'Ler menos' : 'Ler mais';
    reviewText.classList.toggle('is-collapsed', !expanded);
    window.ScrollTrigger?.refresh();
  });
  if (reviews.length && reviewText) {
    $('#review-prev').hidden = false;
    $('#review-next').hidden = false;
    renderReview();
  }
  $('#review-prev')?.addEventListener('click', () => renderReview(-1));
  $('#review-next')?.addEventListener('click', () => renderReview(1));
  let touchStart = null;
  const reviewCard = $('.testimonial-card');
  reviewCard?.addEventListener('keydown', event => {
    if (event.target !== reviewCard) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      renderReview(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  reviewCard?.addEventListener('touchstart', event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  reviewCard?.addEventListener('touchend', event => {
    if (touchStart === null) return;
    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 45) renderReview(delta < 0 ? 1 : -1);
    touchStart = null;
  }, { passive: true });

  // Everything is readable before animation starts and when a CDN is unavailable.
  let motionCleanup = () => {};
  function setupMotion() {
    motionCleanup();
    if (reducedMotion.matches || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    let ticker = null;
    if (window.Lenis) {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true, prevent: node => node.closest?.('dialog, .service-tabs, .primary-nav.open') });
      lenis.on('scroll', ScrollTrigger.update);
      ticker = time => lenis?.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
    }
    const context = gsap.context(() => {
      const heading = $('#hero-title');
      if (heading) {
        const text = heading.textContent.trim();
        heading.setAttribute('aria-label', text);
        heading.innerHTML = text.split(/\s+/).map(word => '<span class="word" aria-hidden="true">' + word + '</span>').join(' ');
        gsap.fromTo($$('.word', heading), { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .04, ease: 'power3.out' });
      }
      $$('.float-card').forEach((card, i) => {
        gsap.from(card, { opacity: 0, y: 24, duration: .8, delay: .2 + i * .12, ease: 'power3.out' });
        const floating = gsap.to(card, { y: i % 2 ? 6 : -6, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', paused: true });
        ScrollTrigger.create({ trigger: card, onEnter: () => floating.play(), onLeave: () => floating.pause(), onEnterBack: () => floating.play(), onLeaveBack: () => floating.pause() });
      });
      const graph = $('.growth-line path');
      if (graph) {
        const length = graph.getTotalLength();
        gsap.fromTo(graph, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.4, delay: .5 });
      }
      if ($('.bento-portrait img')) gsap.to('.bento-portrait img', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      $$('[data-reveal]').forEach((element, i) => gsap.from(element, { y: 40, opacity: 0, duration: .8, delay: i % 3 * .08, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 85%', once: true } }));
      $$('.panel').forEach(panel => gsap.fromTo(panel, { scale: .97, borderRadius: 40 }, { scale: 1, borderRadius: mobileQuery.matches ? 20 : 28, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: panel, start: 'top 95%', once: true } }));
      $$('.outline-word text,.stat-outline text').forEach(text => gsap.fromTo(text, { strokeDasharray: 1000, strokeDashoffset: 1000 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: text.closest('svg'), start: 'top 90%', end: 'bottom 45%', scrub: 1 } }));
      $$('[data-count]').forEach(element => {
        const state = { value: 0 }, end = Number(element.dataset.count);
        gsap.to(state, { value: end, duration: 1.5, ease: 'power2.out', onUpdate: () => { element.textContent = Math.round(state.value); }, scrollTrigger: { trigger: element, start: 'top 95%', once: true } });
      });
    });
    const magneticListeners = [];
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      $$('.magnetic').forEach(button => {
        const move = event => {
          const bounds = button.getBoundingClientRect();
          const x = Math.max(-6, Math.min(6, (event.clientX - bounds.left - bounds.width / 2) * .08));
          const y = Math.max(-6, Math.min(6, (event.clientY - bounds.top - bounds.height / 2) * .12));
          gsap.to(button, { x, y, duration: .3, overwrite: true });
        };
        const leave = () => gsap.to(button, { x: 0, y: 0, duration: .4, overwrite: true });
        button.addEventListener('pointermove', move);
        button.addEventListener('pointerleave', leave);
        magneticListeners.push(() => { button.removeEventListener('pointermove', move); button.removeEventListener('pointerleave', leave); gsap.killTweensOf(button); button.style.transform = ''; });
      });
    }
    motionCleanup = () => {
      context.revert();
      magneticListeners.forEach(remove => remove());
      if (ticker) gsap.ticker.remove(ticker);
      lenis?.destroy(); lenis = null;
      $$('[data-count]').forEach(element => { element.textContent = element.dataset.count; });
    };
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }
  setupMotion();
  const requestedPost = new URLSearchParams(location.search).get('artigo');
  if (requestedPost && posts.some(post => post.id === requestedPost)) location.replace('blog/' + postPath(requestedPost));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { stopAuto(); serviceAnimation?.kill(); panels.forEach(panel => { panel.style.opacity = ''; }); }
    if (autoButton) autoButton.hidden = reducedMotion.matches;
    setupMotion();
  });
})();
