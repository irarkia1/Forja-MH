# Changelog

Formato: data · o que mudou · onde.

## 2026-10-05 — Painel de acompanhamento
- 📊 Painel: horas totais, semana, ritmo (8 semanas), previsão de término,
  sequência, horas por semana (gráfico com meta e tooltip), progresso por ato,
  horas por trilha, qualidade (faixas do BALANCEAMENTO), pontos fracos e horas
  reais × planejadas. Cor dos gráficos validada nos dois temas.
- "Horas na semana" passa a ser a semana de segunda a domingo em todo lugar.

## 2026-10-03 — F2: 20 variantes de chefe
- 18 jogáveis: Guardião, Hidra, Golem, Traiçoeiro, Lich, Cronomante, Enxame,
  Colosso, Arquivista, Fúria, Purista, Feynman, Mímico, Bancada, Dragão,
  Vampiro, Gêmeos, Oráculo. Espelho e Engenheiro aguardam conteúdo (D023).
- Intro do chefe com regra e blocos; cronômetro; confiança do Oráculo;
  rubrica do Feynman; duas barras dos Gêmeos; avisos de troca de bloco.
- Skills Olho do Batedor, Fôlego e Sangue-Frio. Admin: forçar variante.
- 70 testes.

## 2026-10-03 — No ar
- Publicado em https://planejamento.meh-eng.com/forja/ (D022): Node 22 no VPS,
  serviço systemd `forja`, backup diário, `implantacao/atualizar.sh`.

## 2026-10-03 — Skills e ajustes do teste
- Botão ✨ Skills no topo e árvore: Guerreiro, Estudioso, Corte e Escudo (D021).
- Energia ⚡ no topo; Sorte, Esquiva, Regeneração e Escudo aparecem na luta.
- Estudar dá 1 XP por minuto (Foco Profundo dá bônus em sessões de 50 min+).
- Barra do inimigo só cai quando você acerta.
- Chefe descansa só a partir da 2ª derrota seguida (D020). 42 testes.

## 2026-10-03 — Modo admin
- Conta `teste` com 🔧 Admin: horas, vencer, viagem no tempo, XP, adaptação,
  mostrar resposta, zerar (D019). 39 testes.

## 2026-10-03 — Conteúdo do M0.4
- M0.4 Circuitos DC: 9 roteiros com exemplos resolvidos e gabarito, 126 questões
  (67 numéricas conferidas por script). Ordem didática D018.

## 2026-10-03 — F4 entregue
- Fantasmas (revisão espaçada 1/3/7/21/60) no mapa, no acampamento e no topo.
- Feridas do chefe; consolidado e dominado; bloqueio com mais de 30 pendentes.
- Cronômetro: guarda acompanha o relógio; aviso claro no modo de teste.
- D017: ordem M0.4 → M0.7 → M0.6 → M0.2; missões secundárias "da mina ao componente".
- 37 testes.

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
