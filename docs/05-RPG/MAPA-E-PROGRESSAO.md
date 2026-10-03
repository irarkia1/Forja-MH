# Mapa e progressão

## Duas escalas
1. **Mapa do mundo** — uma região por ato (8 regiões). A linha liga as
   **fases** (módulos). Bifurcações seguem os pré-requisitos.
2. **Linha da fase** — dentro de um módulo, a linha liga os **inimigos**
   (tópicos) até o **chefe** no fim.

## Mapa do mundo (exemplo do A0)

```
                     ┌── M0.2 Matemática ── M0.3 Física
                     │            │
  ⛺ ── M0.1 Termos ──┼── M0.4 Circuitos DC ──┴── M0.5 Circuitos AC ──▶ A1
                     │
                     ├── M0.6 C/C++
                     │
                     └── M0.7 Ferramentas
```
Regiões visuais: A0 Vila da Forja · A1 Floresta dos Microcontroladores ·
A2 Cordilheira das Placas · A3 Cidade SMT · A4 Porto dos Produtos ·
A5 Fábrica Fumegante · A6 Torres de Silício · A7 Abismo dos Sensores.

## Linha da fase (exemplo do M0.4)

```
⛺ ─ 👾 Ohm ─ 👾 Kirchhoff ─ 👾 Série/Paralelo ─┬─ 👾 Nodal/Malhas ─ 👾 Thévenin ─┐
                                               └─ 🛡 Multímetro ⚒ ─ 🛡 ESD ⚒ ───┤
                                                  👾 C/L em DC ─ 👾 RC/RL ───────┴─ 💀 CHEFE
```
Os ramos se juntam antes do chefe. A ordem dentro dos ramos é livre quando o
YAML não define dependência.

## Estados visuais
| Estado | Fase | Inimigo |
|---|---|---|
| Bloqueado | cinza com cadeado | silhueta |
| Disponível | colorido, pulsando | parado |
| Em andamento | bandeira | barra de vida parcial |
| Vencido | troféu | caveira (some depois de 3 dias, vira grama) |
| Fantasma pendente | — | fantasma translúcido brilhando |

## Progressão
- **Abrir fase**: todos os pré-requisitos vencidos.
- **Abrir ato**: pelo menos um módulo do ato disponível (não exige terminar o
  ato anterior inteiro — ver o atalho do M6.4).
- **Posição salva**: o boneco começa onde parou.
- **Viagem rápida**: do acampamento dá para ir direto a qualquer fase já
  visitada.
