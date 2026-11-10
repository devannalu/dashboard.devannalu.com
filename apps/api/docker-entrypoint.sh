#!/bin/sh
# Inicialização da API em produção: valida a configuração do banco com mensagem clara,
# aplica migrações pendentes e sobe o servidor. Nunca imprime o valor da URL (contém senha).
set -e

case "$DATABASE_URL" in
  "")
    echo "[Annalu Studio OS] DATABASE_URL está vazia ou não foi definida."
    echo "  Defina a variável com a URL interna do MySQL (começa com mysql://), como variável de execução."
    exit 1
    ;;
  \"*|\'*)
    echo "[Annalu Studio OS] DATABASE_URL começa com aspas. Remova as aspas do valor."
    exit 1
    ;;
  mysql://*)
    ;;
  *)
    echo "[Annalu Studio OS] DATABASE_URL não começa com mysql://."
    echo "  Confira se não há espaço no início ou o texto 'DATABASE_URL=' repetido dentro do valor."
    exit 1
    ;;
esac

pnpm exec prisma migrate deploy
exec node dist/main.js
