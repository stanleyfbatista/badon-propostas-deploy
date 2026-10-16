# Validação da prévia

## Cinco novos artigos enviados · 16/10/2026

- Catálogo ampliado para nove, preservando os quatro artigos existentes.
- Filtros de categoria verificados em teste automatizado e no navegador; seleção de IA apresenta dois artigos, redes sociais apresenta um.
- Cinco novas páginas verificadas a 390 × 844: capa carregada e sem overflow horizontal.
- Validador estático aprovado para 15 páginas HTML. Testes de blog, cases, clientes e depoimentos aprovados; JavaScript sem erro de sintaxe.
- HTTP 200 no artigo de ChatGPT. Mantidos noindex, créditos das fotografias e fontes clicáveis.

## Blog editorial · 16/10/2026

- Criados quatro artigos e uma listagem estática, com layout compartilhado, índice, checklist, fontes e créditos das imagens.
- HTTP 200 para a listagem; 10 páginas HTML verificadas sem erros de links locais, imagens, IDs ou estrutura.
- Sintaxe do JavaScript e testes de blog, cases, clientes e depoimentos aprovados.
- Navegação testada da home para a listagem, paginação dos quatro artigos e abertura do primeiro artigo.
- Índice interno testado até o checklist; sem rolagem horizontal no desktop.
- Cinco páginas do blog verificadas a 390 × 844, sem overflow horizontal nem imagens quebradas. Capa e listagem conferidas visualmente.
- Artigos não dependem de JavaScript para leitura. Mantido noindex e aviso de prévia local; nenhuma publicação em produção.
- Créditos e licenças registrados em FONTES-BLOG.md. Autoria editorial usada: Redação Bādon.

Verificação inicial realizada em 14/10/2026. Os testes visuais abaixo pertencem à versão inicial.

## Revisão de contatos e conteúdo demonstrativo

- Sintaxe JavaScript e validador estático executados novamente sem erros.
- WhatsApp, endereço e dados estruturados atualizados.
- Bloco de Google Partner removido.
- Seis cases fictícios e quatro textos demonstrativos identificados como exemplos.
- Inspeção visual desta revisão não realizada: a permissão de controle de aplicativos está desativada.

## Verificado

### Seis cases reais — 16/10/2026

- Grade final: Juliana Galvão, CLP Fácil, Clínica Jardim, Translife, Nova Molina e Casa Supremo. Páginas de vendas separadas; nenhum rótulo fictício ou demonstração na seção.
- Três pranchas do Arquivo 4.zip copiadas integralmente e identificadas por inspeção visual. Capas por CSS e imagens completas nos modais.
- Novo tools/test_cases.cjs verifica seis cards, IDs únicos esperados, ligação com os detalhes, ausência de placeholders, imagens/alt e separação das páginas de vendas.
- Testes dos cases, clientes e depoimentos passaram, assim como sintaxe JavaScript e validador estático: cinco páginas, 56 imagens HTML, 88 assets.
- Seis botões abertos e fechados no Chrome, com títulos correspondentes. Translife conferido no desktop; Nova Molina e Casa Supremo conferidos em 390 × 844. Todas as seis capas carregadas, sem transbordamento horizontal no celular ou nos modais inspecionados.
- Viewport restaurado e prévia local mantida. Sem publicação na hospedagem.

### Páginas de vendas — 16/10/2026

- Essência substituído por um card real com Juliana Galvão e CLP Fácil; os dois projetos aparecem simultaneamente na capa e em seções separadas no modal.
- Duas páginas de origem lidas no navegador; capturas reais de abertura salvas localmente. Explicações sobre produto, estrutura e direção visual; sem resultados atribuídos à Bādon.
- Duas imagens carregadas no modal e links conferidos para as URLs exatas enviadas, em nova aba com noopener noreferrer.
- Chrome desktop e 390 × 844: leitura e imagens conferidas, sem transbordamento horizontal; Escape e fechar funcionam, com retorno de foco ao acionador. Viewport restaurado.
- Sintaxe JavaScript, testes de clientes/depoimentos e validador estático passaram: cinco páginas, 57 imagens HTML e 85 assets.
- Sem publicação na hospedagem.

### Case Clínica Jardim — 16/10/2026

- Substituído o placeholder Vértice no card de Identidade visual; demais cinco exemplos preservados e identificados.
- Capa com papelaria original, apresentação baseada no manual e galeria com marca, aplicações, retrato e recepção. Sem publicação do PDF ou números de resultado.
- Sintaxe JavaScript, testes de clientes/depoimentos e validador estático passaram: cinco páginas, 56 imagens HTML, 83 assets e nenhum erro.
- Chrome desktop e viewport 390 × 844: modal abre, textos legíveis e sem transbordamento horizontal. Cinco imagens do modal carregaram; capa confirmada no card.
- Escape e botão de fechar funcionam; foco retorna ao botão “Ver projeto”. Viewport restaurado após o teste.
- Alterações somente na prévia local; sem envio à hospedagem.

### Carrossel de clientes — 16/10/2026

- 31 logos preservados; paginação manual de 12/8/4 marcas em desktop/tablet/celular, em duas fileiras.
- Testes em tools/test_clients.cjs: páginas completas e parciais, retorno circular, anterior/próximo, teclado, gesto horizontal, preservação da rolagem vertical, mudança de breakpoint e ausência de temporizadores.
- Verificação no Chrome: desktop com 12 logos e três páginas; tablet de 768 px com oito; celular de 390 px com quatro e oito páginas. Última página acessível, sem imagens visíveis quebradas e sem rolagem horizontal.
- Altura estável da grade: 392 px no desktop e 370 px no celular, inclusive na última página.
- Validador estático e testes dos depoimentos passaram. Sem publicação na hospedagem.

### Logos de clientes — 16/10/2026

- 31 arquivos do ZIP adicionados, preservando os bytes originais; todos responderam HTTP 200 na prévia local.
- Substituídos os 12 placeholders por marcas fornecidas, com legendas e alt. Escudo H com nome pendente; leitura de Kevr aguardando confirmação.
- Validador estático sem erros: cinco páginas, 56 imagens HTML e 76 arquivos de assets. Testes existentes dos depoimentos passaram.
- Inspeção visual da grade realizada no Chrome em desktop e viewport de 390 × 844: logos ampliados, sem distorção, duas colunas no celular e ausência de rolagem horizontal.
- Alteração local; sem envio para a hospedagem.

### Atualização da equipe — 14/10/2026

- Guilherme Domério: foto original do ZIP, nome e cargo Gestor comercial.
- Stanley Batista: Gestor de marketing nos cards, detalhes e autor do blog; removida a identificação como fundador.
- Sintaxe JavaScript, testes do carrossel e validador estático passaram. Nome, cargos e vínculo do modal conferidos por teste.
- Prévia e nova foto responderam HTTP 200; foto servida idêntica ao JPG original.
- Inspeção visual desta alteração não realizada; controle de aplicativos indisponível nesta sessão.

### Atualização dos depoimentos — 14/10/2026

- 14 avaliações únicas transcritas das capturas do usuário, sem respostas do proprietário.
- Sintaxe de main.js e reviews.js validada; validador HTML/assets sem erros.
- Testes automatizados do código do carrossel: textos integrais, nomes, datas, estrelas, expansão/recolhimento, ciclo completo, setas de teclado e gesto de deslizar.
- Sem inferência de nota média global, sem API paga e sem links individuais inventados.
- 11 PNGs originais fornecidos pelo usuário em Arquivo 2.zip, copiados sem alteração de bytes. Três avaliações permanecem com iniciais. Links continuam apontando ao perfil geral, com identificação correta.
- Testes de fotos: correspondência dos 11 caminhos, existência dos arquivos, fallback para iniciais e proteção contra erro atrasado de imagem do slide anterior.
- Prévia local e 11 URLs de fotos responderam HTTP 200; bytes servidos conferidos com os arquivos locais. Validador estático: cinco páginas, 44 assets e nenhum erro.
- Testes visuais abaixo são da versão inicial; não equivalem a inspeção visual desta alteração.

### Versão inicial

- Servidor estático local: resposta HTTP 200.
- Sintaxe JavaScript: node --check.
- Sintaxe do iniciador local: zsh -n.
- Validador estático: cinco páginas HTML, links internos, âncoras, imagens com alt, IDs sem duplicação, um h1 por página e noindex.
- CSS e JavaScript locais, 32 arquivos de assets com aproximadamente 251 KB no total. Fontes e bibliotecas de CDN não estão incluídas nesse tamanho.
- Navegação por âncoras e header fixo.
- Menu móvel: abrir, escolher uma seção e fechar.
- Quatro abas de serviço, seleção via teclado e pausa após interação.
- Dialog de equipe e case: abrir, fechar e Escape.
- Carrossel: mudança do modelo de depoimento.
- Blog: segunda página, listagem de pautas e detalhe.
- Página de serviço: abrir e voltar à pauta correta no blog.
- Ausência de rolagem horizontal da página nas larguras 320, 390, 640, 768, 1024 e 1440 px.
- Nenhuma imagem quebrada na inspeção do desktop.
- Nenhum erro ou aviso no console na inspeção feita.
- Nenhum arquivo existente de produção alterado; somente institucional foi adicionado.

## Limites da validação

- Sem publicação ou testes na TurboCloud.
- Nenhuma mensagem de WhatsApp enviada.
- Não houve auditoria completa de acessibilidade, Lighthouse ou testes em Safari/Firefox.
- prefers-reduced-motion e fallback sem CDN/JavaScript foram revisados no código; não foram emulados no navegador.
- A foto é provisória e os marcadores continuam visíveis de propósito.
- Conteúdo de blog, resultados, avaliações e credenciais comerciais precisam de aprovação.
- O site é estático, não possui CMS, formulário próprio ou integração com o banco do Forms.
