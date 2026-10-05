import {
  CONFIG,
  defesaDeSkill,
  energiaMaxima,
  nv,
  pontosGastos,
  aplicarHoras,
  custoProximoNivel,
  ganharXp,
  pontosDeSkill,
  vidaMaxima,
  type EstadoNivel,
} from '@forja/regras';
import { exec, um } from '../db';
import type { Contexto } from '../contexto';
import { inicioDaSemana } from '../tempo';
import { niveis as niveisSkill } from './skills';

interface LinhaPersonagem {
  nivel: number;
  faixa: number;
  niveis_na_faixa: number;
  xp_faixa: number;
  xp_total: number;
  posicao: string | null;
}

function ler(ctx: Contexto, uid: number): EstadoNivel & { posicao: unknown } {
  const p = um<LinhaPersonagem>(ctx.db, 'SELECT * FROM personagem WHERE usuario_id = :uid', { uid });
  if (!p) throw new Error(`personagem ausente para usuário ${uid}`);
  return {
    nivel: p.nivel, faixa: p.faixa, niveisNaFaixa: p.niveis_na_faixa, xpFaixa: p.xp_faixa, xpTotal: p.xp_total,
    posicao: p.posicao ? JSON.parse(p.posicao) : null,
  };
}

function gravar(ctx: Contexto, uid: number, e: EstadoNivel): void {
  exec(ctx.db, `UPDATE personagem SET nivel=:nivel, faixa=:faixa, niveis_na_faixa=:k, xp_faixa=:xp, xp_total=:total WHERE usuario_id=:uid`, {
    uid, nivel: e.nivel, faixa: e.faixa, k: e.niveisNaFaixa, xp: e.xpFaixa, total: e.xpTotal,
  });
}

export function evento(ctx: Contexto, uid: number, tipo: string, dados: unknown): void {
  exec(ctx.db, 'INSERT INTO evento (usuario_id, tipo, dados, em) VALUES (:uid, :tipo, :dados, :em)', {
    uid, tipo, dados: JSON.stringify(dados), em: ctx.agora().toISOString(),
  });
}

export function horasValidas(ctx: Contexto, uid: number): number {
  const r = um<{ s: number }>(ctx.db, 'SELECT COALESCE(SUM(segundos_validos), 0) AS s FROM sessao_estudo WHERE usuario_id = :uid', { uid });
  return (r?.s ?? 0) / 3600;
}

export interface Ganho {
  xp: number;
  niveisGanhos: number;
  marcos: number;
  nivel: number;
}

// Horas primeiro (Marcos só por horas válidas), depois XP.
export function darXp(ctx: Contexto, uid: number, xp: number, motivo: string): Ganho {
  const antes = ler(ctx, uid);
  const h = aplicarHoras(antes, horasValidas(ctx, uid));
  const x = ganharXp(h.estado, Math.max(0, Math.round(xp)));
  gravar(ctx, uid, x.estado);
  if (xp > 0) evento(ctx, uid, 'xp', { xp, motivo });
  if (h.marcos) evento(ctx, uid, 'marco', { faixa: x.estado.faixa });
  if (x.estado.nivel > antes.nivel) evento(ctx, uid, 'nivel', { de: antes.nivel, para: x.estado.nivel });
  return { xp: Math.round(xp), niveisGanhos: x.estado.nivel - antes.nivel, marcos: h.marcos, nivel: x.estado.nivel };
}

export function sincronizarHoras(ctx: Contexto, uid: number): Ganho {
  return darXp(ctx, uid, 0, 'horas');
}

export function nivelAtual(ctx: Contexto, uid: number): number {
  return ler(ctx, uid).nivel;
}

export function salvarPosicao(ctx: Contexto, uid: number, posicao: unknown): void {
  exec(ctx.db, 'UPDATE personagem SET posicao = :p WHERE usuario_id = :uid', { uid, p: JSON.stringify(posicao) });
}

export function resumo(ctx: Contexto, uid: number) {
  const e = ler(ctx, uid);
  const horas = horasValidas(ctx, uid);
  const fuso = um<{ fuso: string }>(ctx.db, 'SELECT fuso FROM usuario WHERE id = :uid', { uid })?.fuso ?? 'America/Sao_Paulo';
  const seteDias = inicioDaSemana(ctx.agora(), fuso).toISOString(); // semana de segunda a domingo
  const semana = um<{ s: number }>(ctx.db, `SELECT COALESCE(SUM(segundos_validos), 0) AS s FROM sessao_estudo WHERE usuario_id = :uid AND inicio >= :desde`, {
    uid, desde: seteDias,
  });
  const proximoMarco = e.faixa < CONFIG.curva.faixas - 1 ? (e.faixa + 1) * CONFIG.curva.faixaHoras : null;
  const sk = niveisSkill(ctx, uid);
  const energia = um<{ energia: number }>(ctx.db, 'SELECT energia FROM personagem WHERE usuario_id = :uid', { uid })?.energia ?? 0;
  return {
    nivel: e.nivel,
    faixa: e.faixa + 1,
    xpFaixa: e.xpFaixa,
    xpProximo: custoProximoNivel(e),
    xpTotal: e.xpTotal,
    vida: vidaMaxima(e.nivel, nv(sk, 'vitalidade')),
    defesa: defesaDeSkill(sk),
    energia: Math.min(energia, energiaMaxima(sk)),
    energiaMax: energiaMaxima(sk),
    pontosSkill: pontosDeSkill(e.nivel),
    pontosLivres: pontosDeSkill(e.nivel) - pontosGastos(sk),
    horasTotais: Math.round(horas * 100) / 100,
    horasSemana: Math.round(((semana?.s ?? 0) / 3600) * 100) / 100,
    metaSemana: 20,
    proximoMarco,
    posicao: e.posicao,
  };
}
