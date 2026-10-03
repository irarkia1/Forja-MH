// Todos os números de balanceamento ficam aqui (docs/05-RPG/BALANCEAMENTO.md).
// Mudou um número: muda aqui, no teste e no documento.
export const CONFIG = {
  estudo: {
    pulsoSeg: 30,
    pulsoMaxIntervaloSeg: 90,
    checkinSeg: 25 * 60,
    checkinPrazoSeg: 2 * 60,
    minimoFracao: 0.6,
    minimoArredondarSeg: 15 * 60,
    recuperacaoFracao: 0.2,
    notaMinCaracteres: 80,
  },
  personagem: {
    vidaBase: 6,
    defesaMax: 0.8,
    esquivaMax: 0.5,
  },
  preparo: {
    passo: 0.1, // a cada 10% além do mínimo...
    bonus: 0.05, // ...+5% de defesa
    max: 0.2,
  },
  dado: { min: 0, max: 6 },
  combate: {
    questoes: 3,
    criticoMult: 1.5,
    eliteMultPoder: 1.25,
  },
  chefe: {
    horasPorQuestao: 3,
    minQuestoes: 10,
    maxQuestoes: 100,
    divisorVida: 7,
    piso: 0.6,
    cooldownHoras: 48,
  },
  xp: {
    inimigoBase: 100,
    inimigoPorHora: 10,
    nota: 10,
    evidencia: 100,
    chefePorQuestao: 10,
    revancheInimigo: 0.25,
    revancheChefe: 0.5,
    revancheInimigoPorDia: 1,
    revancheChefeDias: 7,
    fantasmaNoDia: 20,
    fantasmaAtrasado: 10,
  },
  curva: {
    faixaHoras: 2000,
    faixas: 5,
    baseXp: 100,
    xpPorHoraReferencia: 85,
    pontosPorNivel: 2,
  },
  adaptacao: {
    max: 5,
    poderPorNivel: 0.1,
    perfuracaoPorNivel: 0.1,
    fracoBase: 0.2,
    fracoPorNivel: 0.1,
    fracoMax: 0.7,
    dificilBase: 0.3,
    dificilPorNivel: 0.04,
    dificilMax: 0.5,
  },
  fraqueza: {
    meiaVidaDias: 30,
    fraco: 0.4,
    atencao: 0.25,
    minRespostas: 5,
  },
} as const;
