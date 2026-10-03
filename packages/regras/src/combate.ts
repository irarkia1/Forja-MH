import { CONFIG } from './config';
import { nivelEsperado, vidaMaxima } from './curva';

// Vida, dado e defesa (D010) + adaptação (D015).

export function poderDaFase(horasAntesDaFase: number, opcoes: { elite?: boolean; adaptacao?: number } = {}): number {
  const vidaRef = vidaMaxima(nivelEsperado(horasAntesDaFase));
  let poder = vidaRef / CONFIG.personagem.vidaBase;
  if (opcoes.elite) poder *= CONFIG.combate.eliteMultPoder;
  poder *= 1 + CONFIG.adaptacao.poderPorNivel * (opcoes.adaptacao ?? 0);
  return arred(poder, 2);
}

export function perfuracao(adaptacao: number): number {
  return arred(CONFIG.adaptacao.perfuracaoPorNivel * limitarAdaptacao(adaptacao), 2);
}

export function limitarAdaptacao(n: number): number {
  return Math.max(0, Math.min(CONFIG.adaptacao.max, Math.floor(n)));
}

// Estudar além do mínimo protege: +5% de defesa a cada 10% a mais (máx. +20%).
export function defesaDePreparo(estudadoSeg: number, minimoSeg: number): number {
  if (minimoSeg <= 0 || estudadoSeg <= minimoSeg) return 0;
  const { passo, bonus, max } = CONFIG.preparo;
  const passos = Math.floor((estudadoSeg / minimoSeg - 1 + 1e-9) / passo);
  return Math.min(max, arred(passos * bonus, 2));
}

export function defesaTotal(defesaSkill: number, preparo: number): number {
  return Math.min(CONFIG.personagem.defesaMax, arred(defesaSkill + preparo, 4));
}

export interface Golpe {
  dado: number;
  dano: number;
}

export function danoDoGolpe(p: { dado: number; poder: number; defesa: number; perfuracao: number }): number {
  const defesaEfetiva = p.defesa * (1 - p.perfuracao);
  return arred(Math.max(0, p.dado * p.poder * (1 - defesaEfetiva)), 1);
}

export function questoesDoChefe(horasModulo: number): number {
  const { horasPorQuestao, minQuestoes, maxQuestoes } = CONFIG.chefe;
  return Math.max(minQuestoes, Math.min(maxQuestoes, Math.round(horasModulo / horasPorQuestao)));
}

export function vidaDeBatalha(vida: number, questoes: number): number {
  return arred((vida * questoes) / CONFIG.chefe.divisorVida, 1);
}

export type Resultado = 'vitoria' | 'derrota';
export type Motivo = 'vida' | 'piso';

// Combate: sobreviver às 3 com pelo menos 1 acerto. Chefe: sobreviver + piso.
export function resultadoFinal(p: { tipo: 'combate' | 'chefe'; acertos: number; total: number; vida: number }): {
  resultado: Resultado;
  motivo?: Motivo;
} {
  if (p.vida <= 0) return { resultado: 'derrota', motivo: 'vida' };
  if (p.tipo === 'combate') return p.acertos >= 1 ? { resultado: 'vitoria' } : { resultado: 'derrota', motivo: 'piso' };
  return p.acertos / p.total >= CONFIG.chefe.piso - 1e-9
    ? { resultado: 'vitoria' }
    : { resultado: 'derrota', motivo: 'piso' };
}

export function horasDoTopico(horasModulo: number, peso: number, somaPesos: number): number {
  return (horasModulo * peso) / somaPesos;
}

export function minimoDoTopicoSeg(horasTopico: number): number {
  const { minimoFracao, minimoArredondarSeg } = CONFIG.estudo;
  const seg = horasTopico * 3600 * minimoFracao;
  return Math.max(minimoArredondarSeg, Math.round(seg / minimoArredondarSeg) * minimoArredondarSeg);
}

export function xpVitoriaInimigo(horasTopico: number, critico: boolean): number {
  const base = CONFIG.xp.inimigoBase + CONFIG.xp.inimigoPorHora * horasTopico;
  return Math.round(critico ? base * CONFIG.combate.criticoMult : base);
}

export function xpVitoriaChefe(questoes: number, acertos: number): number {
  return Math.round(CONFIG.xp.chefePorQuestao * questoes * (acertos / questoes));
}

function arred(x: number, casas: number): number {
  const f = 10 ** casas;
  return Math.round(x * f) / f;
}
