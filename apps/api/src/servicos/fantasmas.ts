import { MAX_PENDENTES } from '@forja/regras';
import { exec, todos, um } from '../db';
import type { Contexto } from '../contexto';
import { DIA_MS, inicioDoDia } from '../tempo';

// Agenda dos fantasmas (revisão espaçada) e feridas do chefe.

export interface LinhaRevisao {
  id: number;
  topico_id: string;
  tipo: 'agenda' | 'ferida';
  etapa: number;
  vence_em: string;
}

export function fusoDo(ctx: Contexto, uid: number): string {
  return um<{ fuso: string }>(ctx.db, 'SELECT fuso FROM usuario WHERE id = :uid', { uid })?.fuso ?? 'America/Sao_Paulo';
}

export function agendar(ctx: Contexto, uid: number, topicoId: string, etapa: number, dias: number): string {
  const vence = inicioDoDia(new Date(ctx.agora().getTime() + dias * DIA_MS), fusoDo(ctx, uid)).toISOString();
  exec(ctx.db, `UPDATE revisao SET feita_em = :em, resultado = 'substituida'
    WHERE usuario_id = :uid AND topico_id = :t AND tipo = 'agenda' AND feita_em IS NULL`, { em: ctx.agora().toISOString(), uid, t: topicoId });
  exec(ctx.db, `INSERT INTO revisao (usuario_id, topico_id, tipo, etapa, vence_em) VALUES (:uid, :t, 'agenda', :e, :v)`, {
    uid, t: topicoId, e: etapa, v: vence,
  });
  return vence;
}

export function abrirFerida(ctx: Contexto, uid: number, topicoId: string): void {
  const ja = um(ctx.db, `SELECT id FROM revisao WHERE usuario_id = :uid AND topico_id = :t AND tipo = 'ferida' AND feita_em IS NULL`, { uid, t: topicoId });
  if (!ja) {
    exec(ctx.db, `INSERT INTO revisao (usuario_id, topico_id, tipo, etapa, vence_em) VALUES (:uid, :t, 'ferida', 0, :v)`, {
      uid, t: topicoId, v: ctx.agora().toISOString(),
    });
  }
}

// Feridas primeiro, depois a agenda mais antiga.
export function proximaPendente(ctx: Contexto, uid: number, topicoId: string): LinhaRevisao | undefined {
  return um<LinhaRevisao>(ctx.db, `SELECT id, topico_id, tipo, etapa, vence_em FROM revisao
    WHERE usuario_id = :uid AND topico_id = :t AND feita_em IS NULL AND vence_em <= :agora
    ORDER BY tipo = 'ferida' DESC, vence_em LIMIT 1`, { uid, t: topicoId, agora: ctx.agora().toISOString() });
}

export function contarPendentes(ctx: Contexto, uid: number): number {
  return um<{ n: number }>(ctx.db, `SELECT COUNT(DISTINCT topico_id) AS n FROM revisao WHERE usuario_id = :uid AND feita_em IS NULL AND vence_em <= :agora`, {
    uid, agora: ctx.agora().toISOString(),
  })?.n ?? 0;
}

export function demaisPendentes(ctx: Contexto, uid: number): boolean {
  return contarPendentes(ctx, uid) > MAX_PENDENTES;
}

export function topicosComFantasma(ctx: Contexto, uid: number): Set<string> {
  return new Set(
    todos<{ topico_id: string }>(ctx.db, `SELECT DISTINCT topico_id FROM revisao WHERE usuario_id = :uid AND feita_em IS NULL AND vence_em <= :agora`, {
      uid, agora: ctx.agora().toISOString(),
    }).map((r) => r.topico_id),
  );
}

export function feridasAbertas(ctx: Contexto, uid: number, moduloId: string): number {
  return um<{ n: number }>(ctx.db, `SELECT COUNT(*) AS n FROM revisao r JOIN topico t ON t.id = r.topico_id
    WHERE r.usuario_id = :uid AND r.tipo = 'ferida' AND r.feita_em IS NULL AND t.modulo_id = :m`, { uid, m: moduloId })?.n ?? 0;
}

export function listar(ctx: Contexto, uid: number) {
  const agora = ctx.agora();
  const linhas = todos<LinhaRevisao & { nome: string; modulo_id: string }>(ctx.db, `SELECT r.id, r.topico_id, r.tipo, r.etapa, r.vence_em, t.nome, t.modulo_id
    FROM revisao r JOIN topico t ON t.id = r.topico_id
    WHERE r.usuario_id = :uid AND r.feita_em IS NULL ORDER BY r.tipo = 'ferida' DESC, r.vence_em`, { uid });
  const hoje = linhas.filter((r) => r.vence_em <= agora.toISOString());
  const vistos = new Set<string>();
  return {
    hoje: hoje
      .filter((r) => (vistos.has(r.topico_id) ? false : (vistos.add(r.topico_id), true)))
      .map((r) => ({
        topicoId: r.topico_id, nome: r.nome, moduloId: r.modulo_id, tipo: r.tipo, etapa: r.etapa,
        atrasoDias: Math.max(0, Math.floor((agora.getTime() - new Date(r.vence_em).getTime()) / DIA_MS)),
      })),
    proximos: linhas.filter((r) => r.vence_em > agora.toISOString()).slice(0, 10).map((r) => ({ topicoId: r.topico_id, nome: r.nome, etapa: r.etapa, venceEm: r.vence_em })),
  };
}
