# Referências técnicas

Referências do **sistema** (as de estudo estão em FONTES.md).

## Stack
| Tema | Referência |
|---|---|
| Fastify | Documentação oficial (rotas, schemas, plugins) |
| better-sqlite3 | README e API (transações síncronas, WAL) |
| SQLite | `PRAGMA journal_mode=WAL`, `.backup`, índices parciais |
| Zod | Schemas e inferência de tipos |
| Vite | `base` relativo para subcaminho |
| Canvas 2D | MDN — `requestAnimationFrame`, `imageSmoothingEnabled = false` para pixel art |
| Page Visibility API | MDN — `document.visibilityState` para pausar o cronômetro |
| argon2 | OWASP Password Storage Cheat Sheet |

## Repetição espaçada
- Algoritmo SM-2 (SuperMemo) e FSRS (usado no Anki moderno). O jogo começa
  com agenda fixa 1/3/7/21/60 dias por simplicidade; migrar para FSRS é uma
  melhoria possível quando houver dados (HIPOTESES H4).

## Projeto irmão
- `../planejamento/` — mesmo padrão de documentação, ADRs, publicação com Caddy
  (`implantacao/Caddyfile.plataforma`) e cuidado com cache na Cloudflare.
