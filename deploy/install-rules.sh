#!/bin/bash
# Rules-only deployment: no application, database or uploaded-file changes.
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
if [[ "$account_dir" != /* || "$account_dir" == / || ! -d "$account_dir/public_html" || -L "$account_dir/public_html" || -L "$account_dir/public_html/.htaccess" ]]; then
  echo 'Destino das regras inválido.' >&2; exit 1
fi
public_dir="$account_dir/public_html"
backup_root="$account_dir/badon-site-backups"
if [[ -L "$backup_root" ]]; then echo 'Backup com link simbólico: confira manualmente.' >&2; exit 1; fi
umask 077
mkdir -p "$backup_root"
backup_dir="$(mktemp -d "$backup_root/rules-XXXXXX")"
merged="$backup_dir/htaccess.new"
if [[ -f "$public_dir/.htaccess" ]]; then cp -p "$public_dir/.htaccess" "$backup_dir/htaccess.before"; fi
cat "$repo_dir/.badon-404-rules" > "$merged"
if [[ -f "$public_dir/.htaccess" ]]; then
  awk '
    /^# BEGIN (BADON CUSTOM 404|WordPress)\r?$/ {if (skip) exit 1; skip=1; next}
    /^# END (BADON CUSTOM 404|WordPress)\r?$/ {if (!skip) exit 1; skip=0; next}
    /^DirectoryIndex index.html index.php\r?$/ {next}
    !skip {print}
    END {if (skip) exit 1}
  ' "$public_dir/.htaccess" >> "$merged"
fi
chmod 644 "$merged"
cp "$merged" "$backup_dir/htaccess.after"
mv "$merged" "$public_dir/.htaccess"
echo "Regras publicadas; backup recuperável em: $backup_dir"
