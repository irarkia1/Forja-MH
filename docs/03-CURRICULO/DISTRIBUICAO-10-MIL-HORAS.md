# Distribuição das 10 mil horas

## Por ato

| Ato | Horas | % | Módulos | Tópicos |
|---|---:|---:|---:|---:|
| A0 Fundamentos | 900 | 9% | 7 | 63 |
| A1 Microcontroladores e firmware | 1.800 | 18% | 12 | 104 |
| A2 Hardware e PCB | 1.700 | 17% | 11 | 86 |
| A3 SMT e "meu ESP32" | 1.600 | 16% | 10 | 69 |
| A4 Produto IoT | 1.000 | 10% | 7 | 45 |
| A5 Manufatura | 600 | 6% | 6 | 35 |
| A6 Semicondutores | 1.400 | 14% | 8 | 59 |
| A7 Sensores do zero | 1.000 | 10% | 7 | 46 |
| **Total** | **10.000** | | **68** | **507** |

## Por tipo de atividade
Cada hora do módulo se divide assim (meta, não trava):

| Atividade | % | Onde conta no jogo |
|---|---:|---|
| Estudo guiado (leitura, aula, exercícios) | 60% | **Tempo mínimo** dos inimigos |
| Laboratório e projeto | 25% | Inimigos de elite + projetos integradores |
| Revisão espaçada | 8% | Fantasmas |
| Preparação e prova de chefe | 7% | Sessões de estudo do módulo + prova |

> Atos de bancada (A2, A3, A7) puxam o laboratório para 35–45%; atos de teoria
> (A0, A6) ficam perto de 15%. O painel mostra a proporção real.

## Como o tempo mínimo é calculado
```
horas_topico  = horas_modulo × peso_topico ÷ soma_dos_pesos
minimo_topico = horas_topico × 0,60     (arredondado para 15 min)
```
Peso padrão = 1; tópicos de elite costumam ter peso 1,5–2.
Exemplo: M0.4 (140 h, 9 tópicos, 2 de elite com peso 2) →
tópico comum ≈ 12,7 h (mínimo **7 h 45 min**); de elite ≈ 25,5 h
(mínimo **15 h 15 min**).

## O que conta como hora válida
| Conta | Não conta |
|---|---|
| Sessão online com aba visível e check-ins respondidos | Aba oculta, check-in perdido |
| Estudo offline registrado (≤ 40% das horas do tópico) | Tempo de prova (exceto chefe) |
| Laboratório com evidência | Trabalho na empresa **sem** evidência (ver P5) |
| Revisão de fantasma | Navegar no jogo, mexer em skills |
