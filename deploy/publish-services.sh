#!/bin/bash
# Scoped service-page release: no home, blog, routing, application or database changes.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
[[ "$account_dir" = /* && "$account_dir" != / && -d "$account_dir" && ! -L "$account_dir" ]] || exit 1
public_dir="$account_dir/public_html"
backup_root="$account_dir/badon-site-backups"
[[ -d "$public_dir" && ! -L "$public_dir" && ! -L "$backup_root" ]] || exit 1
files=(assets/css/service-pages.css assets/css/sites-service.css assets/js/sites-service.js servicos/sites.html servicos/identidade-visual.html servicos/trafego-pago.html servicos/google-meu-negocio.html)
for dir in assets assets/css assets/js servicos; do
  [[ -d "$public_dir/$dir" && ! -L "$public_dir/$dir" ]] || exit 1
done
for file in "${files[@]}"; do
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
