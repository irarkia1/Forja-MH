# Inimigos que aprendem (D015)

Ideia do Matheus: **inimigos e chefes aprendem com a sua derrota**. Cada vez
que você perde, a missão fica mais difícil, e eles passam a atacar **os temas
em que você mais erra**.

Pedagogicamente, é **prática deliberada**: o jogo empurra você exatamente
para o ponto fraco, em vez de deixar você acertar o que já sabe.

## 1. O jogo sabe onde você é fraco
Para cada **tópico** e cada **objetivo de aprendizagem** (toda questão aponta
para um), o servidor mantém uma **fraqueza**:

```
fraqueza = (erros_pond + 1) ÷ (respostas_pond + 2)
```
- Cada resposta pesa `0,5 ^ (dias_desde ÷ 30)`: um erro de 30 dias atrás pesa
  metade. Quem melhorou deixa de ser "fraco".
- O `+1 / +2` evita julgar com poucas respostas (começa em 50%, neutro).
- Contam combates, chefes, fantasmas e revanches. O reconhecimento
  (pré-teste) não conta: errar antes de estudar é esperado.

| Fraqueza (≥ 5 respostas) | Classe | No painel |
|---|---|---|
| ≥ 40% | **Fraco** | vermelho, com ícone |
| 25–40% | Atenção | amarelo |
| < 25% | Forte | verde |

## 2. Nível de adaptação
Cada inimigo e cada chefe guarda um **nível de adaptação** de 0 a 5.

| Evento | Efeito |
|---|---|
| Você perde para ele | **+1** (máx. 5) |
| Você vence | volta a **0** |
| Revanche | começa em 0, mas já mira os seus pontos fracos (abaixo) |

### O que cada nível faz
| Efeito | Por nível | Máximo (nv. 5) |
|---|---|---|
| **Poder** do inimigo | +10% | +50% |
| **Perfuração**: ignora parte da sua defesa e esquiva | 10% | 50% |
| **Questões nos seus pontos fracos** | 20% base + 10% | 70% |
| Parcela de questões difíceis (4–5) | 30% + 4 p.p. | 50% |

```
defesa_efetiva  = defesa  × (1 − perfuração)
esquiva_efetiva = esquiva × (1 − perfuração)
```

## 3. Como as questões são escolhidas
**Combate (3 questões):**
- Nível 0: sorteio normal, evitando as questões vistas há pouco.
- Nível ≥ 1: pelo menos **2 das 3** saem dos objetivos do tópico em que você
  errou; a 3ª, do objetivo mais fraco que ainda não caiu.

**Chefe (N questões):**
1. **Cobertura**: todo tópico do módulo aparece pelo menos 1 vez.
2. Do restante, uma fração `f` (20% + 10% × nível) vai para os tópicos **por
   ordem de fraqueza**; o resto `1 − f`, proporcional às horas do tópico.
3. Dentro de cada tópico, os objetivos mais fracos têm prioridade.

**Fantasmas** também priorizam o objetivo mais fraco do tópico, sem dano e
sem adaptação.

## 4. Apresentação
- O inimigo adaptado ganha aura e estrelas: *"Thévenin, o Adaptado ★★"*.
- Na entrada, ele **avisa o que aprendeu**: *"Lembro de você. Errou 7 de 12
  em Transitórios RC. Vamos ver de novo."*
- O plano da prova mostra: nível de adaptação, poder, perfuração e quantas
  questões miram cada ponto fraco. Sem surpresa escondida.

## 5. Proteções contra a espiral de derrota
Perder deixa o inimigo mais forte, e um inimigo mais forte faz perder mais.
Por isso:
- O nível de adaptação para em **5**.
- A derrota no chefe já exige **curar as feridas** (fantasmas dos tópicos
  errados) antes da nova tentativa: você chega mais forte justo onde ele vai
  bater.
- No **nível 3 ou mais**, o jogo abre um **Treino** opcional: uma sessão de
  estudo guiada nos 3 objetivos mais fracos. Cada Treino concluído com
  fantasma vencido **reduz 1 nível** de adaptação.
- A derrota por vida nunca apaga inimigos vencidos (D007).

## 6. Efeito simulado (chefe N=47, fase do seu nível)
Chance de chegar vivo ao fim, **antes** de contar que as questões ficam mais
difíceis para você (o efeito real é maior, porque elas miram o que você erra):

| Adaptação | Build média, 60% de acerto | Build média, 70% | Build forte, 60% |
|---:|---:|---:|---:|
| 0 | 96% | 100% | 100% |
| 1 | 90% | 99% | 100% |
| 3 | 62% | 92% | 99% |
| 5 | 33% | 75% | 88% |
