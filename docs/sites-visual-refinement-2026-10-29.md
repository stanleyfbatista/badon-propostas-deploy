# Refinamento visual — página de sites

## Entrega

Hero clara com notebook 3D, menu Início, faixas com interpolação fracionária via requestAnimationFrame e pausa fora da tela. Seção PageSpeed com quatro critérios em linguagem simples; 100 representa apenas o máximo da escala, não uma medição nem promessa.

Portfólio: Davi Guedes, CLP Fácil e Juliana Galvão. Uma ação abre a janela e carrega a prévia. CLP e Juliana carregam conteúdo externo após o clique; aviso exibido antes da ação. Davi usa demonstração interativa local, explicitamente identificada, sem alterar a proteção do site original. Links externos dessa demonstração não navegam.

## Imagens

Geradas com a ferramenta integrada de imagens, não pela CLI. Arquivos finais:

- institucional/assets/img/cases/paginas-de-vendas/badon-sites-notebook-3d.webp — 1440 × 960.
- institucional/assets/img/cases/paginas-de-vendas/badon-performance-3d.webp — 960 × 640.

Referência visual do notebook: institucional/assets/img/cases/paginas-de-vendas/davi-guedes-site.webp. Mockup ilustrativo, não fotografia real.

### Prompt do notebook

Use case: compositing / product-mockup. Create one premium website hero asset, landscape 3:2 composition. A photorealistic silver MacBook-style laptop in elegant three-quarter perspective, floating slightly, displaying the supplied Davi Guedes website screenshot faithfully on its screen (supporting screen insert; preserve the architecture image and page branding, do not invent claims). Two small thin floating website interface layers emerge forward out of the screen in exploded 3D depth, one showing a cropped architecture photo from the same page, one a minimal white/royal blue button or layout block with NO added readable text. Bright cool-white studio background #f3f7fe, silver aluminum, royal blue #0053c3 accents, soft directional shadows and realistic reflections, modern high-end commercial product render. The laptop fills most of the image, entire laptop visible with generous safe margins. No people outside the screenshot, no extra devices, no watermark, no performance scores, no marketing copy. This is a visual mockup of a real website, not a photo of the customer's actual building.

### Prompt de performance

Use case: product-mockup / stylized-concept. One premium 3D illustration for a web agency's website quality section. A sculptural speedometer dashboard object, pale white ceramic body, brushed silver edge, strong royal blue #0053c3 curved dial and a minimal green accent at the fast end, needle tilted toward high performance. Three-quarter perspective, floating above a cool white #f3f7fe studio surface with soft realistic shadows. High-end product render, elegant and substantial, not a toy. Landscape 3:2 frame, generous empty margins. No letters, no numbers, no scores, no logos, no Google trademarks, no labels, no other objects. This is an illustrative concept, not a measurement report.

## Prévia Davi

Origem pública, somente leitura: /Users/produtorabadon/Documents/github/davi-guedes-engenharia/dist.

Gerador: institucional/tools/build-davi-preview.cjs. Executar com o diretório dist como argumento. Copia somente recursos públicos permitidos e gera deploy/sites-preview-files.txt. A demonstração tem noindex e sandbox allow-scripts, sem allow-same-origin, formulários ou abertura de abas. O arquivo preview-only.js bloqueia navegação externa. Não sincroniza automaticamente com o site original.

## Verificação local

- Build: 16 páginas e 195 assets.
- tests/sites-service.mjs: conteúdo, ordem dos projetos, demos, interpolação, redução de movimento, backup e publicação isolada.
- tests/service-pages.mjs: regressão das quatro páginas de serviços.
- institucional/tools/test-production.cjs: links, SEO e deploy.
- bash -n nos dois publicadores e git diff --check.
- Chrome: hero desktop, hero e PageSpeed em 390 px, modal Davi mobile; aba Estrutura do Davi interativa; Juliana carregada dentro do modal; fechamento por Escape devolve foco ao projeto.

Sem alegação de nota PageSpeed medida, auditoria completa de acessibilidade ou teste em todos os dispositivos.
