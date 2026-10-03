# API

JSON sobre HTTPS. Prefixo `/api`. Autenticação por cookie `HttpOnly`.
Erros: `{ "erro": "codigo_curto", "mensagem": "texto para a tela" }`.

## Autenticação
| Método | Rota | O quê |
|---|---|---|
| POST | `/api/login` | `{login, senha}` → cookie |
| POST | `/api/logout` | Apaga a sessão |
| GET | `/api/eu` | Usuário + personagem (nível, XP, vida, defesa, energia) |

## Mapa e conteúdo
| Método | Rota | O quê |
|---|---|---|
| GET | `/api/mapa` | Atos e módulos com estado, posição e arestas (bifurcações) |
| GET | `/api/modulos/:id` | Inimigos da fase, estado de cada um, chefe |
| GET | `/api/topicos/:id` | Roteiro, tempo mínimo, tempo já estudado, evidências |

## Estudo (cronômetro)
| Método | Rota | O quê |
|---|---|---|
| POST | `/api/sessoes` | `{topico_id, modo}` → sessão aberta (fecha outra aberta) |
| POST | `/api/sessoes/:id/pulso` | `{visivel}` → segundos válidos acumulados |
| POST | `/api/sessoes/:id/checkin` | Resposta ao "ainda estudando?" |
| POST | `/api/sessoes/:id/encerrar` | Fecha e consolida |

## Combate, chefe, fantasma, pré-teste
| Método | Rota | O quê |
|---|---|---|
| POST | `/api/tentativas` | `{tipo, alvo_id}` → plano (variante, vida, poder, defesa, piso, **adaptação**, perfuração, questões por ponto fraco) + 1ª questão (sem gabarito). Alvo já vencido = revanche |
| GET | `/api/tentativas/:id` | Retoma prova em curso |
| POST | `/api/tentativas/:id/respostas` | `{ordem, resposta, confianca?, skill?}` → correção, explicação, **golpe** (`dados`, `dano`, `vida_atual`) se errou, próxima questão ou fim |
| POST | `/api/tentativas/:id/desistir` | Conta como derrota (chefe) ou abandono (fantasma) |

## Personagem
| Método | Rota | O quê |
|---|---|---|
| GET | `/api/skills` | Árvore, níveis, custos |
| POST | `/api/skills/:id/evoluir` | Gasta ponto de skill |
| GET | `/api/revisoes?ate=AAAA-MM-DD` | Fantasmas pendentes |
| POST | `/api/evidencias` | Upload multipart (≤ 20 MB) ou link |

## Painel
| Método | Rota | O quê |
|---|---|---|
| GET | `/api/painel` | Horas (total, semana, por ato/trilha), ritmo, previsão, acertos, ajuda, sequência, faixa e próximo Marco |
| GET | `/api/painel/fraquezas` | Tópicos e objetivos por fraqueza, com classe (fraco/atenção/forte) |
| GET | `/api/painel/historico?de=&ate=` | Série diária para gráficos |

## Contestar questão
| Método | Rota | O quê |
|---|---|---|
| POST | `/api/questoes/:id/contestar` | `{motivo}` → marca `contestada`; se a contestação for aceita na revisão, a questão deixa de contar contra você |
