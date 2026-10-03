import { CONFIG } from './config';

// Fraqueza por tópico/objetivo (D015): erros recentes pesam mais.

export interface Desempenho {
  errosPond: number;
  respostasPond: number;
  atualizadoEm: Date;
}

export function decair(d: Desempenho, agora: Date): Desempenho {
  const dias = Math.max(0, (agora.getTime() - d.atualizadoEm.getTime()) / 86_400_000);
  const f = 0.5 ** (dias / CONFIG.fraqueza.meiaVidaDias);
  return { errosPond: d.errosPond * f, respostasPond: d.respostasPond * f, atualizadoEm: agora };
}

export function registrar(d: Desempenho | undefined, correta: boolean, agora: Date): Desempenho {
  const base = d ? decair(d, agora) : { errosPond: 0, respostasPond: 0, atualizadoEm: agora };
  return { errosPond: base.errosPond + (correta ? 0 : 1), respostasPond: base.respostasPond + 1, atualizadoEm: agora };
}

export function fraqueza(d: Pick<Desempenho, 'errosPond' | 'respostasPond'> | undefined): number {
  if (!d) return 0.5;
  return (d.errosPond + 1) / (d.respostasPond + 2);
}

export type ClasseFraqueza = 'fraco' | 'atencao' | 'forte' | 'sem_dados';

export function classificar(d: Pick<Desempenho, 'errosPond' | 'respostasPond'> | undefined): ClasseFraqueza {
  if (!d || d.respostasPond < CONFIG.fraqueza.minRespostas) return 'sem_dados';
  const f = fraqueza(d);
  if (f >= CONFIG.fraqueza.fraco) return 'fraco';
  if (f >= CONFIG.fraqueza.atencao) return 'atencao';
  return 'forte';
}
