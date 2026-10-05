import { CONFIG } from './config';

// Curva de XP por faixas de horas (D014).
// Dentro da faixa, cada nível custa o dobro do anterior. No Marco de horas,
// o nível preso sobe na hora, a barra zera e o custo volta à base da faixa.

export interface EstadoNivel {
  nivel: number;
  faixa: number; // 0..faixas-1
  niveisNaFaixa: number; // níveis ganhos por XP dentro da faixa atual
  xpFaixa: number; // XP acumulado na barra atual
  xpTotal: number; // histórico, só para exibir
}

export const NIVEL_INICIAL: EstadoNivel = { nivel: 1, faixa: 0, niveisNaFaixa: 0, xpFaixa: 0, xpTotal: 0 };

export function faixaDasHoras(horas: number): number {
  const { faixaHoras, faixas } = CONFIG.curva;
  return Math.min(Math.floor(horas / faixaHoras), faixas - 1);
}

export function custoProximoNivel(e: Pick<EstadoNivel, 'faixa' | 'niveisNaFaixa'>): number {
  return CONFIG.curva.baseXp * 2 ** e.faixa * 2 ** e.niveisNaFaixa;
}

export interface ResultadoNivel {
  estado: EstadoNivel;
  niveisGanhos: number;
  marcos: number;
}

export function ganharXp(e: EstadoNivel, xp: number): ResultadoNivel {
  const s = { ...e, xpFaixa: e.xpFaixa + xp, xpTotal: e.xpTotal + xp };
  let niveisGanhos = 0;
  for (let custo = custoProximoNivel(s); s.xpFaixa >= custo; custo = custoProximoNivel(s)) {
    s.xpFaixa -= custo;
    s.nivel += 1;
    s.niveisNaFaixa += 1;
    niveisGanhos += 1;
  }
  return { estado: s, niveisGanhos, marcos: 0 };
}

// Só horas válidas cruzam Marcos — XP de revanche nunca (D014).
export function aplicarHoras(e: EstadoNivel, horasValidas: number): ResultadoNivel {
  const alvo = faixaDasHoras(horasValidas);
  const s = { ...e };
  let marcos = 0;
  while (s.faixa < alvo) {
    s.faixa += 1;
    s.nivel += 1; // o nível em que você estava preso sobe na hora
    s.niveisNaFaixa = 0;
    s.xpFaixa = 0;
    marcos += 1;
  }
  return { estado: s, niveisGanhos: marcos, marcos };
}

export function vidaMaxima(nivel: number, vitalidade = 0): number {
  return CONFIG.personagem.vidaBase + (nivel - 1) + vitalidade;
}

export function pontosDeSkill(nivel: number): number {
  return (nivel - 1) * CONFIG.curva.pontosPorNivel;
}

// Nível que um jogador "na média" (85 XP por hora) teria com essas horas.
// Usado para o poder das fases. Calculado hora a hora e guardado.
const cacheNivelEsperado: number[] = [];

export function nivelEsperado(horas: number): number {
  const h = Math.max(0, Math.floor(horas));
  if (cacheNivelEsperado.length === 0) {
    const total = CONFIG.curva.faixaHoras * CONFIG.curva.faixas;
    let e = NIVEL_INICIAL;
    cacheNivelEsperado.push(e.nivel);
    for (let i = 1; i <= total; i++) {
      e = aplicarHoras(e, i - 1).estado;
      e = ganharXp(e, CONFIG.curva.xpPorHoraReferencia).estado;
      cacheNivelEsperado.push(e.nivel);
    }
  }
  return cacheNivelEsperado[Math.min(h, cacheNivelEsperado.length - 1)]!;
}

// Títulos por horas válidas (PERSONAGEM-E-SKILLS.md).
export const TITULOS: readonly { horas: number; nome: string }[] = [
  { horas: 0, nome: 'Aprendiz' },
  { horas: 1000, nome: 'Técnico' },
  { horas: 2500, nome: 'Projetista' },
  { horas: 4500, nome: 'Engenheiro' },
  { horas: 6500, nome: 'Sênior' },
  { horas: 8000, nome: 'Especialista' },
  { horas: 10000, nome: 'Mestre da Forja' },
];

export function titulo(horas: number): { nome: string; proximo: { nome: string; horas: number } | null } {
  let i = 0;
  while (i + 1 < TITULOS.length && horas >= TITULOS[i + 1]!.horas) i++;
  const proximo = TITULOS[i + 1];
  return { nome: TITULOS[i]!.nome, proximo: proximo ? { nome: proximo.nome, horas: proximo.horas } : null };
}
