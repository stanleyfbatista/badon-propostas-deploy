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
# Keep the previous institutional entry point outside the public document root.
# Other applications and their data are not included in this site-only backup.
if [[ -f "$public_dir/index.html" ]]; then
  site_backup_root="$account_dir/badon-site-backups"
  if [[ -L "$site_backup_root" ]]; then
    echo 'Diretório de backup com link simbólico: confira manualmente.' >&2; exit 1
  fi
  mkdir -p -m 700 "$site_backup_root"
  site_backup_dir="$(mktemp -d "$site_backup_root/release-XXXXXX")"
  for site_item in index.html robots.txt sitemap.xml .htaccess assets blog servicos; do
    if [[ -e "$public_dir/$site_item" ]]; then
      cp -RP "$public_dir/$site_item" "$site_backup_dir/"
    fi
  done
  echo "Backup do site anterior: $site_backup_dir"
fi
# Copiar somente o conteúdo público. Não apagar arquivos de outras páginas.
cp -R "$repo_dir/public/." "$public_dir/"
cp -R "$repo_dir/app/." "$app_dir/"
chmod -R go-rwx "$app_dir"
# O config privado nunca é criado, copiado ou sobrescrito pelo deploy.
BADON_ACCOUNT_DIR="$account_dir" /bin/bash "$repo_dir/deploy/install-rules.sh"
echo 'Arquivos públicos e aplicação atualizados. Configuração privada preservada.'
if [[ ! -f "$account_dir/badon-config/config.php" ]]; then
  echo 'ATENÇÃO: configure badon-config/config.php e inicialize o banco antes de usar /admin.'
fi
