# Publicação do institucional · 16/10/2026

Domínio: https://produtorabadon.com/. Mesmo repositório e hospedagem do Forms.

O fonte de revisão permanece em `institucional/`; a exportação de produção está em `public/`.
Para atualizar: `node institucional/tools/build-production.cjs`, depois
`node institucional/tools/test-production.cjs`. Commitar fonte e exportação juntos.

A exportação remove noindex e avisos locais, acrescenta canonicals e sitemap,
e omite o logo com nome ainda não confirmado (30 logos públicos). A imagem social
usa o retrato real de Stanley em vez do fundo provisório. Não copia documentação
ou ferramentas para a hospedagem pública.

Após o push, no cPanel: Git Version Control, badon-propostas-deploy,
Update from Remote e Deploy HEAD Commit. Nenhuma migração de banco, alteração
de DNS, SMTP, Cron ou credenciais é necessária para este lançamento.

O deploy faz backup de index.html, robots.txt, sitemap.xml, .htaccess, assets,
blog e servicos existentes em `badon-site-backups/release-*`, fora de public_html,
antes de copiar. Não exclui outras páginas. Guardar o caminho mostrado pelo deploy.
Para reverter a página inicial, restaurar apenas index.html desse backup;
não restaurar configurações do Forms nem apagar a árvore public_html.

Verificar a home, uma página de serviço, blog, imagens, WhatsApp, Instagram,
https://forms.produtorabadon.com/entrar e as propostas existentes após publicar.
Push no GitHub não comprova deploy; confirmar a versão servida no domínio.
