# Integrações

## Caddy no VPS (publicação)
Mesmo padrão do `planejamento` (`implantacao/Caddyfile.plataforma`):

```caddy
redir /estudos /estudos/
handle_path /estudos/* {
    reverse_proxy 127.0.0.1:8090
}
```
O front é gerado com `base: './'` no Vite para funcionar no subcaminho, e o
cabeçalho `Cache-Control: no-cache` em `*.html *.js *.css` evita o problema de
cópia velha na Cloudflare já resolvido no outro projeto.

## Claude API (opcional, F6)
| Uso | Como | Limite |
|---|---|---|
| Rascunho de questões | `ferramentas/gerar-questoes.ts` recebe tópico + roteiro + trechos das fontes e gera N questões no schema YAML | Sempre `origem: ia`, `revisao: rascunho`; **não entram no jogo sem revisão humana** |
| Segunda opinião em dissertativa | Rubrica + resposta → nota sugerida e comentário | Autoavaliação continua sendo a nota oficial (P7) |
| Explicar um erro | Após errar, botão "me explica de outro jeito" | Só depois de responder; nunca durante |

Modelo configurável por variável de ambiente (`CLAUDE_MODELO`). Sem chave, o
sistema funciona igual — só some o botão.

## Fontes de estudo
Links para livros, documentação de fabricantes (Espressif, ST, TI) e cursos
ficam no roteiro de cada tópico. Nenhuma integração automática: o sistema
aponta, você estuda.

## Futuro (não agora)
- Exportar flashcards para Anki.
- Calendário (bloco de estudo agendado).
- Notificação de fantasmas do dia (e-mail ou push).

## Publicação atual (2026-10-03)
Enquanto o domínio próprio não chega, a Forja roda em
**https://planejamento.meh-eng.com/forja/**: um `handle_path /forja/*` dentro
do bloco do planejamento no Caddy repassa para `127.0.0.1:8090`. Não precisa
de DNS novo. Quando houver acesso ao DNS (Cloudflare) ou domínio próprio, o
bloco pronto está em `implantacao/Caddyfile.forja` (D022). Ver `implantacao/`:
`instalar.sh` (uma vez), `atualizar.sh` (cada publicação), serviço systemd
`forja` (usuário de sistema, só `127.0.0.1:8090`), backup diário às 04:30
(30 diárias + 12 mensais) e Node 22 oficial em `/opt/node22`.
