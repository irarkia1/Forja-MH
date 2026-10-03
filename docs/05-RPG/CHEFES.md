# Chefes

Cada chefe é a **prova do módulo**. Ao entrar, uma das **20 variantes** é
sorteada (D008). `N` = questões base do módulo, `clamp(horas ÷ 3, 10, 100)`.
Nenhuma variante passa de **100 questões no total**.

## Regra geral (D010)
- **Vida de batalha** = sua Vida × N ÷ 7. Ela não recupera durante a prova,
  a menos que a variante ou uma skill diga o contrário.
- **Dado do chefe**: `D` = 0–6, × poder da fase × (1 − defesa). Algumas
  variantes rolam mais dados.
- **Vitória** = chegar **vivo** à última questão **e** atingir o **piso de
  acerto** (padrão 60%).
- Vida zerou → derrota na hora.

## Sorteio
1. Filtra as variantes cujas **tags exigidas** o módulo tem
   (`calculo`, `codigo`, `esquematico`, `pratico`, `caso`).
2. Remove as **3 últimas** variantes enfrentadas (em qualquer módulo).
3. Sorteia com peso (padrão 10; ajustável no `variantes.yaml`).
4. Grava a variante no `progresso_modulo`; ela fica fixa até vencer.
   Na **revanche** de um chefe já vencido, sorteia de novo.

Módulos **integradores** sorteiam só entre variantes com tag `pratico` ou `caso`.

## Adaptação
A variante muda a cada tentativa, mas a **adaptação** (D015) acumula no
chefe do módulo: cada derrota soma poder, perfuração e questões nos seus
pontos fracos, seja qual for a próxima variante. Ver [ADAPTACAO.md](ADAPTACAO.md).

## As 20 variantes

| # | Variante | Mecânica | Dano | Piso | Tags |
|---:|---|---|---|---:|---|
| 1 | **O Guardião** | Prova direta de N questões | D | 60% | — |
| 2 | **Hidra de Duas Cabeças** | Cabeça 1: 60% de N. Ao cair, a cabeça 2 surge com 40% de N inéditas. **A vida não recupera entre cabeças** | D; cabeça 2: D+1 | 60% em cada | — |
| 3 | **Golem de Três Núcleos** | 3 núcleos, cada um com os tópicos de um terço do módulo; entre núcleos você **recupera 25%** da vida | D | 60% em cada | — |
| 4 | **O Traiçoeiro** | Após N questões, **ataque surpresa**: 1 questão integradora de dificuldade 5 | D; surpresa: 3D | 60% | — |
| 5 | **Lich Ressurgente** | Ao "morrer", **ressurge** com +25% de N, só dos tópicos que você errou; você recupera 30% da vida antes | D; ressurreição: D+1 | 60% em cada parte | — |
| 6 | **Cronomante** | 90 s por questão (numéricas 180 s); tempo esgotado = erro | D | 60% | — |
| 7 | **Espelho Quebrado** | 40% das questões são "ache o erro" | D; erro em "ache o erro": D × 1,5 | 60% | `codigo` ou `esquematico` ou `calculo` |
| 8 | **Engenheiro Sombrio** | 3 estudos de caso com N÷3 questões encadeadas | D, +1 por erro seguido no mesmo caso | 60% | `caso` |
| 9 | **Enxame** | 1,5 × N questões rápidas (45 s) | D ÷ 2 | 70% | — |
| 10 | **Colosso Numérico** | 0,6 × N questões, todas de cálculo | 2D | 60% | `calculo` |
| 11 | **O Arquivista** | N do módulo + 30% de N de módulos anteriores da mesma trilha | D; questões antigas: D+1 | 60% em cada parte | — |
| 12 | **Fúria Crescente** | Dificuldade sobe a cada 3 acertos seguidos e desce a cada erro | D + dificuldade atual − 3 | 60% | — |
| 13 | **O Purista** | Nenhuma skill ativa (passivas valem); sem pausa > 24 h | D | 65% · **+50% XP** | — |
| 14 | **Duelo de Feynman** | 0,8 × N objetivas + 1 explicação escrita avaliada por rubrica | D; rubrica < 3 de 4: 3D | 60% | — |
| 15 | **O Mímico** | Questões com cara de fáceis e distratores fortes | D | 55% | — |
| 16 | **Senhor da Bancada** | Tarefa prática com evidência + 0,5 × N questões sobre o que você mediu | 2D | 60% | `pratico` |
| 17 | **Dragão de Três Fases** | N dividido em fácil → médio → difícil (cronometrado) | D / 2D / 3D | 60% | — |
| 18 | **Vampiro** | Cada erro **suga**: dano + 1 questão extra (até +20% de N). Cada acerto cura 1 × poder | D | 60% | — |
| 19 | **Os Gêmeos** | Duas provas de N÷2 com tópicos separados, intercaladas; **duas barras de vida**, uma por gêmeo | D em cada barra | 60% em cada | — |
| 20 | **Oráculo Cego** | Sem correção nem dano visível até o fim; cada resposta leva confiança 1–3. No fim, os golpes são aplicados de uma vez | Erro: D × confiança; acerto com confiança 3 cura 1 × poder | 60% | — |

## Exemplo: M0.4 (140 h, N = 47, nível 17, Vida 22, poder 3,7)
- Vida de batalha: 22 × 47 ÷ 7 ≈ **148**. Dano médio por erro: ≈ 11.
- Sem defesa: cai com ~14 erros (≈ 70% de acerto no limite).
- Com Defesa 30%: dano médio ≈ 7,8 → aguenta ~19 erros, mas o piso de 60%
  (máx. 18 erros) manda.
- **Hidra**: cabeça 1 com 28 questões, cabeça 2 com 19 inéditas batendo D+1,
  e a vida não volta.

## Arte e apresentação
Cada variante tem sprite, nome, frase de entrada e a **animação do dado** a
cada golpe. O nome combina a variante com o tema: *"Hidra do Clock, Guardiã
do STM32"*.

## Implementação
Cada variante é um módulo em `packages/regras/chefes/` com `planejar`,
`aoResponder` e `resultado` (ARQUITETURA.md). O dado é rolado **no servidor**
com gerador criptográfico e gravado em `golpe`. Teste obrigatório por
variante: vitória, derrota por vida, derrota por piso, limite de 100 questões
e retomada após fechar o navegador.
