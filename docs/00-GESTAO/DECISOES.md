# Decisões

Formato curto de ADR. Cada decisão nova entra no fim, com número sequencial.
Mudou de ideia? Não apague: marque como **substituída por Dxxx**.

---

## D001 — TypeScript nos dois lados
**Data:** 2026-10-01 · **Status:** aceita

**Contexto.** Pedido explícito: TypeScript/JavaScript. As regras do jogo (XP,
aprovação, sorteio de chefe) precisam ser iguais no servidor e na tela.
**Decisão.** Node 22 + TypeScript no servidor, TypeScript no navegador, e um
pacote `packages/regras` com as regras puras usado pelos dois.
**Alternativas.** C++ como no `planejamento` — rápido, mas fora do pedido e
sem reaproveitar regras no navegador.
**Consequências.** Uma linguagem só; regras testadas uma vez.

## D002 — SQLite como banco
**Data:** 2026-10-01 · **Status:** aceita

**Contexto.** Um usuário, carga mínima, precisa rodar local e no VPS.
**Decisão.** SQLite em modo WAL, via `better-sqlite3`. Arquivo em
`data/estudos.db`, fora do git. Migrações numeradas em `apps/api/migrations/`.
**Alternativas.** Postgres no VPS — serviço a mais para administrar sem ganho
nessa escala. Fica como caminho se houver vários usuários.
**Consequências.** Backup = copiar um arquivo. Acesso isolado em `repository/`
para trocar de banco sem mexer nas regras. **Não é preciso acesso a nenhum
banco existente.**

## D003 — Conteúdo no git, progresso no banco
**Data:** 2026-10-01 · **Status:** aceita

**Contexto.** Currículo e questões mudam por revisão, como código. Progresso
muda a cada minuto.
**Decisão.** Atos, módulos, tópicos, roteiros e questões vivem em YAML em
`conteudo/`. Um importador sincroniza para o banco usando IDs estáveis
(`M1.4`, `M1.4.T03`, `Q-M1.4.T03-017`). Progresso só existe no banco.
**Consequências.** Histórico e revisão de conteúdo por diff. Questão editada
mantém o ID; questão removida é marcada `aposentada`, nunca apagada (há
respostas apontando para ela).

## D004 — O servidor é a autoridade
**Data:** 2026-10-01 · **Status:** aceita

**Contexto.** Se o navegador tiver o gabarito ou contar o tempo, o jogo vira
enfeite — basta abrir o DevTools.
**Decisão.** O servidor sorteia as questões, guarda o gabarito, corrige e conta
o tempo a partir dos heartbeats que ele mesmo recebeu.
**Consequências.** O navegador só recebe enunciado e alternativas. Explicação
e resposta certa só depois de responder.

## D005 — Canvas 2D próprio, sem engine de jogo
**Data:** 2026-10-01 · **Status:** aceita

**Contexto.** O jogo é uma linha com bifurcações e um boneco andando. O resto
(quiz, painel, skills) é interface comum.
**Decisão.** Canvas 2D com laço de jogo pequeno para o mapa; telas de quiz,
painel e skills em HTML/CSS. Vite como build.
**Alternativas.** Phaser 3 — ótimo, mas é 1 MB e uma API inteira para aprender
para desenhar uma linha. Vale reavaliar se o mapa crescer (2D livre, colisão).
**Consequências.** Bundle pequeno, nada que atrapalhe a acessibilidade do quiz.

## D006 — Aprovação no inimigo: 2 de 3, crítico com 3 de 3
**Data:** 2026-10-01 · **Status:** substituída por D010

**Contexto.** Três questões é pouca amostra: exigir 3/3 pune um deslize; 1/3
é chute.
**Decisão.** Passa com **2/3**. **3/3 = golpe crítico** (+50% de XP). As
questões saem de um pool de ≥ 12 por tópico, então repetir não é decorar.
**Consequências.** O rigor de verdade fica no chefe (≥ 70%) e nas revisões.

## D007 — Derrota expulsa da fase, mas não apaga o que foi vencido
**Data:** 2026-10-01 · **Status:** aceita (P3, confirmada pelo Matheus)

**Contexto.** Pedido: "se não passar, volta, fora da fase". Recomeçar a fase
inteira jogaria fora dezenas de horas de estudo válido.
**Decisão.** Perder para um inimigo te expulsa para o mapa. Inimigos vencidos
continuam vencidos. Para lutar de novo contra o mesmo inimigo, é preciso
estudar mais **20% do tempo mínimo** dele (recuperação). Pode ir para outra
fase enquanto isso.
**Alternativa.** **Modo hardcore** (opcional, configurável): a derrota
"revive" os inimigos da fase, que voltam a exigir só o quiz (sem tempo mínimo).
**Consequências.** Derrota dói, mas não apaga estudo real.

## D008 — Chefe sorteado entre 20 variantes, sem repetir as 3 últimas
**Data:** 2026-10-01 · **Status:** aceita

**Contexto.** Pedido: chefe diferente, nada repetitivo.
**Decisão.** Cada chefe sorteia uma de 20 variantes, com peso por adequação ao
módulo (ex.: "Colosso Numérico" só em módulos com cálculo) e excluindo as 3
últimas usadas. A variante é sorteada **ao entrar** e fica fixa até vencer.
**Consequências.** Não dá para "rerolar" fugindo do chefe.

## D009 — Publicação em `meh-eng.com/estudos`
**Data:** 2026-10-01 · **Status:** proposta

**Contexto.** O VPS já tem Caddy servindo o site e `/planejamento` por
`handle_path` + `reverse_proxy`.
**Decisão.** Mesmo padrão: `handle_path /estudos/*` → `127.0.0.1:8090`,
serviço systemd próprio, banco em `/var/lib/estudos/`.
**Consequências.** O front usa caminhos relativos para funcionar no subcaminho.

## D010 — Combate por vida, dado e defesa
**Data:** 2026-10-01 · **Status:** aceita (P2, ideia do Matheus)

**Contexto.** Nota fixa (2/3) é seca e não dá papel ao personagem. A ideia:
quem decide a luta é a vida do boneco; cada erro é um golpe com dano tirado
num dado de 0 a 6; a defesa reduz o dano em percentual; a vida sobe 1 por nível.
**Decisão.**
- `dano = dado(0–6) × poder_da_fase × (1 − defesa)`; vida zerou = derrota.
- Vida: 6 no nível 1, +1 por nível, +1 por nível de Vitalidade (D013).
- **Poder da fase** escala com o nível esperado na fase, para a luta não ficar
  trivial quando a vida crescer.
- **Piso de conhecimento**: 0/3 no combate e < 60% no chefe perdem sempre.
- **Preparo**: estudar além do mínimo dá defesa contra aquele inimigo.
- No chefe, vida de batalha = vida × N ÷ 7.
- Dado rolado **no servidor** (D004), com gerador criptográfico, e gravado.
**Alternativas.** Manter 2/3 fixo, mais previsível porém sem graça; vida sem
piso, o que deixaria um boneco forte passar sem saber nada.
**Consequências.** Há sorte: simulado, ~14% de cair com só 1 erro sem defesa.
Defesa e Preparo tiram o azar de quem estudou. O painel acompanha "derrotas
por azar" (meta ≤ 15%).

## D011 — Revanche sempre dá XP, com valor reduzido
**Data:** 2026-10-01 · **Status:** aceita (25%/50% confirmados pelo Matheus)

**Contexto.** Pedido: inimigo e chefe já vencidos devem dar XP de novo.
Uma revanche de inimigo leva ~3 min; com XP cheio, valeria 100 vezes mais que
estudar.
**Decisão.** Revanche de inimigo: 25% do XP, 1 por dia por inimigo, sem tempo
mínimo. Revanche de chefe: 50% do XP, 1 a cada 7 dias, nova variante. Perder
uma revanche não muda nada. Questões saem das menos vistas.
**Consequências.** Revanche vira revisão extra recompensada, sem virar fazenda
de XP nem decoreba do pool. Não conta para os fantasmas nem para "Consolidado".

## D012 — Nome: Forja M&H
**Data:** 2026-10-01 · **Status:** aceita (P4)

Título do jogo e da página: **Forja M&H**. Caminho de publicação continua
`meh-eng.com/estudos` (D009).

## D013 — Valores das skills do Guerreiro e 2 pontos por nível
**Data:** 2026-10-01 · **Status:** aceita (definido pelo Matheus)

**Decisão.**
| Skill | Por nível | Máximo |
|---|---|---|
| Vitalidade | +1 de vida | nv. 50 |
| Defesa | +2% de redução | 80% (nv. 40) |
| Esquiva | +1% de chance de dano 0 | 50% (nv. 50) |
| Sorte | 1 rerrolagem por luta | nv. 3 |
| Regeneração | cura 0,05 × poder **a cada acerto** | nv. 20 |

Pontos de skill: **2 por nível do personagem, e só isso**.
**Consequências.** Com a curva da D014, ≈ 88 pontos na jornada contra ≈ 271
para maximizar tudo (Guerreiro 169 + outros ramos 102): é preciso escolher.
A tensão do combate com builds fortes (P10) é resolvida por D014 + D015.

## D014 — Curva de XP por faixas de 2.000 horas
**Data:** 2026-10-01 · **Status:** aceita (ideia do Matheus)

**Contexto.** Subir de nível precisa ser difícil, mas com sensação de
conquista. A curva `100 × n²` dava nível ~92 e ~182 pontos de skill, e as
builds fortes chegavam cedo demais (P10).
**Decisão.** Faixas de 2.000 h válidas. Dentro da faixa, cada nível custa o
**dobro** do anterior; a base da faixa dobra a cada faixa (100, 200, 400, 800,
1.600 XP). Ao bater o **Marco** de horas, o nível preso sobe na hora, a barra
zera e o custo volta para a base da nova faixa. Faixa por horas válidas, não
por XP.
**Alternativa.** Carregar o XP que sobrou para a nova faixa: simulado, dava
+8 níveis de uma vez no Marco e só +2 no resto da faixa, ou seja, quase todo
o progresso no mesmo dia. Rejeitada.
**Consequências.** Nível ~45 no fim (vida 50), ~88 pontos de skill. Começo de
cada faixa rápido, fim lento. O nível de referência das fases (poder do
inimigo) usa a mesma curva.

## D015 — Inimigos que aprendem com a sua derrota
**Data:** 2026-10-01 · **Status:** aceita (ideia do Matheus)

**Decisão.** O servidor calcula a **fraqueza** por tópico e por objetivo de
aprendizagem (erros com meia-vida de 30 dias). Cada derrota dá +1 de
**adaptação** (0–5) ao inimigo ou chefe: +10% de poder, +10% de perfuração
(ignora defesa e esquiva) e +10% das questões nos seus pontos fracos por
nível. A vitória zera. Detalhes em `05-RPG/ADAPTACAO.md`.
**Consequências.** Derrota vira prática deliberada. Risco de espiral de
derrota, contido pelo teto 5, pelas feridas e pelo Treino, que reduz a
adaptação. Toda questão passa a ter `objetivo_id` obrigatório.

## D016 — SQLite e scrypt embutidos no Node
**Data:** 2026-10-01 · **Status:** aceita

**Contexto.** `better-sqlite3` e `@node-rs/argon2` precisam de binário nativo
compilado ou baixado por plataforma, e isso quebra fácil no VPS.
**Decisão.** `node:sqlite` (Node ≥ 22.13) para o banco e `crypto.scrypt` para
senhas. Mesma API síncrona, mesmo SQLite, zero dependência nativa.
**Consequências.** O Node avisa que `node:sqlite` é experimental (o aviso é
silenciado nos scripts). O acesso continua isolado em `apps/api/src/db.ts`;
trocar de driver é mexer em um arquivo só.

## D017 — Ordem preferida no A0 e conteúdo nessa ordem
**Data:** 2026-10-03 · **Status:** aceita (definido pelo Matheus)

Depois do M0.1: **M0.4 Circuitos DC → M0.7 Ferramentas → M0.6 C/C++ →
M0.2 Matemática**. O mapa continua permitindo qualquer ordem; o conteúdo
just-in-time é produzido nessa sequência. Meta final reforçada: entender e
ser capaz de produzir uma placa completa e um processador próprio, e
conhecer as máquinas da linha de produção — já coberto por A3, A5 e A6;
"da mina ao componente" entra como missão secundária (TRILHAS.md).

## D018 — M0.4 começa pela segurança
**Data:** 2026-10-03 · **Status:** aceita

No M0.4 a ordem de estudo é **T09 Segurança e ESD → T01 Ohm → T08 Multímetro,
fonte e protoboard → T02 … T07**. Os exercícios "na bancada" dos tópicos de
teoria já usam fonte com limite de corrente e amperímetro em série, então os
instrumentos vêm cedo. Os IDs não mudam; só a ordem no `modulo.yaml`.
