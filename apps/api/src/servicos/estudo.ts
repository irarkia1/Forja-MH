import { CONFIG } from '@forja/regras';
import { exec, todos, transacao, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp, naoEncontrado } from '../erros';
import { topicoDaFase, progressoTopico } from './mapa';
import { darXp, sincronizarHoras } from './personagem';

// Cronômetro com a autoridade no servidor (D004, ESTUDO-E-REVISAO.md).

interface LinhaSessao {
  id: number;
  usuario_id: number;
  topico_id: string;
  inicio: string;
  fim: string | null;
  ultimo_pulso: string;
  ultimo_visivel: number;
  ultimo_checkin: string;
  pendente_seg: number;
  segundos_validos: number;
  checkins_perdidos: number;
}

const seg = (a: string, b: Date) => (b.getTime() - new Date(a).getTime()) / 1000;

function garantirProgresso(ctx: Contexto, uid: number, topicoId: string): void {
  exec(ctx.db, 'INSERT OR IGNORE INTO progresso_topico (usuario_id, topico_id) VALUES (:uid, :t)', { uid, t: topicoId });
}

function sessao(ctx: Contexto, uid: number, id: number): LinhaSessao {
  const s = um<LinhaSessao>(ctx.db, 'SELECT * FROM sessao_estudo WHERE id = :id AND usuario_id = :uid', { id, uid });
  if (!s) throw naoEncontrado('Sessão');
  return s;
}

export function sessaoAberta(ctx: Contexto, uid: number): LinhaSessao | undefined {
  return um<LinhaSessao>(ctx.db, 'SELECT * FROM sessao_estudo WHERE usuario_id = :uid AND fim IS NULL', { uid });
}

// Soma o trecho desde o último pulso, se o pulso anterior estava visível e
// chegou a tempo. Check-in vencido descarta o que estava pendente.
function avancar(ctx: Contexto, s: LinhaSessao, visivel: boolean, agora: Date): LinhaSessao & { perdeuCheckin: boolean } {
  const { pulsoMaxIntervaloSeg, checkinSeg, checkinPrazoSeg } = CONFIG.estudo;
  const n = { ...s, perdeuCheckin: false };
  const intervalo = seg(s.ultimo_pulso, agora);
  if (s.ultimo_visivel && intervalo > 0 && intervalo <= pulsoMaxIntervaloSeg) {
    n.pendente_seg += Math.round(intervalo * ctx.config.fatorTempo);
  }
  if (seg(s.ultimo_checkin, agora) > checkinSeg + checkinPrazoSeg) {
    n.pendente_seg = 0;
    n.ultimo_checkin = agora.toISOString();
    n.checkins_perdidos += 1;
    n.perdeuCheckin = true;
  }
  n.ultimo_pulso = agora.toISOString();
  n.ultimo_visivel = visivel ? 1 : 0;
  return n;
}

function consolidar(ctx: Contexto, s: LinhaSessao, agora: Date): void {
  if (s.pendente_seg > 0) {
    exec(ctx.db, 'UPDATE progresso_topico SET segundos_estudo = segundos_estudo + :s WHERE usuario_id = :uid AND topico_id = :t', {
      s: s.pendente_seg, uid: s.usuario_id, t: s.topico_id,
    });
  }
  s.segundos_validos += s.pendente_seg;
  s.pendente_seg = 0;
  s.ultimo_checkin = agora.toISOString();
}

function salvar(ctx: Contexto, s: LinhaSessao): void {
  exec(ctx.db, `UPDATE sessao_estudo SET fim=:fim, ultimo_pulso=:up, ultimo_visivel=:uv, ultimo_checkin=:uc, pendente_seg=:pend,
      segundos_validos=:val, checkins_perdidos=:perd WHERE id=:id`, {
    id: s.id, fim: s.fim, up: s.ultimo_pulso, uv: s.ultimo_visivel, uc: s.ultimo_checkin, pend: s.pendente_seg,
    val: s.segundos_validos, perd: s.checkins_perdidos,
  });
}

function vista(ctx: Contexto, s: LinhaSessao, extra: { perdeuCheckin?: boolean } = {}) {
  const p = progressoTopico(ctx, s.usuario_id, s.topico_id);
  return {
    id: s.id,
    topicoId: s.topico_id,
    aberta: !s.fim,
    segundosSessao: s.segundos_validos + s.pendente_seg,
    estudadoSeg: p.segundos_estudo + s.pendente_seg,
    checkinNecessario: !s.fim && seg(s.ultimo_checkin, ctx.agora()) >= CONFIG.estudo.checkinSeg,
    prazoCheckin: new Date(new Date(s.ultimo_checkin).getTime() + (CONFIG.estudo.checkinSeg + CONFIG.estudo.checkinPrazoSeg) * 1000).toISOString(),
    perdeuCheckin: Boolean(extra.perdeuCheckin),
  };
}

export function encerrarAberta(ctx: Contexto, uid: number): void {
  const s = sessaoAberta(ctx, uid);
  if (s) encerrar(ctx, uid, s.id);
}

export function abrir(ctx: Contexto, uid: number, topicoId: string) {
  const { resumo } = topicoDaFase(ctx, uid, topicoId);
  if (resumo.estado === 'bloqueado') throw new ErroApp(409, 'topico_bloqueado', 'Esse inimigo ainda está bloqueado.');
  return transacao(ctx.db, () => {
    const atual = sessaoAberta(ctx, uid);
    if (atual) fecharDentro(ctx, uid, atual);
    garantirProgresso(ctx, uid, topicoId);
    const agora = ctx.agora().toISOString();
    const r = exec(ctx.db, `INSERT INTO sessao_estudo (usuario_id, topico_id, inicio, ultimo_pulso, ultimo_checkin)
      VALUES (:uid, :t, :a, :a, :a)`, { uid, t: topicoId, a: agora });
    return vista(ctx, sessao(ctx, uid, r.lastInsertRowid));
  });
}

export function pulso(ctx: Contexto, uid: number, id: number, visivel: boolean) {
  return transacao(ctx.db, () => {
    const s = sessao(ctx, uid, id);
    if (s.fim) throw new ErroApp(409, 'sessao_encerrada', 'Essa sessão já foi encerrada.');
    const n = avancar(ctx, s, visivel, ctx.agora());
    salvar(ctx, n);
    return vista(ctx, n, { perdeuCheckin: n.perdeuCheckin });
  });
}

export function checkin(ctx: Contexto, uid: number, id: number) {
  return transacao(ctx.db, () => {
    const agora = ctx.agora();
    const s = sessao(ctx, uid, id);
    if (s.fim) throw new ErroApp(409, 'sessao_encerrada', 'Essa sessão já foi encerrada.');
    const n = avancar(ctx, s, true, agora);
    if (!n.perdeuCheckin) consolidar(ctx, n, agora);
    salvar(ctx, n);
    return vista(ctx, n, { perdeuCheckin: n.perdeuCheckin });
  });
}

function fecharDentro(ctx: Contexto, uid: number, s: LinhaSessao) {
  const agora = ctx.agora();
  const n = avancar(ctx, s, false, agora);
  if (!n.perdeuCheckin) consolidar(ctx, n, agora);
  n.fim = agora.toISOString();
  salvar(ctx, n);
  sincronizarHoras(ctx, uid);
  return n;
}

export function encerrar(ctx: Contexto, uid: number, id: number) {
  return transacao(ctx.db, () => {
    const s = sessao(ctx, uid, id);
    if (s.fim) return vista(ctx, s);
    const n = fecharDentro(ctx, uid, s);
    return vista(ctx, n, { perdeuCheckin: n.perdeuCheckin });
  });
}

export function detalheTopico(ctx: Contexto, uid: number, topicoId: string) {
  const { linha, resumo, fase } = topicoDaFase(ctx, uid, topicoId);
  const p = progressoTopico(ctx, uid, topicoId);
  const aberta = sessaoAberta(ctx, uid);
  return {
    ...resumo,
    modulo: { id: fase.modulo.id, nome: fase.modulo.nome },
    objetivos: JSON.parse(linha.objetivos) as { id: string; texto: string }[],
    roteiro: linha.roteiro_md,
    nota: p.nota,
    evidencias: todos<{ id: number; descricao_md: string; link: string | null; criada_em: string }>(
      ctx.db,
      'SELECT id, descricao_md, link, criada_em FROM evidencia WHERE usuario_id = :uid AND topico_id = :t ORDER BY id',
      { uid, t: topicoId },
    ),
    sessao: aberta && aberta.topico_id === topicoId ? vista(ctx, aberta) : null,
  };
}

export function salvarNota(ctx: Contexto, uid: number, topicoId: string, texto: string) {
  const limpo = texto.trim();
  if (limpo.length < CONFIG.estudo.notaMinCaracteres) {
    throw new ErroApp(400, 'nota_curta', `Escreva pelo menos ${CONFIG.estudo.notaMinCaracteres} caracteres (3 a 5 frases com suas palavras).`);
  }
  topicoDaFase(ctx, uid, topicoId);
  return transacao(ctx.db, () => {
    garantirProgresso(ctx, uid, topicoId);
    const primeira = !progressoTopico(ctx, uid, topicoId).nota;
    exec(ctx.db, 'UPDATE progresso_topico SET nota = :n, nota_em = :em WHERE usuario_id = :uid AND topico_id = :t', {
      n: limpo, em: ctx.agora().toISOString(), uid, t: topicoId,
    });
    return { ganho: primeira ? darXp(ctx, uid, CONFIG.xp.nota, 'nota') : null };
  });
}

export function adicionarEvidencia(ctx: Contexto, uid: number, topicoId: string, descricao: string, link: string | null) {
  if (descricao.trim().length < 40) throw new ErroApp(400, 'evidencia_curta', 'Descreva o que fez, o que mediu e o que deu diferente (pelo menos 40 caracteres).');
  if (link && !/^https?:\/\//i.test(link)) throw new ErroApp(400, 'link_invalido', 'O link precisa começar com http:// ou https://');
  topicoDaFase(ctx, uid, topicoId);
  return transacao(ctx.db, () => {
    const ja = um<{ n: number }>(ctx.db, 'SELECT COUNT(*) AS n FROM evidencia WHERE usuario_id = :uid AND topico_id = :t', { uid, t: topicoId });
    exec(ctx.db, 'INSERT INTO evidencia (usuario_id, topico_id, descricao_md, link, criada_em) VALUES (:uid, :t, :d, :l, :em)', {
      uid, t: topicoId, d: descricao.trim(), l: link, em: ctx.agora().toISOString(),
    });
    return { ganho: ja?.n ? null : darXp(ctx, uid, CONFIG.xp.evidencia, 'evidencia') };
  });
}
