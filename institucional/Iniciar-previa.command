#!/bin/zsh
# Servidor local de revisão. Não publica nem altera a hospedagem.
cd -- "$(dirname -- "$0")" || exit 1
print "Prévia Bādon: http://127.0.0.1:4180/"
print "Abra esse endereço no navegador. Para encerrar, pressione Control+C."
if command -v php >/dev/null 2>&1; then
  exec php -S 127.0.0.1:4180
elif [[ -x /opt/homebrew/bin/php ]]; then
  exec /opt/homebrew/bin/php -S 127.0.0.1:4180
else
  print "PHP não encontrado. Instale PHP ou use outro servidor estático local."
  read "?Pressione Enter para fechar."
fi
