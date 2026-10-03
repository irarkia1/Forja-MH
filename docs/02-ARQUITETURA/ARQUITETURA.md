# Arquitetura

## Visão geral

```
 Navegador                              Servidor (Node 22)                 Disco
┌──────────────────────┐   HTTPS/JSON  ┌──────────────────────────┐   ┌──────────────┐
│ apps/web (Vite + TS) │ ────────────▶ │ apps/api (Fastify)       │──▶│ estudos.db   │
│  · mapa (Canvas 2D)  │ ◀──────────── │  · rotas/                │   │  (SQLite WAL)│
│  · telas HTML/CSS    │               │  · servicos/             │   ├──────────────┤
│  · usa packages/     │               │  · repository/           │   │ evidencias/  │
│    regras só p/ exibir│              │  · usa packages/regras   │   │  (uploads)   │
└──────────────────────┘               └──────────▲───────────────┘   └──────────────┘
                                                  │ importa
                                       ┌──────────┴───────────────┐
                                       │ conteudo/ (YAML no git)  │
                                       │ atos, módulos, tópicos,  │
                                       │ roteiros, questões       │
                                       └──────────────────────────┘
```

## Estrutura do repositório

```
Estudos/
├── docs/                      ← esta documentação
├── conteudo/
│   ├── atos.yaml              ← A0..A7, com horas e ordem
│   ├── A0/
│   │   ├── M0.1/
│   │   │   ├── modulo.yaml    ← tópicos, horas, pré-requisitos, chefe
│   │   │   ├── roteiros/T01.md
│   │   │   └── questoes/T01.yaml
│   │   └── ...
│   └── chefes/variantes.yaml  ← as 20 variantes e seus parâmetros
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── rotas/         ← HTTP: valida entrada, chama serviço
│   │   │   ├── servicos/      ← casos de uso: lutar, estudar, revisar
│   │   │   ├── repository/    ← único lugar com SQL
│   │   │   └── main.ts
│   │   ├── migrations/001_init.sql ...
│   │   └── test/
│   └── web/
│       ├── src/
│       │   ├── jogo/          ← laço, câmera, boneco, mapa (Canvas)
│       │   ├── telas/         ← acampamento, estudo, quiz, chefe, painel
│       │   ├── api.ts         ← cliente HTTP tipado
│       │   └── main.ts
│       └── public/sprites/
├── packages/
│   └── regras/                ← TS puro, sem I/O: XP, aprovação, sorteio,
│                                 agenda de revisão, skills, chefes
├── ferramentas/
│   ├── importar-conteudo.ts
│   ├── validar-conteudo.ts
│   └── gerar-questoes.ts      ← Claude API → rascunhos para revisão
└── data/                      ← fora do git: estudos.db, evidencias/
```

## Camadas e regra de dependência
`rotas → servicos → (regras, repository)`. `regras` não importa nada de I/O.
`repository` é o único lugar com SQL. O navegador usa `regras` **só para
mostrar** (ex.: "faltam 120 XP"); quem decide é sempre o servidor (D004).

## Fluxos principais

### Lutar contra um inimigo
1. `POST /sessoes` abre uma sessão de estudo para o tópico.
2. A cada 30 s, `POST /sessoes/:id/pulso` — o servidor soma o intervalo só se
   o pulso anterior foi há ≤ 90 s e a aba estava visível.
3. Ao atingir o tempo mínimo, o botão **Atacar** libera.
4. `POST /combates` → servidor sorteia 3 questões do pool, evitando as vistas
   nas últimas tentativas, e devolve **sem gabarito**.
5. `POST /combates/:id/respostas` uma a uma → correção + explicação.
6. Ao final: vitória (grava, agenda fantasmas, dá XP) ou derrota (expulsa,
   exige recuperação).

### Chefe
Igual ao combate, mas com uma **variante** que altera o roteiro da prova
(vidas, fases, cronômetro, questão-surpresa). A variante é um objeto de
`packages/regras/chefes/` que implementa:

```ts
interface VarianteChefe {
  id: string;
  planejar(ctx: ContextoChefe): PlanoDeProva;        // blocos, tempo, regras
  aoResponder(estado: EstadoProva, r: Resposta): EstadoProva; // pode criar questões
  resultado(estado: EstadoProva): 'vitoria' | 'derrota' | 'continua';
}
```

### Importar conteúdo
`ferramentas/importar-conteudo.ts` lê `conteudo/`, valida com o mesmo schema
de `validar-conteudo.ts`, e faz *upsert* por ID estável. Nada é apagado:
o que sumiu do YAML vira `aposentado`.
