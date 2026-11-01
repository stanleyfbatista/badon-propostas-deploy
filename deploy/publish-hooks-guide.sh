#!/bin/bash
# Publica somente o presente /presentes/50-ganchos/. Não executa o deploy do app.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
[[ "$account_dir" = /* && "$account_dir" != / && -d "$account_dir" && ! -L "$account_dir" ]] || exit 1
public_dir="$account_dir/public_html"
backup_root="$account_dir/badon-site-backups"
[[ -d "$public_dir" && ! -L "$public_dir" && ! -L "$backup_root" ]] || exit 1
route="presentes/50-ganchos"
files=(guia.css guia.js ganchos-data.json stanley-batista.webp logo-badon.svg simbolo-badon.svg guia-50-ganchos-badon.pdf guia-50-ganchos-badon.txt index.html)
for dir in presentes "$route"; do
  [[ ! -L "$public_dir/$dir" ]] || exit 1
  [[ ! -e "$public_dir/$dir" || -d "$public_dir/$dir" ]] || exit 1
done
for file in "${files[@]}"; do
  [[ -f "$repo_dir/public/$route/$file" && ! -L "$repo_dir/public/$route/$file" ]] || exit 1
  [[ ! -L "$public_dir/$route/$file" ]] || exit 1
  [[ ! -e "$public_dir/$route/$file" || -f "$public_dir/$route/$file" ]] || exit 1
done
umask 077
mkdir -p "$backup_root"
backup_dir="$(mktemp -d "$backup_root/hooks-guide-XXXXXX")"
for file in "${files[@]}"; do
  if [[ -f "$public_dir/$route/$file" ]]; then
    cp -p "$public_dir/$route/$file" "$backup_dir/$file"
  else
    printf '%s\n' "$route/$file" >> "$backup_dir/new-files.txt"
  fi
done
for dir in presentes "$route"; do
  if [[ ! -d "$public_dir/$dir" ]]; then mkdir -m 755 "$public_dir/$dir"; fi
done
for file in "${files[@]}"; do
  stage="$(mktemp "$public_dir/$route/.guide-XXXXXX")"
  cp "$repo_dir/public/$route/$file" "$stage"
  chmod 644 "$stage"
  mv "$stage" "$public_dir/$route/$file"
done
printf 'Presente publicado em /%s/. Backup privado: %s\n' "$route" "$backup_dir"
printf 'Blog, página inicial, Flow, Forms, banco de dados e regras não foram alterados.\n'
