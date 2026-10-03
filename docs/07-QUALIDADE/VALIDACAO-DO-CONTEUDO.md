# Validação do conteúdo

Uma questão errada ensina errado. Nenhuma questão entra em prova sem passar
por aqui.

## Checklist de revisão de questão
- [ ] Mede **um objetivo de aprendizagem** do roteiro (citado no YAML)
- [ ] Tem **uma** resposta defensável (ou o conjunto certo, em múltipla)
- [ ] Distratores **plausíveis**, baseados em erros reais — sem "nenhuma das
      anteriores" nem "todas as anteriores"
- [ ] Enunciado sem pista gramatical da resposta
- [ ] Numérica: valor **conferido por cálculo** (script ou planilha), unidade
      e tolerância definidas
- [ ] Explicação ensina — não só repete a resposta
- [ ] **Fonte** com livro/documento e capítulo ou página
- [ ] Dificuldade e Bloom coerentes
- [ ] Gerada por IA? Conferida contra a fonte, não contra a memória do revisor

## Checklist de roteiro
- [ ] 2–5 objetivos de aprendizagem verificáveis ("calcular", "explicar",
      "montar" — nunca "entender")
- [ ] Fontes acessíveis, com trecho exato
- [ ] Exercícios com gabarito disponível
- [ ] Elite: laboratório com lista de material, passo a passo e o que medir

## Validação automática (`validar-conteudo.ts`)
- Schema Zod de módulo, tópico e questão.
- IDs únicos e no padrão; pré-requisitos sem ciclo e alcançáveis.
- Soma das horas dos módulos = horas do ato; soma dos atos = 10.000.
- Tópico com ≥ 12 questões `revisada` antes de ficar disponível no jogo.
- Cada objetivo de aprendizagem com ≥ 2 questões.

## Validação em uso
- Taxa de acerto < 20% ou > 95% (≥ 10 respostas) → sinalizada.
- Contestação → sai das provas até ser revista.
- A cada fim de módulo: 10 minutos para olhar as 5 questões com pior
  desempenho.
