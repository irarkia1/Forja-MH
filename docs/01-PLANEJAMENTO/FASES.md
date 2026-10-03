# Fases do sistema

Cada fase entrega algo **usável**. Nenhuma fase começa antes da anterior estar
em uso real.

## F0 — Planejamento
**Entrega:** esta documentação. **Pronto quando:** P1–P4 fechadas. ✔ 2026-10-01

## F1 — MVP jogável (≈ 3 semanas)
**Entrega:** dá para estudar o M0.1 inteiro pelo jogo.
- Monorepo, banco, migrações, login de um usuário.
- Importador `conteudo/*.yaml` → banco, com validação.
- Mapa do Ato 0 em linha com bifurcação; boneco anda com ← → ↑ ↓ e clique.
- Tela de fase com inimigos; entrar no inimigo abre roteiro + cronômetro.
- Heartbeat a cada 30 s; servidor soma só minutos válidos.
- Combate de 3 questões sorteadas, correção no servidor, explicação após responder.
- Vida (6 + nível), dado 0–6 rolado no servidor, poder da fase, piso 0/3.
- Derrota expulsa para o mapa; vitória grava; revanche com XP reduzido.
- Chefe **provisório**: prova simples de 10 questões (variante "Guardião").

## F2 — Chefes (≈ 2 semanas)
- As 20 variantes como "modificadores" plugáveis (ver CHEFES.md).
- Sorteio ponderado, sem repetir as 3 últimas.
- Prova longa com retomada e salvamento por questão.
- Cooldown e feridas após derrota.

## F3 — Personagem (≈ 2 semanas)
- XP, níveis 1–100, títulos.
- Árvore de skills, energia, cargas por prova, registro de ajudas.
- Inimigos de elite com upload de evidência.

## F4 — Revisão espaçada (≈ 1 semana)
- Agenda 1/3/7/21/60 dias; fantasmas aparecem no mapa e no acampamento.
- Estados de domínio.

## F5 — Acompanhamento e publicação (≈ 1–2 semanas)
- Painel completo (ver TELAS.md).
- Backup diário, publicação no VPS, HTTPS pelo Caddy.

## F6 — Contínuo
- Gerador de questões com Claude + fila de revisão.
- Ajustes de balanceamento a cada fim de ato, com base nos dados do painel.
