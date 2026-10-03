# Changelog

Formato: data · o que mudou · onde.

## 2026-10-01 — F1 entregue
- Jogo jogável: login, mapa dos 8 atos, linha da fase com bifurcações,
  estudo com cronômetro (pulso, check-in), nota pessoal, evidência de elite,
  combate com vida/dado/defesa, chefe O Guardião, revanche, adaptação,
  curva por faixas.
- Conteúdo: grade inteira em YAML; M0.1 com 7 roteiros e 98 questões.
- 32 testes (regras + API). D016: `node:sqlite` e scrypt.

## 2026-10-01 (madrugada)
- **Curva de XP por faixas de 2.000 h**: nível dobra de custo a cada up; Marco
  zera a barra (D014). Nível ~45 e ~88 pontos de skill na jornada.
- **Inimigos que aprendem**: fraqueza por tópico/objetivo, adaptação 0–5 com
  poder, perfuração e questões nos pontos fracos (D015, ADAPTACAO.md).
- P10 resolvida. Poder das fases recalculado com a nova curva.

## 2026-10-01 (noite)
- Revanche 25%/50% confirmada (D011).
- Skills do Guerreiro com os valores do Matheus; 2 pontos de skill por nível,
  sem pontos de chefe (D013). Teto de defesa 80%, esquiva 50%.
- Regeneração cura a cada acerto, em combate e chefe.
- Nova pendência P10: tensão do combate com builds fortes.

## 2026-10-01 (tarde)
- P1–P4 resolvidas: 20 h/semana, derrota mantém vencidos, nome **Forja M&H**.
- **Combate por vida, dado (0–6) e defesa** com piso de conhecimento (D010).
- Revanche contra inimigo/chefe vencido dá XP reduzido (D011).
- Novo ramo de skills **Guerreiro**: Vitalidade, Defesa, Esquiva, Sorte,
  Regeneração. Escudo e Segunda Chance passam a agir sobre o dano.
- Chefes: vitória = sobreviver + piso; cada variante ganha seu dado.
- Balanceamento simulado e documentado (BALANCEAMENTO.md).

## 2026-10-01
- Planejamento inicial completo: 8 atos, 68 módulos, 10.000 h.
- Mecânicas do RPG: mapa em linha, inimigos, 20 variantes de chefe, skills
  com energia, fantasmas de revisão.
- Arquitetura: TypeScript, Fastify, SQLite, Canvas 2D, conteúdo em YAML.
- Decisões D001–D009 registradas; pendências P1–P9 abertas.
