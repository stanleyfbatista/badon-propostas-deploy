#!/bin/bash
# Scoped publication: no application, database, routing or credential changes.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
[[ "$account_dir" = /* && "$account_dir" != / && -d "$account_dir" && ! -L "$account_dir" ]] || exit 1
public_dir="$account_dir/public_html"
backup_root="$account_dir/badon-site-backups"
[[ -d "$public_dir" && ! -L "$public_dir" && ! -L "$backup_root" ]] || exit 1
files=(
  assets/css/article-business.css
  assets/img/blog/badon-site-desktop.jpg
  assets/img/blog/badon-site-mobile.jpg
  blog/cara-de-empresa-grande.html
  assets/js/main.js
  blog/index.html
  sitemap.xml
)
for dir in assets assets/css assets/js assets/img assets/img/blog blog; do
  [[ -d "$public_dir/$dir" && ! -L "$public_dir/$dir" ]] || exit 1
done
for file in "${files[@]}"; do
  [[ -f "$repo_dir/public/$file" && ! -L "$public_dir/$file" ]] || exit 1
done
umask 077
mkdir -p "$backup_root"
backup_dir="$(mktemp -d "$backup_root/article-XXXXXX")"
for file in "${files[@]}"; do
  if [[ -f "$public_dir/$file" ]]; then
    mkdir -p "$backup_dir/$(dirname "$file")"
    cp -p "$public_dir/$file" "$backup_dir/$file"
  else
    printf '%s\n' "$file" >> "$backup_dir/new-files.txt"
  fi
done
echo "Backup privado do artigo: $backup_dir"
for file in "${files[@]}"; do
  stage="$(mktemp "$public_dir/$(dirname "$file")/.article-XXXXXX")"
  cp "$repo_dir/public/$file" "$stage"
  chmod 644 "$stage"
  mv "$stage" "$public_dir/$file"
done
echo 'Artigo, estilo, índices do blog/home e sitemap publicados. Flow, Forms e regras preservados.'
