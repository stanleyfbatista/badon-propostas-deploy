#!/bin/bash
# Home navigation and scoped service-link styling. No blog, apps, routing or data.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
[[ "$account_dir" = /* && "$account_dir" != / && -d "$account_dir" && ! -L "$account_dir" ]] || exit 1
public_dir="$account_dir/public_html"
backup_root="$account_dir/badon-site-backups"
[[ -d "$public_dir" && ! -L "$public_dir" && ! -L "$backup_root" ]] || exit 1
files=(assets/css/service-experience.css assets/js/service-experience.js assets/js/main.js assets/css/home-services.css assets/img/home-google-profile-v1.webp assets/svg/google-ads.svg assets/svg/google-business.svg assets/svg/meta.svg assets/img/blog/trafego.webp assets/img/cases/paginas-de-vendas/badon-sites-notebook-recortado-v2.webp assets/img/cases/becare/identidade-embalagens.webp index.html)
for dir in assets assets/css assets/js assets/svg assets/img assets/img/blog assets/img/cases assets/img/cases/paginas-de-vendas assets/img/cases/becare; do
  [[ -d "$public_dir/$dir" && ! -L "$public_dir/$dir" ]] || exit 1
done
for file in "${files[@]}"; do
  [[ -f "$repo_dir/public/$file" && ! -L "$public_dir/$file" ]] || exit 1
  [[ ! -e "$public_dir/$file" || -f "$public_dir/$file" ]] || exit 1
done
umask 077
mkdir -p "$backup_root"
backup_dir="$(mktemp -d "$backup_root/home-navigation-XXXXXX")"
for file in "${files[@]}"; do
  if [[ -f "$public_dir/$file" ]]; then
    mkdir -p "$backup_dir/$(dirname "$file")"
    cp -p "$public_dir/$file" "$backup_dir/$file"
  else
    printf '%s\n' "$file" >> "$backup_dir/new-files.txt"
  fi
done
echo "Backup privado: $backup_dir"
for file in "${files[@]}"; do
  stage="$(mktemp "$public_dir/$(dirname "$file")/.navigation-XXXXXX")"
  cp "$repo_dir/public/$file" "$stage"
  chmod 644 "$stage"
  mv "$stage" "$public_dir/$file"
done
echo 'Navegação da página inicial publicada. Blog, aplicativos e regras preservados.'
