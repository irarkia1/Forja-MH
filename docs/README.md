# Forja M&H — a jornada de 10 mil horas para engenheiro de IoT

Dois projetos num só:

1. **Currículo** — uma grade de 10.000 horas que vai do primeiro LED piscando
   até fabricar um sensor do zero e entender como nasce um processador.
2. **Sistema** — um mini RPG web (localhost primeiro, depois `meh-eng.com/estudos`)
   onde cada tema é um inimigo, cada módulo é uma fase e cada prova é um chefe.
   O jogo mede o estudo de verdade: tempo mínimo, provas, revisões espaçadas.

> Comece pelo [CEREBRO.md](CEREBRO.md) — é o resumo de tudo, em uma página.

## Mapa dos documentos

| Pasta | Para que serve |
|---|---|
| [00-GESTAO](00-GESTAO/) | Objetivo, escopo, roadmap, decisões, pendências, changelog |
| [01-PLANEJAMENTO](01-PLANEJAMENTO/) | Plano mestre, fases do sistema, cronograma de estudo, critérios de conclusão |
| [02-ARQUITETURA](02-ARQUITETURA/) | Arquitetura, tecnologias, banco, API, segurança, integrações |
| [03-CURRICULO](03-CURRICULO/) | Grade curricular, trilhas, pré-requisitos, as 10 mil horas, laboratórios e bancada, domínio |
| [04-SISTEMA-DE-ENSINO](04-SISTEMA-DE-ENSINO/) | Metodologia, estudo e revisão, avaliações, provas finais, banco de questões |
| [05-RPG](05-RPG/) | Conceito, mecânicas, personagem e skills, mapa, inimigos, chefes, recompensas, balanceamento |
| [06-INTERFACE](06-INTERFACE/) | Experiência, telas, identidade visual |
| [07-QUALIDADE](07-QUALIDADE/) | Testes, validação do conteúdo, critérios de aceitação |
| [08-PESQUISA](08-PESQUISA/) | Consultas, fontes, referências técnicas, hipóteses |

## O que foi acrescentado à estrutura original

- `02-ARQUITETURA/API.md` — contrato entre o jogo e o servidor.
- `03-CURRICULO/LABORATORIOS-E-BANCADA.md` — equipamentos por ato, com custo
  estimado. Sem bancada não existe engenheiro de hardware; precisava de dono.
- Decisões ficam em `00-GESTAO/DECISOES.md` no formato curto de ADR
  (contexto, decisão, alternativas, consequências), igual ao projeto `planejamento`.
