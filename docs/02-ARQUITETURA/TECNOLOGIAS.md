# Tecnologias

| Camada | Escolha | Por quê |
|---|---|---|
| Linguagem | TypeScript 5 (strict) | Pedido; tipos compartilhados entre servidor e tela |
| Runtime | Node.js 22 LTS | Estável, roda igual local e no VPS |
| HTTP | Fastify | Rápido, schema de entrada/saída com validação, plugins simples |
| Validação | Zod | Mesmo schema para API, YAML de conteúdo e tipos |
| Banco | SQLite embutido no Node (`node:sqlite`) | Síncrono, arquivo único, zero binário nativo (D002, D016) |
| Migrações | SQL puro numerado + tabela `migracao` | Sem mágica; igual ao projeto `planejamento` |
| Front build | Vite | Dev server instantâneo, build estático |
| Mapa | Canvas 2D próprio | O jogo é uma linha; não precisa de engine (D005) |
| Telas | HTML/CSS + TS, sem framework | Poucas telas; se crescer, Preact entra sem reescrever |
| Gráficos do painel | uPlot ou Chart.js | Leves |
| Conteúdo | YAML + Markdown | Editável à mão, diff legível |
| Testes | Vitest (unidade/integração) + Playwright (ponta a ponta) | Rápidos, TS nativo |
| Qualidade | ESLint + Prettier + `tsc --noEmit` | Padrão |
| Monorepo | npm workspaces | Sem ferramenta extra |
| IA (opcional) | Claude API via `@anthropic-ai/sdk` | Rascunho de questões e segunda opinião em dissertativas |
| Publicação | Caddy (já existe) + systemd | Mesmo padrão do `planejamento` |

## Versões
Fixar no `package.json` com `^` só em patch/minor; `package-lock.json`
commitado. Atualizar dependências uma vez por mês, numa branch.
