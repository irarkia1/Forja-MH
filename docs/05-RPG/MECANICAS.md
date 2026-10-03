# Mecânicas

## Controles
| Ação | Teclado | Mouse/toque |
|---|---|---|
| Andar na linha | ← → | Clicar no ponto de destino |
| Escolher bifurcação | ↑ ↓ (no ponto de bifurcação) | Clicar no ramo |
| Entrar (inimigo, fase, chefe) | Enter | Clicar no alvo |
| Voltar ao acampamento | Esc | Botão "Acampamento" |
| Responder | 1–5 ou A–E, Enter confirma | Clique |

O boneco anda sozinho até o ponto escolhido (animação curta); não existe
colisão, pulo ou tempo de reação.

## Vida, dano e defesa (D010)
O boneco tem **Vida** e **Defesa**. Cada questão errada é um golpe do inimigo:

```
dano = dado(0–6) × poder_do_inimigo × (1 − defesa)
```

- **Dado**: 0 a 6, rolado **no servidor** e mostrado na tela (animação do dado).
- **Poder do inimigo**: cresce com a fase, para a luta continuar justa enquanto
  sua vida sobe (fórmula em BALANCEAMENTO.md). Na fase "do seu nível", um golpe
  equivale a um dado contra 6 de vida.
- **Defesa**: reduz o dano em percentual. Ex.: dado 5, poder 1, defesa 30% →
  5 × 0,7 = **3,5 de dano**. Teto: 80%.
- **Vida** chega a 0 → **derrota na hora**; as questões restantes nem aparecem.
- A vida **enche no começo de cada combate e de cada chefe**.
- **Regeneração** (skill) cura um pouco a cada acerto, sem passar da vida máxima.
- Dano e vida são mostrados com uma casa decimal.

### Piso de conhecimento
A vida nunca substitui saber:
- **Combate**: 0 de 3 é derrota, mesmo com vida sobrando.
- **Chefe**: abaixo de **60% de acerto** é derrota, mesmo vivo (algumas
  variantes mudam o piso).

### Preparo: estudar a mais protege
Cada 10% de estudo **além** do tempo mínimo dá **+5% de defesa** contra
aquele inimigo (máx. +20%), respeitando o teto total de 80%. Quem estudou
mais apanha menos.

## Encontro com um inimigo
1. Ao chegar, o inimigo aparece com o **nome do tema**, o tempo mínimo, o
   **poder** e uma barra de "guarda" = tempo restante de estudo.
2. Opções: **Reconhecimento** (pré-teste), **Estudar**, **Fugir**.
3. **Estudar** abre o roteiro e o cronômetro. A guarda cai conforme o tempo
   válido acumula; dá para parar e voltar outro dia.
4. Guarda em zero → escreva a nota pessoal (3–5 frases) → **Atacar** libera.
5. **Atacar** = 3 questões. Acerto: você golpeia (animação). Erro: o inimigo
   rola o dado e você leva dano.
   - Sobreviveu às 3 com pelo menos 1 acerto → **vitória**
   - 3/3 → **golpe crítico** (+50% de XP)
   - Vida zerou, ou 0/3 → **derrota**: expulso da fase; o inimigo recupera 20%
     da guarda (estudo de recuperação). Os inimigos já vencidos continuam
     vencidos (D007).
6. **Inimigo de elite**: antes de atacar, anexe a evidência do laboratório.
   Elites têm +25% de poder.

Na fase do seu nível, sem defesa, a chance de **cair** é: 1 erro → 14%,
2 erros → 57%, 3 erros → derrota certa. Com 30% de defesa: 1 erro → 0%,
2 erros → 21%.

## Inimigos que aprendem (D015)
Cada derrota deixa aquele inimigo ou chefe **mais forte** (+10% de poder e de
perfuração) e faz ele **mirar os temas em que você mais erra**. Vencer zera.
Regras completas em [ADAPTACAO.md](ADAPTACAO.md).

## Revanche: lutar de novo contra quem já venceu (D011)
Todo inimigo e todo chefe vencido pode ser enfrentado de novo, e **sempre dá
XP**:

| Revanche | Precisa estudar? | XP | Limite |
|---|---|---|---|
| Inimigo | Não, vai direto ao combate | 25% da vitória original | 1 por dia por inimigo |
| Chefe | Não | 50% do chefe | 1 a cada 7 dias por chefe; nova variante sorteada |

Perder uma revanche não muda nada; o inimigo continua vencido. As questões
saem das **menos vistas** do pool. A revanche é revisão extra, mas não conta
para a agenda dos fantasmas nem para "Consolidado".

## Fuga
Sair de um inimigo no meio do estudo não tem penalidade: o tempo fica salvo.
Fugir **no meio do combate** conta como derrota.

## Chefe
Liberado quando todos os inimigos da fase estão vencidos. Ao entrar:
1. A variante é sorteada e revelada (nome, arte, regras, dado).
2. **Vida de batalha** = sua Vida × N ÷ 7 (N = questões da prova): a luta é
   longa, então a barra é proporcional.
3. Vitória = **chegar vivo à última questão** e atingir o piso.
4. Derrota → cooldown + feridas (PROVAS-FINAIS.md).

## Fantasmas
Inimigos vencidos reaparecem como fantasmas na data da revisão. **Fantasma
não dá dano nem aceita skill**: é a prova limpa de que o conteúdo ficou, com
a regra fixa da agenda (ESTUDO-E-REVISAO.md).

## Energia
Recurso para usar skills ativas.
| Ganha energia | Quanto |
|---|---:|
| Fantasma vencido no dia | +1 |
| Evidência de laboratório aprovada | +3 |
| Semana com a meta de horas cumprida | +5 |
| Nota pessoal escrita | +0,5 |
Energia máxima: 10 (+2 por nível da skill Vigor).
