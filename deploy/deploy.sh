#!/bin/bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
account_dir="${BADON_ACCOUNT_DIR:-$HOME}"
if [[ "$account_dir" != /* || "$account_dir" == / || ! -d "$account_dir" ]]; then
  echo 'Diretório da conta inválido.' >&2; exit 1
fi
public_dir="$account_dir/public_html"
app_dir="$account_dir/badon-app"
if [[ -L "$public_dir" || -L "$app_dir" ]]; then
  echo 'Destino com link simbólico: confira manualmente antes do deploy.' >&2; exit 1
fi
umask 022
mkdir -p "$public_dir"
mkdir -p -m 700 "$app_dir"
# Copiar somente o conteúdo público. Não apagar arquivos de outras páginas.
cp -R "$repo_dir/public/." "$public_dir/"
cp -R "$repo_dir/app/." "$app_dir/"
chmod -R go-rwx "$app_dir"
# O config privado nunca é criado, copiado ou sobrescrito pelo deploy.
if [[ -f "$public_dir/.htaccess" ]]; then
  cp "$public_dir/.htaccess" "$public_dir/.htaccess.badon-backup-$(date +%Y%m%d%H%M%S)"
fi
merged="$(mktemp "$public_dir/.htaccess.badon-XXXXXX")"
cat "$repo_dir/.badon-404-rules" > "$merged"
if [[ -f "$public_dir/.htaccess" ]]; then
  # Substituir somente o bloco Bādon; manter regras do cPanel, PHP e WordPress.
  awk '
    /^# BEGIN BADON CUSTOM 404\r?$/ {if (skip) exit 1; skip=1; next}
    /^# END BADON CUSTOM 404\r?$/ {skip=0; next}
    /^DirectoryIndex index.html index.php\r?$/ {next}
    !skip {print}
    END {if (skip) exit 1}
  ' "$public_dir/.htaccess" >> "$merged"
fi
chmod 644 "$merged"
mv "$merged" "$public_dir/.htaccess"
echo 'Arquivos públicos e aplicação atualizados. Configuração privada preservada.'
if [[ ! -f "$account_dir/badon-config/config.php" ]]; then
  echo 'ATENÇÃO: configure badon-config/config.php e inicialize o banco antes de usar /admin.'
fi
