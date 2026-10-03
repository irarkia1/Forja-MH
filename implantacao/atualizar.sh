#!/bin/bash
# Leva o código daqui para o servidor e reinicia a Forja M&H.
#
#   bash implantacao/atualizar.sh
#
# Só CÓDIGO e CONTEÚDO sobem. O banco de produção nunca é tocado, mas um
# backup é feito antes, porque migração nova roda sozinha na subida.
set -euo pipefail

SERVIDOR="${SERVIDOR:-root@143.95.166.153}"
PORTA="${PORTA:-22022}"
ENDERECO="${ENDERECO:-https://forja.meh-eng.com}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"
ssh_() { ssh -p "$PORTA" "$SERVIDOR" "$@"; }

if [ -n "$(git status --porcelain -- apps packages conteudo ferramentas 2>/dev/null)" ]; then
  echo "AVISO: há mudanças não commitadas. Sobe assim mesmo? [s/N]"
  read -r r; [ "$r" = "s" ] || exit 1
fi

# Node 22 local: o do PATH, ou o do nvm (o nvm não convive com set -eu).
if ! node -v 2>/dev/null | grep -q '^v22'; then
  set +eu; export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" >/dev/null; nvm use "$(cat .nvmrc)" >/dev/null; set -eu
fi
node -v | grep -q '^v22' || { echo "Precisa do Node 22 local."; exit 1; }

echo "--- 1/6 verificação local (tipos, testes, conteúdo) ---"
LOG="$(mktemp)"
if ! npm run -s verificar >"$LOG" 2>&1; then tail -30 "$LOG"; echo "Verificação falhou: nada subiu."; exit 1; fi
grep -E "Tests |✔" "$LOG" | sed 's/^/  /'; rm -f "$LOG"

echo "--- 2/6 build do front ---"
npm run -s build >/dev/null

echo "--- 3/6 backup do banco de produção ---"
ssh_ 'if [ -f /opt/forja/data/estudos.db ]; then
  cd /opt/forja/app && sudo -u forja FORJA_DB=/opt/forja/data/estudos.db NODE_OPTIONS=--disable-warning=ExperimentalWarning \
    /opt/node22/bin/node --import tsx ferramentas/backup.ts /opt/forja/data/copias/antes-de-publicar
else echo "  (ainda não há banco)"; fi'

echo "--- 4/6 enviando código ---"
tar czf - --exclude=./node_modules --exclude=./data --exclude=./.git --exclude=./estudos.cpp . \
  | ssh_ 'rm -rf /opt/forja/app.novo && mkdir -p /opt/forja/app.novo && tar xzf - -C /opt/forja/app.novo'

echo "--- 5/6 dependências ---"
ssh_ 'set -e
  cd /opt/forja
  # Reaproveita node_modules quando o package-lock não mudou.
  if [ -d app/node_modules ] && cmp -s app/package-lock.json app.novo/package-lock.json; then
    mv app/node_modules app.novo/
  else
    cd app.novo && PATH=/opt/node22/bin:$PATH npm ci --no-audit --no-fund --loglevel=error && cd ..
  fi
  rm -rf app.antigo; [ -d app ] && mv app app.antigo; mv app.novo app
  chown -R forja:forja /opt/forja'

echo "--- 6/6 reiniciando ---"
ssh_ 'systemctl restart forja; sleep 4
  systemctl is-active --quiet forja || { journalctl -u forja -n 30 --no-pager; exit 1; }
  journalctl -u forja -n 5 --no-pager | grep -E "conteúdo|API em" | sed "s/^/  /"
  printf "  local:   "; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8090/'
printf "  público: "; curl -s -o /dev/null -w "%{http_code}\n" "$ENDERECO/" || true
echo "Publicado: $ENDERECO"
