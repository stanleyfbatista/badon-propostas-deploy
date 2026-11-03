#!/bin/bash
# Publish only the Raizes landing page; preserve the institutional site and host rules.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
[[ "$account_dir" == /* && "$account_dir" != / && -d "$account_dir" ]] || exit 1
source_dir="$repo_dir/public/raizes"
public_dir="$account_dir/public_html"
target_dir="$public_dir/raizes"
backup_root="$account_dir/badon-site-backups"
for path in "$public_dir" "$target_dir" "$backup_root"; do
  [[ ! -L "$path" ]] || { echo "Destino com link simbólico: $path" >&2; exit 1; }
done
[[ -d "$public_dir" && -f "$source_dir/index.html" ]] || exit 1
[[ -z "$(find "$source_dir" -type l -print -quit)" ]] || exit 1
if [[ -d "$target_dir" ]]; then
  [[ -z "$(find "$target_dir" -type l -print -quit)" ]] || exit 1
fi
umask 077
mkdir -p "$backup_root"
backup_dir="$(mktemp -d "$backup_root/raizes-XXXXXX")"
if [[ -d "$target_dir" ]]; then cp -RP "$target_dir/." "$backup_dir/"; fi
umask 022
mkdir -p "$target_dir"
cp -R "$source_dir/assets" "$target_dir/"
for file in app.js styles.css refinements.css; do
  install -m 644 "$source_dir/$file" "$target_dir/$file"
done
# Publish the entry point last, after all of its dependencies are present.
install -m 644 "$source_dir/index.html" "$target_dir/index.html"
printf 'Raizes atualizada em /raizes/. Backup privado: %s\n' "$backup_dir"
