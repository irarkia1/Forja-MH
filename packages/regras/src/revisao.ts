// Agenda dos fantasmas (ESTUDO-E-REVISAO.md): 1, 3, 7, 21 e 60 dias.

export const INTERVALOS_DIAS = [1, 3, 7, 21, 60] as const;
export const ETAPAS = INTERVALOS_DIAS.length;
export const MAX_PENDENTES = 30; // acima disso, não abre inimigo novo
export const ATRASO_REBAIXA_DIAS = 7;

export interface RegraEtapa {
  questoes: number;
  minimo: number;
}

export function regraDaEtapa(etapa: number): RegraEtapa {
  if (etapa <= 0) return { questoes: 3, minimo: 2 }; // ferida
  if (etapa <= 2) return { questoes: 2, minimo: 2 };
  if (etapa <= 4) return { questoes: 3, minimo: 2 };
  return { questoes: 3, minimo: 3 };
}

export function diasAteEtapa(etapa: number): number {
  return INTERVALOS_DIAS[Math.max(1, Math.min(ETAPAS, etapa)) - 1]!;
}

// Atraso de mais de 7 dias rebaixa uma etapa (mínimo 1).
export function etapaEfetiva(etapa: number, venceEm: Date, agora: Date): number {
  if (etapa <= 1) return etapa;
  const atraso = (agora.getTime() - venceEm.getTime()) / 86_400_000;
  return atraso > ATRASO_REBAIXA_DIAS ? etapa - 1 : etapa;
}

export type Proximo = { etapa: number; dias: number } | { concluido: true };

// Passou: avança. Errou: volta para a etapa 1, amanhã.
export function proximaRevisao(etapa: number, passou: boolean): Proximo {
  if (!passou) return { etapa: 1, dias: 1 };
  if (etapa >= ETAPAS) return { concluido: true };
  return { etapa: etapa + 1, dias: diasAteEtapa(etapa + 1) };
}
