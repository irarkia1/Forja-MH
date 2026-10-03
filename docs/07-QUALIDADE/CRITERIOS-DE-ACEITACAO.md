# Critérios de aceitação

Formato: **Dado / Quando / Então**. Cada item vira teste de integração ou
ponta a ponta.

## Cronômetro
- Dado um inimigo com mínimo de 2 h, quando estudo 1h59 válidos, então o
  botão Atacar continua bloqueado.
- Dado o estudo em andamento, quando escondo a aba por 10 min, então esses
  10 min não entram em `segundos_validos`.

## Combate
- Quando ataco, então recebo 3 questões **sem** gabarito no JSON.
- Quando erro uma questão, então vejo o dado rolado, o dano depois da
  defesa e minha vida restante — e o mesmo golpe está gravado no servidor.
- Dado vida 6, defesa 30% e poder 1, quando o dado dá 5, então levo 3,5 de dano.
- Dado que terminei as 3 questões vivo e com ≥ 1 acerto, então o inimigo fica
  "derrotado", recebo XP e 5 fantasmas são agendados.
- Dado que minha vida zerou na 2ª questão, então a 3ª não aparece, volto ao
  mapa e o inimigo exige 20% do mínimo de estudo antes de nova luta.
- Dado 0 acertos em 3, então é derrota mesmo com vida sobrando.
- Dado um inimigo já vencido, quando faço a revanche e venço, então recebo 25%
  do XP; uma 2ª revanche no mesmo dia fica bloqueada.
- Dado que perdi para um inimigo, então os outros inimigos da fase continuam
  derrotados (modo normal).

## Chefe
- Dado um módulo com inimigos pendentes, então o chefe aparece bloqueado.
- Quando entro no chefe, então a variante sorteada não está entre as 3 últimas.
- Dado uma prova em curso, quando fecho o navegador e volto, então continuo
  na mesma questão.
- Dado que fui derrotado, então o chefe fica em cooldown de 48 h e as feridas
  aparecem como fantasmas.
- Dado que cheguei vivo ao fim com 58% de acerto (piso 60%), então é derrota.
- Dado um chefe com N = 47 e vida 22, então a vida de batalha é 147,7.
- Dado que perdi duas vezes para o chefe, então ele entra com adaptação 2
  (poder +20%, perfuração 20%) e 40% das questões que sobram depois da
  cobertura vão para os meus tópicos mais fracos.
- Dado que venci o chefe adaptado, então a adaptação volta a 0.

## Curva de XP
- Dado 1.999 h válidas e nível 11, quando passo de 2.000 h, então subo para o
  nível 12 na hora e o próximo nível custa 200 XP.
- Dado que faço revanches, então o XP sobe mas a faixa não muda.

## Skills
- Quando uso Lupa, então vejo uma dica e o JSON não contém a resposta.
- Dado um fantasma, então nenhum botão de skill aparece e nenhum dado é rolado.
- Dado um chefe de 50 questões, quando já usei ajuda em 10, então as skills
  ficam desabilitadas.

## Mapa
- Dado o M0.1 vencido, então M0.2, M0.4, M0.6 e M0.7 aparecem disponíveis e
  posso escolher com ↑ ↓ ou clique.

## Painel
- Dado 8 semanas de histórico, então a previsão de término usa a média dessas
  8 semanas.
