#!/bin/bash
# Prepara o VPS para a Forja M&H. Roda UMA vez (é seguro rodar de novo).
#
#   bash implantacao/instalar.sh
#
# Instala o Node 22 em /opt/node22 (binário oficial, conferido pelo SHA-256),
# cria o usuário de sistema `forja`, sobe o código, instala o serviço e o
# backup diário, e acrescenta o bloco forja.meh-eng.com ao Caddy — validando
# antes de recarregar, para não derrubar o planejamento.
set -euo pipefail

SERVIDOR="${SERVIDOR:-root@143.95.166.153}"
PORTA="${PORTA:-22022}"
NODE_VERSAO="v22.23.3"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ssh_() { ssh -p "$PORTA" "$SERVIDOR" "$@"; }

echo "--- 1/5 Node $NODE_VERSAO ---"
ssh_ "set -e
  if [ -x /opt/node22/bin/node ] && [ \"\$(/opt/node22/bin/node -v)\" = $NODE_VERSAO ]; then echo '  já instalado'; exit 0; fi
  cd /tmp
  arq=node-$NODE_VERSAO-linux-x64.tar.xz
  curl -fsSLO https://nodejs.org/dist/$NODE_VERSAO/\$arq
  curl -fsSL https://nodejs.org/dist/$NODE_VERSAO/SHASUMS256.txt | grep \" \$arq\$\" | sha256sum -c -
  rm -rf /opt/node22 && mkdir -p /opt/node22 && tar xJf \$arq -C /opt/node22 --strip-components=1 && rm \$arq
  /opt/node22/bin/node -v"

echo "--- 2/5 usuário e pastas ---"
ssh_ 'set -e
  id forja >/dev/null 2>&1 || useradd --system --home /opt/forja --shell /usr/sbin/nologin forja
  mkdir -p /opt/forja/data/copias
  chown -R forja:forja /opt/forja && chmod 700 /opt/forja/data'

echo "--- 3/5 serviço e backup ---"
for f in forja.service forja-backup.service forja-backup.timer; do
  ssh_ "cat > /etc/systemd/system/$f" < "$RAIZ/implantacao/$f"
done
ssh_ 'systemctl daemon-reload && systemctl enable forja >/dev/null && systemctl enable --now forja-backup.timer >/dev/null && echo "  ok"'

echo "--- 4/5 código (atualizar.sh) ---"
bash "$RAIZ/implantacao/atualizar.sh"

echo "--- 5/5 Caddy ---"
if ssh_ 'grep -q "^forja.meh-eng.com" /etc/caddy/Caddyfile'; then
  echo "  bloco já existe"
else
  ssh_ 'cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.antes-da-forja'
  ssh_ 'cat >> /etc/caddy/Caddyfile' < "$RAIZ/implantacao/Caddyfile.forja"
  if ssh_ 'caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1'; then
    # O validate roda como root e pode criar o log com dono root: devolve ao caddy.
    ssh_ 'touch /var/log/caddy/forja.log && chown caddy:caddy /var/log/caddy/forja.log && systemctl reload caddy && echo "  Caddy recarregado"'
  else
    ssh_ 'cp /etc/caddy/Caddyfile.antes-da-forja /etc/caddy/Caddyfile'
    echo "  ERRO: Caddyfile inválido; restaurado o anterior. Nada mudou no Caddy."; exit 1
  fi
fi
cat <<'FIM'

Pronto. Falta:
  1. Cloudflare → DNS → registro A  forja → 143.95.166.153  (nuvem laranja)
  2. Criar sua conta no servidor:
       ssh -t -p 22022 root@143.95.166.153 \
         'cd /opt/forja/app && sudo -u forja FORJA_DB=/opt/forja/data/estudos.db \
          /opt/node22/bin/node --import tsx ferramentas/criar-usuario.ts matheus'
FIM
