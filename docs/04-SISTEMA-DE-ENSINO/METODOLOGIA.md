# Metodologia

O jogo é construído em cima de técnicas com evidência forte de que funcionam.
Cada mecânica tem uma razão pedagógica — se não tiver, sai.

| Técnica | O que é | Onde aparece no jogo |
|---|---|---|
| **Recuperação ativa** | Puxar da memória, não reler | Quiz de 3 questões, fantasmas, chefes |
| **Repetição espaçada** | Revisar em intervalos crescentes | Fantasmas em 1, 3, 7, 21 e 60 dias |
| **Pré-teste** | Tentar responder antes de estudar | "Reconhecimento" opcional ao encontrar o inimigo |
| **Intercalação** | Misturar temas na prática | Chefes cumulativos (Arquivista), fantasmas de módulos diferentes no mesmo dia |
| **Elaboração / Feynman** | Explicar com as próprias palavras | Nota pessoal ao derrotar; chefe "Duelo de Feynman" |
| **Aprender fazendo** | Laboratório e projeto | Inimigos de elite, projetos integradores |
| **Feedback imediato** | Saber na hora por que errou | Explicação após cada resposta |
| **Calibração** | Saber o que você sabe | Chefe "Oráculo Cego" com confiança por resposta |
| **Prática deliberada** | Atacar o ponto fraco | "Feridas" após derrota viram revisão obrigatória |

## Ciclo de um tópico (inimigo)

```
1. Reconhecimento (opcional, 3 questões, não conta)  ← pré-teste
2. Roteiro: objetivos de aprendizagem + fontes
3. Estudo cronometrado até o tempo mínimo            ← leitura, aula, exercícios
4. Nota pessoal: 3–5 frases explicando o tema         ← elaboração
5. (elite) Laboratório + evidência
6. Quiz de 3 questões                                 ← recuperação
7. Fantasmas em 1/3/7/21/60 dias                      ← espaçamento
```

## Roteiro de cada tópico
Todo `roteiros/Txx.md` tem o mesmo formato:

```markdown
# M0.4.T02 — Leis de Kirchhoff
## Ao final você consegue
- Escrever as equações de nós e malhas de um circuito com até 3 malhas.
- Explicar por que a soma das correntes num nó é zero (conservação de carga).
## Estude
- Livro X, cap. 2.3 (p. 45–60)
- Vídeo Y (25 min)
## Pratique
- 10 exercícios da lista Z
## Laboratório (se elite)
- Monte o circuito W e meça; compare com o cálculo; foto + tabela.
## Armadilhas comuns
- Convenção de sinal das quedas de tensão.
```

## Rotina de sessão
- Blocos de **50 min + 10 min** de pausa (configurável; Pomodoro 25/5 também).
- Uma tarefa por bloco. Celular longe.
- Começar o dia pelos **fantasmas** (5–15 min), depois o inimigo atual.
- Fim da semana: **retrospectiva** de 15 min com o painel.
