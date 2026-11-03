# Coleção Raízes — 02/11/2026

Página aprovada para publicação em https://produtorabadon.com/raizes/.
`/raízes/` redireciona para o endereço sem acento; HTML de fallback preserva query e fragmento.

Fonte de origem: projeto `pack-documentos-psicologas/dist`. A pasta `public/raizes/` contém apenas HTML, CSS, JavaScript e os arquivos realmente utilizados pela página. Ferramentas, documentos editáveis, backups, revisões, originais de imagens e dados de outros projetos não fazem parte da publicação.

A única adaptação do HTML de origem é o canonical da URL pública. O checkout ainda não foi configurado: preservado o diálogo existente do botão de oferta. A diretiva noindex/nofollow permanece até a definição da abertura comercial.

## Publicação

O fluxo existente de `.cpanel.yml` executa `deploy/deploy.sh`, copiando `public/` para o `public_html` da conta. Não há build, instalação, migração ou alteração de configuração privada para esta página.

No cPanel: Git Version Control → badon-propostas-deploy → Update from Remote → conferir o SHA → Deploy HEAD Commit. Depois verificar a URL, o alias, as imagens e os arquivos JS/CSS no domínio.

`raizes-release.json` registra caminhos públicos, tamanhos e SHA-256 para verificar a publicação. Em futuras atualizações, preservar uma cópia privada da rota anterior antes de substituir os arquivos. O deploy geral faz backup do institucional, mas essa rotina preexistente não inclui automaticamente a pasta raizes.
