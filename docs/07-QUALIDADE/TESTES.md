# Testes

## Pirâmide
| Camada | Ferramenta | O que cobre | Meta |
|---|---|---|---|
| Unidade — `packages/regras` | Vitest | XP, níveis, aprovação, tempo mínimo, agenda de revisão, sorteio de chefe, as 20 variantes, skills | ≥ 95% de linhas; é o coração |
| Propriedade | fast-check | Invariantes (abaixo) com entradas aleatórias | Todos os invariantes |
| Integração — `apps/api` | Vitest + banco SQLite em memória | Rotas, cronômetro, provas, retomada | Todas as rotas |
| Conteúdo | `validar-conteudo.ts` | Schema, IDs, ciclos, quantidades mínimas | Roda no CI e antes de importar |
| Ponta a ponta | Playwright | Login → estudar → atacar → vencer; chefe com retomada | Fluxos principais |

## Invariantes (testes de propriedade)
1. Nenhuma combinação de skills reduz `minimo_seg` de um tópico.
2. Nenhuma resposta da API antes de responder contém `gabarito` ou `explicacao`.
3. Nenhuma prova de chefe passa de 100 questões.
4. Ajuda em chefe ≤ 20% das questões.
5. A variante sorteada nunca está entre as 3 últimas.
6. `segundos_validos` ≤ (último pulso − primeiro pulso) da sessão.
7. Fantasma nunca aceita skill.
8. Derrota nunca muda o estado de um tópico já derrotado para menos que "derrotado".
9. 0/3 no combate é sempre derrota; chefe abaixo do piso é sempre derrota,
   para qualquer vida, defesa e skill.
10. Dano nunca é negativo; defesa total nunca passa de 80%; esquiva nunca
    passa de 50%; regeneração nunca leva a vida acima da máxima.
11. Todo dado vem do servidor e está gravado em `golpe`.
12. Revanche nunca dá ponto de skill e respeita o limite (1/dia inimigo, 1/7 dias chefe).
13. Adaptação fica entre 0 e 5; vitória zera; Treino reduz 1.
14. Chefe sempre cobre todos os tópicos, mesmo com adaptação 5.
15. Marco de horas só é cruzado por horas válidas (revanche/bônus nunca cruzam).
16. Custo do nível dentro da faixa dobra a cada nível; no Marco, a barra zera
    e o nível preso sobe uma vez.

## Simulação de balanceamento
`npm run simular` roda Monte Carlo (100 mil lutas) com as fórmulas de
`regras` e imprime as tabelas de BALANCEAMENTO.md. Se mudar uma constante, a
tabela do documento é regerada pelo mesmo script.

## Cronômetro (casos que precisam de teste)
- Pulsos a cada 30 s → conta tudo.
- Lacuna de 5 min → a lacuna não conta.
- Aba oculta → não conta.
- Check-in perdido → descarta desde o último check-in.
- Duas sessões → a primeira é encerrada.
- Relógio do cliente adiantado/atrasado → irrelevante (só o do servidor vale).

## Antes de cada publicação
`npm run verificar` = `tsc --noEmit` + ESLint + Vitest + validar-conteudo.
