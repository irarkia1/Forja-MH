import { CONFIG, SKILLS, SKILL_POR_ID, energiaMaxima, nv, podeEvoluir, pontosDeSkill, pontosGastos, type Niveis } from '@forja/regras';
import { exec, todos, transacao, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp, naoEncontrado } from '../erros';

export function niveis(ctx: Contexto, uid: number): Niveis {
  return Object.fromEntries(
    todos<{ skill_id: string; nivel: number }>(ctx.db, 'SELECT skill_id, nivel FROM personagem_skill WHERE usuario_id = :uid', { uid }).map((r) => [r.skill_id, r.nivel]),
  );
}

export function energia(ctx: Contexto, uid: number): { atual: number; max: number } {
  const e = um<{ energia: number }>(ctx.db, 'SELECT energia FROM personagem WHERE usuario_id = :uid', { uid })?.energia ?? 0;
  const max = energiaMaxima(niveis(ctx, uid));
  return { atual: Math.min(e, max), max };
}

export function ganharEnergia(ctx: Contexto, uid: number, valor: number): void {
  const { atual, max } = energia(ctx, uid);
  exec(ctx.db, 'UPDATE personagem SET energia = :e WHERE usuario_id = :uid', { e: Math.min(max, Math.round((atual + valor) * 10) / 10), uid });
}

export function gastarEnergia(ctx: Contexto, uid: number, valor: number): number {
  const { atual } = energia(ctx, uid);
  if (atual < valor) throw new ErroApp(409, 'sem_energia', `Energia insuficiente (${atual} de ${valor}). Faça revisões e laboratórios para recarregar.`);
  exec(ctx.db, 'UPDATE personagem SET energia = :e WHERE usuario_id = :uid', { e: Math.round((atual - valor) * 10) / 10, uid });
  return atual - valor;
}

function nivelDoPersonagem(ctx: Contexto, uid: number): number {
  return um<{ nivel: number }>(ctx.db, 'SELECT nivel FROM personagem WHERE usuario_id = :uid', { uid })?.nivel ?? 1;
}

export function pontos(ctx: Contexto, uid: number) {
  const total = pontosDeSkill(nivelDoPersonagem(ctx, uid));
  const gastos = pontosGastos(niveis(ctx, uid));
  return { total, gastos, livres: total - gastos };
}

export function listar(ctx: Contexto, uid: number) {
  const n = niveis(ctx, uid);
  const p = pontos(ctx, uid);
  return {
    pontos: p,
    energia: energia(ctx, uid),
    skills: SKILLS.map((s) => {
      const pode = podeEvoluir(s, n, p.livres);
      return {
        ...s,
        nivel: nv(n, s.id),
        podeEvoluir: pode.ok,
        custoProximo: pode.ok ? pode.custo : null,
        motivo: pode.ok ? null : pode.motivo,
      };
    }),
  };
}

export function evoluir(ctx: Contexto, uid: number, id: string) {
  const s = SKILL_POR_ID.get(id);
  if (!s) throw naoEncontrado('Skill');
  return transacao(ctx.db, () => {
    const pode = podeEvoluir(s, niveis(ctx, uid), pontos(ctx, uid).livres);
    if (!pode.ok) throw new ErroApp(409, 'nao_pode_evoluir', pode.motivo);
    exec(ctx.db, `INSERT INTO personagem_skill (usuario_id, skill_id, nivel) VALUES (:uid, :s, 1)
      ON CONFLICT(usuario_id, skill_id) DO UPDATE SET nivel = nivel + 1`, { uid, s: id });
    return listar(ctx, uid);
  });
}

export const ENERGIA = CONFIG.energia;
