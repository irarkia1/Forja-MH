# CÉREBRO — Forja M&H em uma página

Leia isto antes de mexer em qualquer coisa (vale para gente e para IA).

## O que é
Um RPG de estudo para o Matheus virar engenheiro de IoT completo em
**10.000 horas**: firmware → hardware → SMT → produto → manufatura →
semicondutores → sensores feitos do zero.

## Vocabulário do jogo

| Termo | No jogo | Na vida real |
|---|---|---|
| **Ato** | Região do mapa (8 atos, A0–A7) | Nível do currículo |
| **Fase** | Um ponto na linha do mapa | Um **módulo** (68 no total) |
| **Inimigo** | Monstro com o nome do tema | Um **tópico**: tempo mínimo + combate de 3 questões |
| **Inimigo de elite** | Monstro com armadura | Tópico prático: exige **evidência de laboratório** |
| **Chefe** | Fim da fase, 1 de 20 variantes sorteadas | **Prova do módulo**, 10 a 100 questões |
| **Acampamento** | Fora das missões | Skills, painel de acompanhamento, revisões |
| **Fantasma** | Inimigo derrotado que volta | **Revisão espaçada** (1, 3, 7, 21, 60 dias) |
| **Energia** | Recurso para usar skills | Recarrega fazendo revisões e laboratórios |
| **Vida / Dado / Defesa** | Erro = golpe: dado 0–6 × poder da fase × (1 − defesa); vida zerou = derrota | Vida sobe 1 por nível; defesa vem de skill e de estudar além do mínimo |
| **Revanche** | Lutar de novo contra quem já venceu | Revisão extra; 25% do XP (chefe: 50%) |
| **Adaptação** | Inimigo que te venceu volta mais forte e mira seus pontos fracos | Prática deliberada nos temas que você mais erra |
| **Faixa / Marco** | Nível custa o dobro a cada up; a cada 2.000 h a barra zera e volta a subir rápido | Recompensa as metas de horas reais |

## Regras invioláveis
1. **Nenhuma skill reduz o tempo mínimo de estudo.**
2. **Nenhuma skill mostra a resposta.** Ajudas apontam caminhos, nunca o destino.
3. **Toda ajuda usada fica registrada**, e o tópico vira revisão prioritária.
4. **O servidor é a autoridade**: ele corrige as respostas e conta o tempo.
   O navegador nunca recebe o gabarito antes de responder.
5. **Piso de conhecimento**: 0/3 no combate e < 60% no chefe perdem sempre,
   não importa a vida.
6. **Domínio só se prova sem ajuda**: um tópico só chega a "Consolidado"
   passando nas revisões espaçadas sem usar skill.
7. **Conteúdo just-in-time**: o banco de questões fica pronto **um módulo à
   frente**, não o currículo inteiro. Construir o jogo não pode virar
   desculpa para não estudar.

## Os 8 atos (horas)

| Ato | Tema | Horas | Acumulado |
|---|---|---:|---:|
| A0 | Fundamentos | 900 | 900 |
| A1 | Microcontroladores e firmware IoT | 1.800 | 2.700 |
| A2 | Hardware e projeto de PCB | 1.700 | 4.400 |
| A3 | SMT e a placa completa "meu ESP32" | 1.600 | 6.000 |
| A4 | Produto IoT profissional | 1.000 | 7.000 |
| A5 | Manufatura eletrônica | 600 | 7.600 |
| A6 | Semicondutores e chips | 1.400 | 9.000 |
| A7 | Sensores do zero absoluto | 1.000 | 10.000 |

## Stack
TypeScript nos dois lados · Node 22 + Fastify · SQLite (WAL) · Vite + Canvas 2D
· conteúdo em YAML versionado no git · publicação atrás do Caddy que já existe
no VPS, em `meh-eng.com/estudos`.

## Onde está cada coisa
- Grade completa: [03-CURRICULO/GRADE-CURRICULAR.md](03-CURRICULO/GRADE-CURRICULAR.md)
- Como funciona uma luta: [05-RPG/MECANICAS.md](05-RPG/MECANICAS.md)
- As 20 variantes de chefe: [05-RPG/CHEFES.md](05-RPG/CHEFES.md)
- Skills e os limites delas: [05-RPG/PERSONAGEM-E-SKILLS.md](05-RPG/PERSONAGEM-E-SKILLS.md)
- Tabelas do banco: [02-ARQUITETURA/BANCO-DE-DADOS.md](02-ARQUITETURA/BANCO-DE-DADOS.md)
- O que falta decidir: [00-GESTAO/PENDENCIAS.md](00-GESTAO/PENDENCIAS.md)

## Estado atual (2026-10-01)
- [x] Planejamento completo documentado
- [x] Pendências do MVP fechadas: 20 h/sem, combate por vida/dado/defesa (D010),
      revanche com XP (D011), derrota mantém vencidos (D007), nome Forja M&H (D012)
- [x] Skills do Guerreiro (D013), curva por faixas (D014), inimigos que aprendem (D015)
- [x] F1 — MVP jogável (ver README da raiz para rodar)
- [x] Conteúdo do M0.1: 7 roteiros, 98 questões em **rascunho** (revisar)
- [ ] F2 — as 20 variantes de chefe; conteúdo do M0.2 e M0.4
