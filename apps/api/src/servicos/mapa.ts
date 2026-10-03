import {
  dependenciasDosTopicos,
  limitarAdaptacao,
  perfuracao,
  poderDaFase,
  requisitoAtendido,
  topicoDisponivel,
} from '@forja/regras';
import { todos, um } from '../db';
import type { Contexto } from '../contexto';
import { naoEncontrado } from '../erros';

export interface LinhaModulo {
  id: string;
  ato_id: string;
  nome: string;
  missao: string | null;
  horas: number;
  trilha: string;
  ordem: number;
  requer: string;
  horas_antes: number;
  questoes_chefe: number;
}

export interface LinhaTopico {
  id: string;
  modulo_id: string;
  nome: string;
  ordem: number;
  tipo: 'comum' | 'elite';
  horas: number;
  minimo_seg: number;
  depois_de: string | null;
  objetivos: string;
  roteiro_md: string | null;
}

export type EstadoModulo = 'bloqueado' | 'em_preparo' | 'disponivel' | 'em_andamento' | 'vencido';
export type EstadoTopico = 'bloqueado' | 'disponivel' | 'em_estudo' | 'pronto' | 'derrotado';

export function revisoesJogaveis(ctx: Contexto): string[] {
  return ctx.config.aceitarRascunho ? ['revisada', 'rascunho'] : ['revisada'];
}

function vencidos(ctx: Contexto, uid: number): Set<string> {
  return new Set(
    todos<{ modulo_id: string }>(ctx.db, 'SELECT modulo_id FROM progresso_modulo WHERE usuario_id = :uid AND vencido_em IS NOT NULL', { uid }).map(
      (r) => r.modulo_id,
    ),
  );
}

// Um módulo só é jogável quando todo tópico tem questões suficientes.
function modulosJogaveis(ctx: Contexto): Set<string> {
  const revs = JSON.stringify(revisoesJogaveis(ctx));
  const linhas = todos<{ modulo_id: string; faltando: number }>(
    ctx.db,
    `SELECT t.modulo_id, SUM(CASE WHEN (SELECT COUNT(*) FROM questao q WHERE q.topico_id = t.id
        AND q.revisao IN (SELECT value FROM json_each(:revs))) < :min THEN 1 ELSE 0 END) AS faltando
     FROM topico t WHERE t.situacao = 'ativo' GROUP BY t.modulo_id`,
    { revs, min: ctx.config.minQuestoesPorTopico },
  );
  return new Set(linhas.filter((l) => l.faltando === 0).map((l) => l.modulo_id));
}

export function adaptacaoDe(ctx: Contexto, uid: number, alvo: string): number {
  const r = um<{ nivel: number }>(ctx.db, 'SELECT nivel FROM adaptacao WHERE usuario_id = :uid AND alvo_id = :alvo', { uid, alvo });
  return limitarAdaptacao(r?.nivel ?? 0);
}

export function mapa(ctx: Contexto, uid: number) {
  const atos = todos<{ id: string; nome: string; regiao: string; lema: string; horas: number; ordem: number }>(
    ctx.db,
    'SELECT * FROM ato ORDER BY ordem',
  );
  const modulos = todos<LinhaModulo>(ctx.db, "SELECT * FROM modulo WHERE situacao = 'ativo' ORDER BY ordem");
  const venc = vencidos(ctx, uid);
  const jogaveis = modulosJogaveis(ctx);
  const comProgresso = new Set(
    todos<{ modulo_id: string }>(
      ctx.db,
      `SELECT DISTINCT t.modulo_id FROM progresso_topico p JOIN topico t ON t.id = p.topico_id
       WHERE p.usuario_id = :uid AND (p.segundos_estudo > 0 OR p.derrotado_em IS NOT NULL)`,
      { uid },
    ).map((r) => r.modulo_id),
  );
  return {
    atos,
    modulos: modulos.map((m) => {
      const requer = JSON.parse(m.requer) as string[];
      let estado: EstadoModulo;
      if (venc.has(m.id)) estado = 'vencido';
      else if (!requisitoAtendido(requer, venc)) estado = 'bloqueado';
      else if (!jogaveis.has(m.id)) estado = 'em_preparo';
      else estado = comProgresso.has(m.id) ? 'em_andamento' : 'disponivel';
      return { id: m.id, ato: m.ato_id, nome: m.nome, horas: m.horas, trilha: m.trilha, ordem: m.ordem, requer, estado };
    }),
  };
}

export function estadoDoModulo(ctx: Contexto, uid: number, moduloId: string): EstadoModulo {
  const m = mapa(ctx, uid).modulos.find((x) => x.id === moduloId);
  if (!m) throw naoEncontrado('Módulo');
  return m.estado;
}

interface LinhaProgresso {
  topico_id: string;
  segundos_estudo: number;
  recuperacao_seg: number;
  nota: string | null;
  derrotado_em: string | null;
  vitorias: number;
  derrotas: number;
}

export function progressoTopico(ctx: Contexto, uid: number, topicoId: string): LinhaProgresso {
  return (
    um<LinhaProgresso>(ctx.db, 'SELECT * FROM progresso_topico WHERE usuario_id = :uid AND topico_id = :t', { uid, t: topicoId }) ?? {
      topico_id: topicoId, segundos_estudo: 0, recuperacao_seg: 0, nota: null, derrotado_em: null, vitorias: 0, derrotas: 0,
    }
  );
}

// Estudo exigido para atacar: o mínimo, ou o alvo de recuperação após derrota.
export function exigidoSeg(t: Pick<LinhaTopico, 'minimo_seg'>, p: Pick<LinhaProgresso, 'recuperacao_seg'>): number {
  return Math.max(t.minimo_seg, p.recuperacao_seg);
}

export function fase(ctx: Contexto, uid: number, moduloId: string) {
  const m = um<LinhaModulo>(ctx.db, "SELECT * FROM modulo WHERE id = :id AND situacao = 'ativo'", { id: moduloId });
  if (!m) throw naoEncontrado('Módulo');
  const estadoModulo = estadoDoModulo(ctx, uid, moduloId);
  const topicos = todos<LinhaTopico>(ctx.db, "SELECT * FROM topico WHERE modulo_id = :id AND situacao = 'ativo' ORDER BY ordem", { id: moduloId });
  const progresso = new Map(
    todos<LinhaProgresso>(
      ctx.db,
      'SELECT p.* FROM progresso_topico p JOIN topico t ON t.id = p.topico_id WHERE p.usuario_id = :uid AND t.modulo_id = :m',
      { uid, m: moduloId },
    ).map((p) => [p.topico_id, p]),
  );
  const deps = dependenciasDosTopicos(topicos.map((t) => ({ id: t.id, depoisDe: t.depois_de ? (JSON.parse(t.depois_de) as string[]) : null })));
  const derrotados = new Set(topicos.filter((t) => progresso.get(t.id)?.derrotado_em).map((t) => t.id));
  const aberto = estadoModulo !== 'bloqueado' && estadoModulo !== 'em_preparo';
  const pm = um<{ vencido_em: string | null; cooldown_ate: string | null }>(
    ctx.db,
    'SELECT vencido_em, cooldown_ate FROM progresso_modulo WHERE usuario_id = :uid AND modulo_id = :m',
    { uid, m: moduloId },
  );
  const adaptChefe = adaptacaoDe(ctx, uid, moduloId);

  return {
    modulo: { id: m.id, ato: m.ato_id, nome: m.nome, missao: m.missao, horas: m.horas, trilha: m.trilha, estado: estadoModulo },
    topicos: topicos.map((t) => {
      const p = progresso.get(t.id) ?? progressoTopico(ctx, uid, t.id);
      const exigido = exigidoSeg(t, p);
      let estado: EstadoTopico;
      if (p.derrotado_em) estado = 'derrotado';
      else if (!aberto || !topicoDisponivel(t.id, deps, derrotados)) estado = 'bloqueado';
      else if (p.segundos_estudo >= exigido) estado = 'pronto';
      else estado = p.segundos_estudo > 0 ? 'em_estudo' : 'disponivel';
      const adapt = adaptacaoDe(ctx, uid, t.id);
      return {
        id: t.id,
        nome: t.nome,
        tipo: t.tipo,
        estado,
        depoisDe: deps.get(t.id) ?? [],
        horas: Math.round(t.horas * 100) / 100,
        minimoSeg: t.minimo_seg,
        exigidoSeg: exigido,
        estudadoSeg: p.segundos_estudo,
        adaptacao: adapt,
        poder: poderDaFase(m.horas_antes, { elite: t.tipo === 'elite', adaptacao: adapt }),
        perfuracao: perfuracao(adapt),
        vitorias: p.vitorias,
        derrotas: p.derrotas,
      };
    }),
    chefe: {
      estado: pm?.vencido_em ? 'vencido' : aberto && derrotados.size === topicos.length ? 'liberado' : 'bloqueado',
      questoes: m.questoes_chefe,
      cooldownAte: pm?.cooldown_ate && pm.cooldown_ate > ctx.agora().toISOString() ? pm.cooldown_ate : null,
      adaptacao: adaptChefe,
      poder: poderDaFase(m.horas_antes, { adaptacao: adaptChefe }),
      perfuracao: perfuracao(adaptChefe),
    },
  };
}

export function topicoDaFase(ctx: Contexto, uid: number, topicoId: string) {
  const t = um<LinhaTopico>(ctx.db, "SELECT * FROM topico WHERE id = :id AND situacao = 'ativo'", { id: topicoId });
  if (!t) throw naoEncontrado('Tópico');
  const f = fase(ctx, uid, t.modulo_id);
  const resumo = f.topicos.find((x) => x.id === topicoId)!;
  return { linha: t, resumo, fase: f };
}
