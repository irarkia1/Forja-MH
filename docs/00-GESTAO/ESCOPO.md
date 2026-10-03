# Escopo

## Dentro
- Currículo de 8 atos, 68 módulos, com tópicos, horas e pré-requisitos.
- Roteiro de estudo por tópico (objetivos, fontes, exercícios, laboratório).
- Banco de questões versionado no git, com revisão humana.
- Jogo web: mapa em linha com bifurcações, inimigos, chefes, acampamento,
  skills, revisões espaçadas e painel de acompanhamento.
- Cronômetro de estudo com validação no servidor.
- Registro de evidências de laboratório (foto, link de repositório, vídeo).
- Um usuário (o Matheus), com login. Pronto para ter mais no futuro, sem
  construir isso agora.
- Rodar local; publicar no VPS existente atrás do Caddy.

## Fora (por enquanto)
| Item | Por quê |
|---|---|
| Multijogador, ranking, social | Um usuário só; não muda o aprendizado |
| App nativo de celular | A web responsiva resolve; o estudo pesado é no computador |
| Produzir videoaulas próprias | O conteúdo vem de livros, cursos e documentação existentes |
| Gerar todo o banco de questões de uma vez | Conteúdo é just-in-time, um módulo à frente |
| Gráficos elaborados, animações complexas | Pixel art simples; o tempo vai para o estudo |

## Limites honestos do currículo
- **Fabricar um processador nível Intel/AMD/NVIDIA sozinho não é possível** —
  exige fábricas de dezenas de bilhões de dólares. O objetivo realista é:
  entender o processo inteiro, projetar um chip digital/analógico próprio,
  fazer tapeout num shuttle aberto (SkyWater 130 nm via Tiny Tapeout ou
  similar) e, opcionalmente, reproduzir microfabricação de garagem (transistor
  simples, nível do trabalho do Sam Zeloof).
- **Sensor do zero** é viável em bancada para várias famílias: termistor/RTD de
  filme, strain gauge, capacitivo de umidade, piezo, fotodetector, gás por óxido
  metálico, pH. MEMS de verdade (acelerômetro de silício) fica no nível de
  entendimento + protótipo em escala grande.
