# Balanceamento

Todos os números ficam em `packages/regras/config.ts`. Mudou um número, muda
lá e no teste.

## XP
| Ação | XP |
|---|---:|
| Minuto válido de estudo | 1 |
| Inimigo vencido (1ª vez) | 100 + 10 × horas do tópico |
| Golpe crítico (3/3) | × 1,5 no valor acima |
| **Revanche contra inimigo vencido** | 25% do valor acima (1 por dia por inimigo) |
| Nota pessoal escrita | 10 |
| Evidência de laboratório | 100 |
| Fantasma vencido no dia | 20 (atrasado: 10) |
| Chefe vencido (1ª vez) | 10 × questões × fração de acerto |
| **Revanche contra chefe vencido** | 50% do valor acima (1 a cada 7 dias) |
| Projeto integrador | 1.000 |

### Por que a revanche vale menos
Uma revanche de inimigo leva ~3 minutos. Com XP cheio, ~300 XP em 3 minutos
seria 100 vezes mais do que estudar (1 XP/min): o jogo passaria a premiar
repetir quiz em vez de estudar, e o pool de questões seria decorado. Com 25% e
o limite diário, a revanche continua valendo a pena (revisão extra é
aprendizado) sem virar fazenda de XP.

## Níveis: curva por faixas de horas (D014)
Ideia do Matheus: subir de nível **não é fácil**. O custo é organizado em
**faixas de 2.000 horas válidas**:

1. Dentro de uma faixa, **cada nível custa o dobro do anterior**. O começo da
   faixa é rápido; depois o jogo te segura.
2. Cada faixa tem um **custo base** fixo, que dobra de uma faixa para a
   seguinte: 100, 200, 400, 800 e 1.600 XP.
3. Ao bater a meta de horas (**Marco**: 2.000, 4.000, 6.000, 8.000 h), o nível
   em que você estava preso **sobe na hora**, a barra zera e o custo volta para
   a base da nova faixa: você volta a subir rápido por um tempo.
4. A faixa conta por **horas válidas de estudo**, não por XP: revanche e
   bônus nunca antecipam um Marco.

```
custo do k-ésimo nível dentro da faixa f = 100 × 2^f × 2^(k−1)    (f = 0..4)
```

| Faixa | Horas | Base | 1º nível | 5º nível | 10º nível |
|---|---|---:|---:|---:|---:|
| I | 0–2.000 | 100 | 100 | 1.600 | 51.200 |
| II | 2.000–4.000 | 200 | 200 | 3.200 | 102.400 |
| III | 4.000–6.000 | 400 | 400 | 6.400 | — |
| IV | 6.000–8.000 | 800 | 800 | 12.800 | — |
| V | 8.000–10.000 | 1.600 | 1.600 | 25.600 | — |

### Nível ao longo da jornada (simulado, ≈ 85 XP por hora)
| Horas | Nível | Comentário |
|---:|---:|---|
| 10 | 4 | começo rápido |
| 100 | 7 | |
| 500 | 9 | começou a segurar |
| 1.000 | 10 | o 11º nível leva ~600 h |
| 1.999 | 11 | |
| **2.000 (Marco)** | 12 | sobe na hora |
| 2.050 | 16 | rápido de novo |
| 4.000 → 4.050 | 22 → 25 | Marco + arrancada |
| 6.000 | 30 | |
| 8.000 | 38 | |
| 10.000 | **45** | |

Vida no fim da jornada: 6 + 44 = **50** (+ Vitalidade).
O XP total continua aparecendo no painel; o que zera no Marco é só a barra
do nível.

## Vida, dano e poder do inimigo
```
vida            = 6 + (nível − 1) + Vitalidade
defesa          = min(80%, 2% × Defesa + Preparo)
esquiva         = min(50%, 1% × Esquiva)         [chance de dano 0]
cura por acerto = 0,05 × Regeneração × poder
dano por erro   = dado(0–6) × poder × (1 − defesa)     [após Esquiva/Sorte]
nível_ref(fase) = nivel_esperado(horas_acumuladas_no_início_da_fase)   [curva acima]
vida_ref(fase)  = 6 + (nível_ref − 1)
poder(fase)     = vida_ref ÷ 6 × (1 + 0,1 × adaptação)   (elite: × 1,25)
vida_batalha    = vida × N ÷ 7                          (só no chefe)
```
**Ideia:** na fase do seu nível, sem defesa, toda luta parece a primeira:
um dado contra 6 de vida. Você fica mais forte com **Defesa** (skill + Preparo)
e **subindo de nível além do esperado** (revanches, críticos, fantasmas em dia).
Perder deixa o inimigo mais forte: ver [ADAPTACAO.md](ADAPTACAO.md).

| Fase | Horas acumuladas no início | Nível ref. | Vida ref. | Poder | Dano médio por erro (sem defesa) |
|---|---:|---:|---:|---:|---:|
| M0.1 | 0 | 1 | 6 | 1,0 | 3,0 |
| M0.4 | 380 | 9 | 14 | 2,3 | 7,0 |
| M1.4 | 1.300 | 11 | 16 | 2,7 | 8,0 |
| M2.5 | 3.120 | 20 | 25 | 4,2 | 12,5 |
| M3.10 | 5.750 | 30 | 35 | 5,8 | 17,5 |
| M7.7 | 9.870 | 45 | 50 | 8,3 | 25 |

### Probabilidades (simuladas, fase do seu nível)
**Combate (3 questões):** chance de cair

| Erros | Defesa 0% | 20% | 30% | 40% |
|---:|---:|---:|---:|---:|
| 1 | 14% | 0% | 0% | 0% |
| 2 | 57% | 31% | 21% | 12% |
| 3 | derrota pelo piso | | | |

**Chefe:** chance de vitória por taxa de acerto

| Acerto | N=13, def 0% | N=13, def 30% | N=47, def 0% | N=47, def 30% | N=83, def 0% | N=83, def 30% |
|---:|---:|---:|---:|---:|---:|---:|
| 60% | 29% | 52% | 11% | 55% | 5% | 56% |
| 65% | 41% | 63% | 25% | 74% | 18% | 80% |
| 70% | 52% | 74% | 46% | 89% | 43% | 95% |
| 75% | 65% | 83% | 69% | 97% | 74% | 99% |
| 80% | 77% | 91% | 88% | 99% | 94% | 100% |

Sem defesa, o chefe pede cerca de 75% de acerto; com 30% de defesa, cerca de
65%. O piso de 60% vale sempre.

## Custo das skills e pontos
- **Pontos**: 2 por nível do personagem, e só isso. Nível 45 ≈ **88 pontos**
  na jornada inteira.
- **Guerreiro** (custo fixo): Vitalidade 50 × 1, Defesa 40 × 1, Esquiva
  50 × 1, Sorte 3 × 3, Regeneração 20 × 1 = **169 pontos** para maximizar.
- **Estudioso, Estrategista, Explorador**: nível `k` custa `k`; tudo no máximo
  = 66 + 25 + 11 = **102**.
- **Total para ter tudo: 271.** Com ~88, é preciso **escolher bem uma build**:
  dá para ter uma build forte em um ramo, nunca em todos.

### Efeito das builds (simulado, fase do seu nível)
| Build | Pontos | Quando chega (só Guerreiro) | Cair com 2 erros | Chefe N=47 a 60%* |
|---|---:|---|---:|---:|
| Nenhuma | 0 | início | 57% | 12% |
| Média: Def 30%, Esq 15%, Reg 10 | 40 | nível 21 ≈ 4.000 h | 13% | 96% |
| Forte: Def 50%, Esq 30%, Reg 20 | 75 | nível 38 ≈ 8.000 h | 1% | 100% |
| Máxima: Def 80%, Esq 50%, Reg 20 | 110 | inalcançável (~88 pontos na jornada) | 0% | 100% |

\* Chance de chegar vivo ao fim, sem adaptação; o piso de 60% continua
valendo. A curva por faixas (D014) deixa o A0 e o A1 com builds fracas, e a
adaptação (D015) devolve a tensão às builds fortes: com adaptação 5, a
build média a 60% cai de 96% para 33% (ADAPTACAO.md). P10 resolvida.

## Metas de dificuldade
Medidas no painel; revisadas no fim de cada ato.

| Métrica | Faixa saudável | Se sair da faixa |
|---|---|---|
| Vitória em combate na 1ª tentativa | 70–90% | < 70%: subir vida base ou baixar poder; > 90%: o contrário |
| Vitória em chefe na 1ª tentativa | 50–80% | Ajustar o divisor da vida de batalha (7) |
| Chefes que chegam a adaptação 5 | ≤ 5% | Acima: espiral de derrota → reforçar o Treino |
| Horas até cada Marco × previsto | ±15% | Ajustar a base das faixas |
| Fantasmas vencidos | 75–90% | < 75%: estudo raso → mais laboratório/elaboração |
| Questões com ajuda em chefes | ≤ 15% | Acima: energia fácil demais |
| Derrotas "por azar" (≥ 2/3 e caiu) | ≤ 15% dos combates | Acima: dado pesa demais; subir vida base |
| Horas reais ÷ planejadas do módulo | 0,8–1,3 | Recalibrar horas no YAML |
