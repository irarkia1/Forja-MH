import { CONFIG, limitarAdaptacao } from '@forja/regras';
import { exec, todos, transacao, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp, naoEncontrado } from '../erros';
import { DIA_MS } from '../tempo';
import { agendar } from './fantasmas';
import { darXp, sincronizarHoras } from './personagem';

// Ferramentas de teste. Só para contas com papel 'admin' e só mexem na
// própria conta: o progresso de outros usuários nunca é tocado.

export function exigirAdmin(ctx: Contexto, uid: number): void {
  const u = um<{ papel: string }>(ctx.db, 'SELECT papel FROM usuario WHERE id = :uid', { uid });
  if (u?.papel !== 'admin') throw new ErroApp(403, 'so_admin', 'Ferramenta só para contas admin.');
}

function topico(ctx: Contexto, id: string) {
  const t = um<{ id: string; modulo_id: string }>(ctx.db, 'SELECT id, modulo_id FROM topico WHERE id = :id', { id });
  if (!t) throw naoEncontrado('Tópico');
  return t;
}

const NOTA_ADMIN = 'Nota gerada pelo modo admin para teste. Ela existe só para liberar o ataque sem digitar.';

export function adicionarEstudo(ctx: Contexto, uid: number, topicoId: string, horas: number) {
  topico(ctx, topicoId);
  const seg = Math.round(horas * 3600);
  return transacao(ctx.db, () => {
    const agora = ctx.agora().toISOString();
    exec(ctx.db, 'UPDATE sessao_estudo SET fim = :a WHERE usuario_id = :uid AND fim IS NULL', { a: agora, uid });
    exec(ctx.db, `INSERT INTO sessao_estudo (usuario_id, topico_id, inicio, fim, ultimo_pulso, ultimo_checkin, segundos_validos)
      VALUES (:uid, :t, :a, :a, :a, :a, :s)`, { uid, t: topicoId, a: agora, s: seg });
    exec(ctx.db, 'INSERT OR IGNORE INTO progresso_topico (usuario_id, topico_id) VALUES (:uid, :t)', { uid, t: topicoId });
    // Preenche a nota se faltar, para o Atacar liberar direto no teste.
    exec(ctx.db, 'UPDATE progresso_topico SET segundos_estudo = segundos_estudo + :s, nota = COALESCE(nota, :n) WHERE usuario_id = :uid AND topico_id = :t', { s: seg, n: NOTA_ADMIN, uid, t: topicoId });
    return sincronizarHoras(ctx, uid);
  });
}

function vencerTopicoDentro(ctx: Contexto, uid: number, topicoId: string) {
  const agora = ctx.agora().toISOString();
  exec(ctx.db, 'INSERT OR IGNORE INTO progresso_topico (usuario_id, topico_id) VALUES (:uid, :t)', { uid, t: topicoId });
  exec(ctx.db, `UPDATE progresso_topico SET derrotado_em = COALESCE(derrotado_em, :a), nota = COALESCE(nota, :n), vitorias = vitorias + 1
    WHERE usuario_id = :uid AND topico_id = :t`, { a: agora, n: NOTA_ADMIN, uid, t: topicoId });
  exec(ctx.db, 'DELETE FROM adaptacao WHERE usuario_id = :uid AND alvo_id = :t', { uid, t: topicoId });
  const tem = um(ctx.db, `SELECT id FROM revisao WHERE usuario_id = :uid AND topico_id = :t AND tipo = 'agenda' AND feita_em IS NULL`, { uid, t: topicoId });
  if (!tem) agendar(ctx, uid, topicoId, 1, 1);
}

export function vencerTopico(ctx: Contexto, uid: number, topicoId: string) {
  topico(ctx, topicoId);
  transacao(ctx.db, () => vencerTopicoDentro(ctx, uid, topicoId));
  return { ok: true };
}

export function vencerModulo(ctx: Contexto, uid: number, moduloId: string, comChefe: boolean) {
  const ts = todos<{ id: string }>(ctx.db, "SELECT id FROM topico WHERE modulo_id = :m AND situacao = 'ativo'", { m: moduloId });
  if (!ts.length) throw naoEncontrado('Módulo');
  transacao(ctx.db, () => {
    for (const t of ts) vencerTopicoDentro(ctx, uid, t.id);
    if (comChefe) {
      exec(ctx.db, 'INSERT OR IGNORE INTO progresso_modulo (usuario_id, modulo_id) VALUES (:uid, :m)', { uid, m: moduloId });
      exec(ctx.db, 'UPDATE progresso_modulo SET vencido_em = COALESCE(vencido_em, :a), cooldown_ate = NULL WHERE usuario_id = :uid AND modulo_id = :m', {
        a: ctx.agora().toISOString(), uid, m: moduloId,
      });
    }
  });
  return { topicos: ts.length, chefe: comChefe };
}

// "Viagem no tempo": em vez de mexer no relógio, puxa para trás as datas
// que dependem dele (fantasmas, descanso do chefe, limites de revanche).
export function adiantarDias(ctx: Contexto, uid: number, dias: number) {
  const ms = Math.round(dias * DIA_MS);
  const recuar = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - ms).toISOString() : null);
  transacao(ctx.db, () => {
    for (const r of todos<{ id: number; vence_em: string }>(ctx.db, 'SELECT id, vence_em FROM revisao WHERE usuario_id = :uid AND feita_em IS NULL', { uid })) {
      exec(ctx.db, 'UPDATE revisao SET vence_em = :v WHERE id = :id', { v: recuar(r.vence_em), id: r.id });
    }
    for (const m of todos<{ modulo_id: string; cooldown_ate: string | null }>(ctx.db, 'SELECT modulo_id, cooldown_ate FROM progresso_modulo WHERE usuario_id = :uid', { uid })) {
      exec(ctx.db, 'UPDATE progresso_modulo SET cooldown_ate = :c WHERE usuario_id = :uid AND modulo_id = :m', { c: recuar(m.cooldown_ate), uid, m: m.modulo_id });
    }
    for (const t of todos<{ id: number; inicio: string }>(ctx.db, "SELECT id, inicio FROM tentativa WHERE usuario_id = :uid AND resultado <> 'em_curso'", { uid })) {
      exec(ctx.db, 'UPDATE tentativa SET inicio = :i WHERE id = :id', { i: recuar(t.inicio), id: t.id });
    }
  });
  return { dias };
}

export function ganharXp(ctx: Contexto, uid: number, xp: number) {
  return transacao(ctx.db, () => darXp(ctx, uid, xp, 'admin'));
}

export function definirAdaptacao(ctx: Contexto, uid: number, alvo: string, nivel: number) {
  exec(ctx.db, `INSERT INTO adaptacao (usuario_id, alvo_id, nivel, atualizado_em) VALUES (:uid, :a, :n, :em)
    ON CONFLICT(usuario_id, alvo_id) DO UPDATE SET nivel = excluded.nivel, atualizado_em = excluded.atualizado_em`, {
    uid, a: alvo, n: limitarAdaptacao(nivel), em: ctx.agora().toISOString(),
  });
  return { alvo, nivel: limitarAdaptacao(nivel) };
}

// Resposta certa da questão atual, na ordem em que aparece na tela.
export function gabaritoAtual(ctx: Contexto, uid: number) {
  const t = um<{ plano: string; estado: string }>(ctx.db, "SELECT plano, estado FROM tentativa WHERE usuario_id = :uid AND resultado = 'em_curso'", { uid });
  if (!t) throw new ErroApp(404, 'sem_luta', 'Nenhuma luta em andamento.');
  const plano = JSON.parse(t.plano) as { questoes: { id: string; perm?: number[] }[] };
  const ordem = (JSON.parse(t.estado) as { proxima: number }).proxima;
  const item = plano.questoes[ordem]!;
  const q = um<{ tipo: string; gabarito: string }>(ctx.db, 'SELECT tipo, gabarito FROM questao WHERE id = :id', { id: item.id })!;
  const g = JSON.parse(q.gabarito) as unknown;
  const naTela = (i: number) => item.perm!.indexOf(i);
  const resposta = q.tipo === 'unica' ? naTela(g as number) : q.tipo === 'multipla' ? (g as number[]).map(naTela).sort() : g;
  return { ordem, tipo: q.tipo, resposta };
}

export function zerarProgresso(ctx: Contexto, uid: number) {
  transacao(ctx.db, () => {
    const ids = todos<{ id: number }>(ctx.db, 'SELECT id FROM tentativa WHERE usuario_id = :uid', { uid }).map((t) => t.id);
    const lista = JSON.stringify(ids);
    exec(ctx.db, 'DELETE FROM golpe WHERE tentativa_id IN (SELECT value FROM json_each(:l))', { l: lista });
    exec(ctx.db, 'DELETE FROM resposta WHERE tentativa_id IN (SELECT value FROM json_each(:l))', { l: lista });
    for (const tabela of ['revisao', 'tentativa', 'sessao_estudo', 'progresso_topico', 'progresso_modulo', 'evidencia', 'adaptacao', 'desempenho', 'evento']) {
      exec(ctx.db, `DELETE FROM ${tabela} WHERE usuario_id = :uid`, { uid });
    }
    exec(ctx.db, 'UPDATE personagem SET nivel = 1, faixa = 0, niveis_na_faixa = 0, xp_faixa = 0, xp_total = 0, posicao = NULL WHERE usuario_id = :uid', { uid });
  });
  return { ok: true, vidaBase: CONFIG.personagem.vidaBase };
}
