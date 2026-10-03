# Critérios de domínio

**Vencer** um inimigo prova que você sabia **naquele dia**. **Dominar** prova
que o conhecimento ficou. O jogo separa os dois.

## Estados de um tópico

```
bloqueado → disponível → em estudo → DERROTADO → CONSOLIDADO → DOMINADO
                             ▲            │
                             └── derrota ─┘ (recuperação: +20% do mínimo)
```

| Estado | Como chega | Ícone |
|---|---|---|
| Bloqueado | Pré-requisito pendente | cadeado |
| Disponível | Pré-requisitos ok | inimigo parado |
| Em estudo | Tempo estudado > 0 | inimigo em guarda |
| **Derrotado** | Tempo mínimo + combate vencido | caveira |
| **Consolidado** | Fantasmas de 1, 3, 7 e 21 dias vencidos, **sem ajuda** | estrela prata |
| **Dominado** | Fantasma de 60 dias sem ajuda **e** usado num laboratório ou projeto posterior | estrela ouro |

Errar um fantasma não "desderrota" o tópico: ele volta para a etapa 1 da
agenda de revisão (ver ESTUDO-E-REVISAO.md).

## Módulo
| Nível | Critério |
|---|---|
| Vencido | Chefe derrotado |
| Consolidado | Vencido + ≥ 80% dos tópicos consolidados |
| Dominado | Consolidado + ≥ 50% dos tópicos dominados + revisão cumulativa do módulo após 6 meses ≥ 80% |

## Ato
| Nível | Critério |
|---|---|
| Concluído | Todos os módulos vencidos + projeto integrador com evidência pública |
| Dominado | Todos os módulos consolidados |

## O que o painel mostra
Barra dupla por módulo: **vencido** (cheia) × **consolidado/dominado**
(preenchimento). Se a segunda barra ficar muito atrás da primeira, o jogo
sugere fazer revisões antes de abrir novas fases.
