#!/bin/bash
# Scoped service-page release: no home, blog, routing, application or database changes.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
[[ "$account_dir" = /* && "$account_dir" != / && -d "$account_dir" && ! -L "$account_dir" ]] || exit 1
public_dir="$account_dir/public_html"
backup_root="$account_dir/badon-site-backups"
[[ -d "$public_dir" && ! -L "$public_dir" && ! -L "$backup_root" ]] || exit 1
files=(assets/css/brand-service.css assets/js/brand-service.js assets/img/cases/becare/identidade-embalagens.webp assets/img/cases/translife/capa-ecobag-v1.webp assets/img/cases/nova-molina/capa-construcao-marca-v1.webp assets/img/clients/becare.svg assets/img/clients/casa-supremo.svg assets/img/clients/trans-life.svg assets/img/clients/nova-molina.svg assets/img/clients/clinica-jardim.svg assets/img/clients/maraiza-mocolini.svg assets/img/clients/claudia-modenez-bittencourt.svg assets/img/cases/paginas-de-vendas/davi-guedes-macbook-v1.webp assets/img/cases/translife/aplicacoes.jpg assets/css/service-experience.css assets/js/service-experience.js assets/img/cases/paginas-de-vendas/badon-sites-notebook-recortado-v2.webp assets/css/service-pages.css assets/css/sites-service.css assets/js/sites-service.js assets/img/cases/paginas-de-vendas/badon-sites-notebook-3d.webp assets/img/cases/paginas-de-vendas/badon-performance-3d.webp assets/img/cases/paginas-de-vendas/black-vitalicia-site.webp assets/img/cases/paginas-de-vendas/davi-guedes-site.webp assets/img/cases/paginas-de-vendas/davi-guedes-site-completo.webp servicos/sites.html servicos/identidade-visual.html servicos/trafego-pago.html servicos/google-meu-negocio.html)
for dir in assets assets/css assets/js assets/img assets/img/cases assets/img/cases/paginas-de-vendas servicos; do
  [[ -d "$public_dir/$dir" && ! -L "$public_dir/$dir" ]] || exit 1
done
# Explicit manifest: only the approved public portfolio preview.
preview_files=()
while IFS= read -r file; do
  [[ "$file" =~ ^assets/previews/davi-v1/[a-zA-Z0-9/_.-]+$ && "$file" != *..* ]] || exit 1
  preview_files+=("$file")
done < "$repo_dir/deploy/sites-preview-files.txt"
files=("${preview_files[@]}" "${files[@]}")
for file in "${files[@]}"; do
  parent_dir="$public_dir"
  IFS='/' read -r -a path_parts <<< "$(dirname "$file")"
  for part in "${path_parts[@]}"; do
    parent_dir="$parent_dir/$part"
    [[ ! -L "$parent_dir" ]] || exit 1
    [[ ! -e "$parent_dir" || -d "$parent_dir" ]] || exit 1
    if [[ ! -d "$parent_dir" ]]; then mkdir -m 755 "$parent_dir"; fi
  done
  [[ -f "$repo_dir/public/$file" && ! -L "$public_dir/$file" ]] || exit 1
  [[ ! -e "$public_dir/$file" || -f "$public_dir/$file" ]] || exit 1
done
umask 077
mkdir -p "$backup_root"
backup_dir="$(mktemp -d "$backup_root/services-XXXXXX")"
for file in "${files[@]}"; do
  if [[ -f "$public_dir/$file" ]]; then
    mkdir -p "$backup_dir/$(dirname "$file")"
    cp -p "$public_dir/$file" "$backup_dir/$file"
  else
    printf '%s\n' "$file" >> "$backup_dir/new-files.txt"
  fi
done
echo "Backup privado dos serviços: $backup_dir"
for file in "${files[@]}"; do
  stage="$(mktemp "$public_dir/$(dirname "$file")/.services-XXXXXX")"
  cp "$repo_dir/public/$file" "$stage"
  chmod 644 "$stage"
  mv "$stage" "$public_dir/$file"
done
echo 'Quatro páginas de serviços e assets publicados. Home, blog, Flow, Forms e regras preservados.'
