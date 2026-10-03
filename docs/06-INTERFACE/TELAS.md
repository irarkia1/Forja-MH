# Telas

| # | Tela | Função |
|---:|---|---|
| 1 | Login | Entrar |
| 2 | **Acampamento** | Hub: continuar, fantasmas do dia, atalhos |
| 3 | **Mapa do mundo** | Linha de fases com bifurcações |
| 4 | **Linha da fase** | Inimigos até o chefe |
| 5 | **Encontro / Estudo** | Roteiro + cronômetro + nota pessoal |
| 6 | **Combate** | Quiz de 3 questões |
| 7 | **Chefe** | Apresentação da variante + prova longa |
| 8 | Resultado | Vitória/derrota, XP, feridas |
| 9 | **Árvore de skills** | Evoluir skills, ver energia |
| 10 | **Painel de acompanhamento** | Horas, ritmo, previsão, acertos |
| 11 | Fantasmas | Lista das revisões pendentes |
| 12 | Diário de laboratório | Evidências, vira portfólio |
| 13 | Configurações | Meta semanal, blocos, modo hardcore, fuso |

## 2 — Acampamento
```
┌──────────────────────────────────────────────────────────────┐
│ ⛺ FORJA M&H              Nv 17 Aprendiz   XP ▓▓▓▓▓░░ 68%     │
│ ❤ Vida 22 · 🛡 Defesa 15%  ⚡ Energia 7/10                     │
├──────────────────────────────────────────────────────────────┤
│  [ ▶ CONTINUAR — M0.4 · Thévenin (faltam 3h10) ]              │
│                                                              │
│  👻 Fantasmas hoje: 3 (≈ 8 min)        [Enfrentar]           │
│  📊 Semana: 14h20 / 20h  ▓▓▓▓▓▓▓░░░                           │
│  🔮 Previsão de término: mai/2036 (ritmo de 8 semanas)        │
│                                                              │
│  [Mapa]  [Skills •2]  [Painel]  [Diário]  [Configurações]    │
└──────────────────────────────────────────────────────────────┘
```

## 4 — Linha da fase
```
┌──────────────────────────────────────────────────────────────┐
│ M0.4 Circuitos DC · "Religue o gerador da vila"   5/9 ☠      │
│                                                              │
│  ☠──☠──☠──┬──☠──🧍──👾 Thévenin ──┐                          │
│           └──🛡⚒ Multímetro──🛡⚒ ESD┤                         │
│              👾 C/L em DC──👾 RC/RL ┴──── 💀 CHEFE (?)        │
│                                                              │
│  ← → andar   ↑ ↓ ramo   Enter entrar   Esc acampamento       │
└──────────────────────────────────────────────────────────────┘
```

## 5 — Encontro / Estudo
```
┌───────────────────────────────┬──────────────────────────────┐
│ 👾 TEOREMA DE THÉVENIN        │ ⏱ 01:12:40 válidos            │
│ Vida ▓▓▓▓▓▓▓░░░ faltam 3h10   │ mínimo 7h45 · bloco 32/50 min │
├───────────────────────────────┤ [⏸ Pausar] [Fugir]            │
│ Ao final você consegue:       ├──────────────────────────────┤
│ • Achar o equivalente de...   │ Nota pessoal (libera ataque)  │
│ Estude:                       │ ┌──────────────────────────┐ │
│ • Livro X cap. 3.4            │ │                          │ │
│ • Vídeo Y (25 min)            │ └──────────────────────────┘ │
│ Pratique: lista Z, 1–12       │ [⚔ ATACAR] (bloqueado)        │
└───────────────────────────────┴──────────────────────────────┘
```

## 6 — Combate
```
┌──────────────────────────────────────────────────────────────┐
│ ⚔ THÉVENIN  poder 3,7    Questão 2/3   ⚡7   [🔍 Lupa 1⚡]     │
│ ❤ Você ▓▓▓▓▓▓░░░░ 11,4/22   🛡 25% (15 skill + 10 preparo)     │
├──────────────────────────────────────────────────────────────┤
│ Um circuito tem Vth = 9 V e Rth = 3 kΩ. Qual a corrente numa │
│ carga de 6 kΩ?                                                │
│                                                              │
│  [ 1 ] mA   ________     unidade: mA                         │
│                                         [Confirmar ⏎]        │
└──────────────────────────────────────────────────────────────┘
→ após responder: ✔ golpe no inimigo, ou ✘ 🎲 dado rola (ex.: 4 × 3,7 × 0,75 = 11,1 de dano);
  depois explicação, fonte, [Contestar], [Próxima]
```

## 7 — Chefe (apresentação)
```
┌──────────────────────────────────────────────────────────────┐
│            🐉 HIDRA DE DUAS CABEÇAS                           │
│         Guardiã dos Circuitos DC (M0.4)                       │
│  "Corte uma cabeça e a outra vem com perguntas novas."        │
│                                                              │
│  Cabeça 1: 28 questões (dado D) · Cabeça 2: 19 inéditas (D+1)│
│  ❤ Vida de batalha 148 · não recupera entre cabeças           │
│  ★★ Adaptada: poder +20% · perfuração 20%                     │
│  "Lembro de você: 7 erros em Transitórios RC."               │
│  Vencer: chegar vivo + ≥ 60% em cada cabeça · Ajuda máx.: 9   │
│                                                              │
│            [ Enfrentar ]     [ Voltar ]                      │
└──────────────────────────────────────────────────────────────┘
```

## 10 — Painel de acompanhamento
Blocos (de cima para baixo):
1. **Números grandes**: horas válidas totais / 10.000 · esta semana / meta ·
   sequência de dias · previsão de término.
2. **Horas por semana** (barras, 26 semanas) com linha da meta e média móvel.
3. **Progresso por ato** (barra dupla: vencido × consolidado).
4. **Atributos por trilha** (barras horizontais; radar é bonito mas engana).
5. **Qualidade**: acerto em combates, chefes, fantasmas; % de ajuda; fantasmas
   atrasados.
6. **Pontos fracos**: os 10 objetivos com maior fraqueza, com botão "Treinar".
7. **Faixa de XP**: faixa atual, horas até o próximo Marco, níveis previstos.
8. **Horas reais × planejadas** por módulo concluído.
