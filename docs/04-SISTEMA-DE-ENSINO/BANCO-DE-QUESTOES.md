# Banco de questões

## Quantidades mínimas
| Onde | Mínimo | Por quê |
|---|---:|---|
| Por tópico | **12** (ideal 20) | 3 no combate + 13 nos fantasmas = 16; com 12, só os fantasmas mais distantes repetem questão |
| Por módulo (chefe) | **1,5 × questões do chefe**, além das dos tópicos | Garante ≥ 50% inéditas |
| Para o reconhecimento | Usa o pool do tópico | — |

Total estimado: 507 tópicos × 12 ≈ 6.100, mais ≈ 5.000 de chefes (1,5 × ~3.300) ≈ **11.000 questões** ao longo de 10
anos — por isso o conteúdo é **just-in-time**, um módulo à frente.

## Formato (YAML)
```yaml
# conteudo/A0/M0.4/questoes/T02.yaml
- id: Q-M0.4.T02-001
  tipo: numerica
  dificuldade: 2
  bloom: aplicar
  enunciado: |
    Três resistores de 1 kΩ, 2 kΩ e 3 kΩ estão em série com uma fonte de 12 V.
    Qual a queda de tensão no resistor de 2 kΩ?
  resposta: { valor: 4, unidade: V, tolerancia: 0.05 }
  explicacao: |
    Corrente = 12 V ÷ 6 kΩ = 2 mA. Queda = 2 mA × 2 kΩ = 4 V.
  fonte: "Practical Electronics for Inventors, 4ª ed., cap. 2"
  origem: humano
  revisao: revisada
```

## Ciclo de vida
```
rascunho ──revisão humana──▶ revisada ──contestação──▶ contestada ──▶ revisada (versão+1)
    │                                                       │
    └──────────────── reprovada ──────────────────────────▶ aposentada
```
Só `revisada` entra em prova. Uma questão com taxa de acerto < 20% ou > 95%
em 10+ respostas é sinalizada para revisão (ambígua ou fácil demais).

## Produção
1. Escrever o roteiro do tópico (objetivos de aprendizagem).
2. Gerar rascunhos (à mão ou com `ferramentas/gerar-questoes.ts`).
3. Revisar com o checklist de [07-QUALIDADE/VALIDACAO-DO-CONTEUDO.md](../07-QUALIDADE/VALIDACAO-DO-CONTEUDO.md).
4. `npm run validar-conteudo` e `npm run importar-conteudo`.

Cada objetivo de aprendizagem do roteiro precisa de pelo menos 2 questões.
