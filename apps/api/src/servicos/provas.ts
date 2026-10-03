import {
  CONFIG,
  danoDoGolpe,
  defesaDePreparo,
  defesaTotal,
  embaralhar,
  fraqueza,
  limitarAdaptacao,
  perfuracao,
  poderDaFase,
  questoesDoChefe,
  registrar,
  resultadoFinal,
  sortearChefe,
  sortearCombate,
  vidaDeBatalha,
  vidaMaxima,
  xpVitoriaChefe,
  xpVitoriaInimigo,
  type Desempenho,
  type QuestaoPool,
} from '@forja/regras';
import { exec, todos, transacao, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp, naoEncontrado } from '../erros';
import { encerrarAberta } from './estudo';
import { adaptacaoDe, fase, revisoesJogaveis, topicoDaFase, type LinhaModulo } from './mapa';
import { darXp, evento, nivelAtual, type Ganho } from './personagem';

type Tipo = 'combate' | 'chefe';

interface ItemPlano {
  id: string;
  versao: number;
  perm?: number[]; // perm[posição na tela] = índice original da alternativa
}

interface Plano {
  tipo: Tipo;
  alvoNome: string;
  moduloId: string;
  questoes: ItemPlano[];
  poder: number;
  vidaMax: number;
  defesa: number;
  perfuracao: number;
  adaptacao: number;
  revanche: boolean;
  piso: number;
  horasTopico?: number;
  elite?: boolean;
  trilha: string;
}

interface Estado {
  vida: number;
  proxima: number;
  acertos: number;
}

interface LinhaTentativa {
  id: number;
  usuario_id: number;
  tipo: Tipo;
  alvo_id: string;
  revanche: number;
  plano: string;
  estado: string;
  inicio: string;
  resultado: string;
  total: number;
}

interface LinhaQuestao {
  id: string;
  topico_id: string;
  objetivo_id: string;
  tipo: 'unica' | 'multipla' | 'vf' | 'numerica';
  enunciado_md: string;
  dados: string;
  gabarito: string;
  explicacao_md: string;
  fonte: string;
  dificuldade: number;
  revisao: string;
  versao: number;
}

// ---------------------------------------------------------------------------
// Utilidades

function inicioDoDia(agora: Date, fuso: string): Date {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(agora)
    .reduce<Record<string, string>>((o, p) => ((o[p.type] = p.value), o), {});
  const decorrido = (Number(partes.hour) * 3600 + Number(partes.minute) * 60 + Number(partes.second)) * 1000;
  return new Date(agora.getTime() - decorrido - agora.getMilliseconds());
}

function fusoDo(ctx: Contexto, uid: number): string {
  return um<{ fuso: string }>(ctx.db, 'SELECT fuso FROM usuario WHERE id = :uid', { uid })?.fuso ?? 'America/Sao_Paulo';
}

function pool(ctx: Contexto, topicoIds: string[]): QuestaoPool[] {
  return todos<{ id: string; topico_id: string; objetivo_id: string; dificuldade: number }>(
    ctx.db,
    `SELECT id, topico_id, objetivo_id, dificuldade FROM questao
     WHERE topico_id IN (SELECT value FROM json_each(:t)) AND revisao IN (SELECT value FROM json_each(:r))`,
    { t: JSON.stringify(topicoIds), r: JSON.stringify(revisoesJogaveis(ctx)) },
  ).map((q) => ({ id: q.id, topicoId: q.topico_id, objetivoId: q.objetivo_id, dificuldade: q.dificuldade }));
}

function vistasRecentes(ctx: Contexto, uid: number, alvoId: string, ultimas = 3): Set<string> {
  return new Set(
    todos<{ questao_id: string }>(
      ctx.db,
      `SELECT r.questao_id FROM resposta r WHERE r.tentativa_id IN (
         SELECT id FROM tentativa WHERE usuario_id = :uid AND alvo_id = :alvo ORDER BY id DESC LIMIT :n)`,
      { uid, alvo: alvoId, n: ultimas },
    ).map((r) => r.questao_id),
  );
}

function desempenhos(ctx: Contexto, uid: number, escopo: 'topico' | 'objetivo', prefixo: string): Map<string, Desempenho> {
  return new Map(
    todos<{ ref_id: string; erros_pond: number; respostas_pond: number; atualizado_em: string }>(
      ctx.db,
      'SELECT * FROM desempenho WHERE usuario_id = :uid AND escopo = :e AND ref_id LIKE :p',
      { uid, e: escopo, p: `${prefixo}%` },
    ).map((d) => [d.ref_id, { errosPond: d.erros_pond, respostasPond: d.respostas_pond, atualizadoEm: new Date(d.atualizado_em) }]),
  );
}

function gravarDesempenho(ctx: Contexto, uid: number, escopo: 'topico' | 'objetivo', ref: string, correta: boolean): void {
  const atual = desempenhos(ctx, uid, escopo, ref).get(ref);
  const d = registrar(atual, correta, ctx.agora());
  exec(ctx.db, `INSERT INTO desempenho (usuario_id, escopo, ref_id, erros_pond, respostas_pond, atualizado_em)
    VALUES (:uid, :e, :r, :er, :rp, :em)
    ON CONFLICT(usuario_id, escopo, ref_id) DO UPDATE SET erros_pond=excluded.erros_pond, respostas_pond=excluded.respostas_pond, atualizado_em=excluded.atualizado_em`, {
    uid, e: escopo, r: ref, er: d.errosPond, rp: d.respostasPond, em: d.atualizadoEm.toISOString(),
  });
}

function mudarAdaptacao(ctx: Contexto, uid: number, alvo: string, nivel: number): void {
  exec(ctx.db, `INSERT INTO adaptacao (usuario_id, alvo_id, nivel, atualizado_em) VALUES (:uid, :a, :n, :em)
    ON CONFLICT(usuario_id, alvo_id) DO UPDATE SET nivel=excluded.nivel, atualizado_em=excluded.atualizado_em`, {
    uid, a: alvo, n: limitarAdaptacao(nivel), em: ctx.agora().toISOString(),
  });
}

function questao(ctx: Contexto, id: string): LinhaQuestao {
  const q = um<LinhaQuestao>(ctx.db, 'SELECT * FROM questao WHERE id = :id', { id });
  if (!q) throw naoEncontrado('Questão');
  return q;
}

function montarItem(ctx: Contexto, q: QuestaoPool): ItemPlano {
  const l = questao(ctx, q.id);
  const dados = JSON.parse(l.dados) as { alternativas?: string[] };
  const item: ItemPlano = { id: l.id, versao: l.versao };
  if (dados.alternativas) item.perm = embaralhar(dados.alternativas.map((_, i) => i), ctx.rng);
  return item;
}

// O que vai para a tela: nunca gabarito nem explicação (D004).
function vistaQuestao(ctx: Contexto, plano: Plano, ordem: number) {
  const item = plano.questoes[ordem]!;
  const q = questao(ctx, item.id);
  const dados = JSON.parse(q.dados) as { alternativas?: string[]; unidade?: string };
  return {
    ordem,
    total: plano.questoes.length,
    id: q.id,
    tipo: q.tipo,
    enunciado: q.enunciado_md,
    alternativas: item.perm && dados.alternativas ? item.perm.map((i) => dados.alternativas![i]!) : undefined,
    unidade: dados.unidade,
    dificuldade: q.dificuldade,
    rascunho: q.revisao !== 'revisada',
  };
}

type RespostaEnviada = number | number[] | boolean | string;

function corrigir(q: LinhaQuestao, item: ItemPlano, r: RespostaEnviada): { correta: boolean; gabaritoTela: unknown } {
  const g = JSON.parse(q.gabarito) as unknown;
  const naTela = (orig: number) => item.perm!.indexOf(orig);
  switch (q.tipo) {
    case 'unica': {
      const certo = naTela(g as number);
      return { correta: typeof r === 'number' && r === certo, gabaritoTela: certo };
    }
    case 'multipla': {
      const certos = (g as number[]).map(naTela).sort((a, b) => a - b);
      const dado = Array.isArray(r) ? [...new Set(r)].sort((a, b) => a - b) : [];
      return { correta: dado.length === certos.length && dado.every((x, i) => x === certos[i]), gabaritoTela: certos };
    }
    case 'vf':
      return { correta: typeof r === 'boolean' && r === g, gabaritoTela: g };
    case 'numerica': {
      const { valor, tolerancia } = g as { valor: number; tolerancia: number };
      const n = typeof r === 'number' ? r : Number(String(r).replace(/\s/g, '').replace(',', '.'));
      const margem = valor === 0 ? 1e-9 : Math.abs(valor) * (tolerancia ?? 0.01);
      return { correta: Number.isFinite(n) && Math.abs(n - valor) <= margem + 1e-12, gabaritoTela: g };
    }
  }
}

// ---------------------------------------------------------------------------
// Iniciar

export function iniciar(ctx: Contexto, uid: number, tipo: Tipo, alvoId: string) {
  const emCurso = um<{ id: number }>(ctx.db, "SELECT id FROM tentativa WHERE usuario_id = :uid AND resultado = 'em_curso'", { uid });
  if (emCurso) throw new ErroApp(409, 'prova_em_curso', 'Você já tem uma luta em andamento.', { tentativaId: emCurso.id });
  encerrarAberta(ctx, uid); // estudo encerra ao atacar
  const plano = tipo === 'combate' ? planejarCombate(ctx, uid, alvoId) : planejarChefe(ctx, uid, alvoId);
  return transacao(ctx.db, () => {
    const estado: Estado = { vida: plano.vidaMax, proxima: 0, acertos: 0 };
    const r = exec(ctx.db, `INSERT INTO tentativa (usuario_id, tipo, alvo_id, revanche, variante_id, plano, estado, inicio, total)
      VALUES (:uid, :tipo, :alvo, :rev, :var, :plano, :estado, :inicio, :total)`, {
      uid, tipo, alvo: alvoId, rev: plano.revanche, var: tipo === 'chefe' ? 'guardiao' : null,
      plano: JSON.stringify(plano), estado: JSON.stringify(estado), inicio: ctx.agora().toISOString(), total: plano.questoes.length,
    });
    return { tentativaId: r.lastInsertRowid, ...publicoDoPlano(plano), vida: estado.vida, questao: vistaQuestao(ctx, plano, 0) };
  });
}

function publicoDoPlano(p: Plano) {
  return {
    tipo: p.tipo, alvoNome: p.alvoNome, moduloId: p.moduloId, trilha: p.trilha, elite: Boolean(p.elite), total: p.questoes.length, poder: p.poder, vidaMax: p.vidaMax,
    defesa: p.defesa, perfuracao: p.perfuracao, adaptacao: p.adaptacao, revanche: p.revanche, piso: p.piso,
    variante: p.tipo === 'chefe' ? { id: 'guardiao', nome: 'O Guardião', regra: 'Prova direta. Chegue vivo ao fim com pelo menos 60% de acerto.' } : null,
  };
}

function planejarCombate(ctx: Contexto, uid: number, topicoId: string): Plano {
  const { linha, resumo, fase: f } = topicoDaFase(ctx, uid, topicoId);
  const revanche = resumo.estado === 'derrotado';
  if (resumo.estado === 'bloqueado') throw new ErroApp(409, 'topico_bloqueado', 'Esse inimigo ainda está bloqueado.');
  if (!revanche) {
    if (resumo.estudadoSeg < resumo.exigidoSeg) throw new ErroApp(409, 'estudo_insuficiente', 'O inimigo ainda está em guarda: termine o tempo de estudo.');
    const p = um<{ nota: string | null }>(ctx.db, 'SELECT nota FROM progresso_topico WHERE usuario_id = :uid AND topico_id = :t', { uid, t: topicoId });
    if (!p?.nota) throw new ErroApp(409, 'sem_nota', 'Escreva a nota pessoal antes de atacar.');
    if (linha.tipo === 'elite') {
      const ev = um<{ n: number }>(ctx.db, 'SELECT COUNT(*) AS n FROM evidencia WHERE usuario_id = :uid AND topico_id = :t', { uid, t: topicoId });
      if (!ev?.n) throw new ErroApp(409, 'sem_evidencia', 'Inimigo de elite: anexe a evidência do laboratório antes de atacar.');
    }
  } else {
    const desde = inicioDoDia(ctx.agora(), fusoDo(ctx, uid)).toISOString();
    const hoje = um<{ n: number }>(ctx.db, `SELECT COUNT(*) AS n FROM tentativa WHERE usuario_id = :uid AND alvo_id = :t
      AND tipo = 'combate' AND revanche = 1 AND inicio >= :desde`, { uid, t: topicoId, desde });
    if ((hoje?.n ?? 0) >= CONFIG.xp.revancheInimigoPorDia) throw new ErroApp(409, 'revanche_hoje', 'Você já fez a revanche deste inimigo hoje. Volte amanhã.');
  }
  const m = um<LinhaModulo>(ctx.db, 'SELECT * FROM modulo WHERE id = :id', { id: f.modulo.id })!;
  const adaptacao = revanche ? 0 : adaptacaoDe(ctx, uid, topicoId);
  const obj = desempenhos(ctx, uid, 'objetivo', `${topicoId}.`);
  const qs = sortearCombate({
    pool: pool(ctx, [topicoId]),
    vistasRecentes: vistasRecentes(ctx, uid, topicoId),
    fraquezaObjetivo: new Map([...obj].map(([k, d]) => [k, fraqueza(d)])),
    objetivosComErro: new Set([...obj].filter(([, d]) => d.errosPond > 0.05).map(([k]) => k)),
    adaptacao,
    rng: ctx.rng,
  });
  if (qs.length < CONFIG.combate.questoes) throw new ErroApp(409, 'sem_questoes', 'Este inimigo ainda não tem questões suficientes.');
  return {
    tipo: 'combate',
    alvoNome: linha.nome,
    moduloId: m.id,
    questoes: qs.map((q) => montarItem(ctx, q)),
    poder: poderDaFase(m.horas_antes, { elite: linha.tipo === 'elite', adaptacao }),
    vidaMax: vidaMaxima(nivelAtual(ctx, uid)),
    defesa: defesaTotal(0, defesaDePreparo(resumo.estudadoSeg, resumo.minimoSeg)),
    perfuracao: perfuracao(adaptacao),
    adaptacao,
    revanche,
    piso: 1 / CONFIG.combate.questoes,
    horasTopico: linha.horas,
    elite: linha.tipo === 'elite',
    trilha: m.trilha,
  };
}

function planejarChefe(ctx: Contexto, uid: number, moduloId: string): Plano {
  const f = fase(ctx, uid, moduloId);
  if (f.chefe.estado === 'bloqueado') throw new ErroApp(409, 'chefe_bloqueado', 'Derrote todos os inimigos da fase para enfrentar o chefe.');
  if (f.chefe.cooldownAte) throw new ErroApp(409, 'chefe_cooldown', 'O chefe está se recuperando da última luta.', { ate: f.chefe.cooldownAte });
  const revanche = f.chefe.estado === 'vencido';
  if (revanche) {
    const ultima = um<{ inicio: string }>(ctx.db, `SELECT inicio FROM tentativa WHERE usuario_id = :uid AND alvo_id = :m AND tipo = 'chefe'
      AND revanche = 1 ORDER BY id DESC LIMIT 1`, { uid, m: moduloId });
    const libera = ultima ? new Date(new Date(ultima.inicio).getTime() + CONFIG.xp.revancheChefeDias * 86_400_000) : null;
    if (libera && libera > ctx.agora()) throw new ErroApp(409, 'revanche_semana', 'A revanche deste chefe libera a cada 7 dias.', { ate: libera.toISOString() });
  }
  const m = um<LinhaModulo>(ctx.db, 'SELECT * FROM modulo WHERE id = :id', { id: moduloId })!;
  const adaptacao = revanche ? 0 : adaptacaoDe(ctx, uid, moduloId);
  const topicoIds = f.topicos.map((t) => t.id);
  const todasQ = pool(ctx, topicoIds);
  const desTop = desempenhos(ctx, uid, 'topico', `${moduloId}.`);
  const desObj = desempenhos(ctx, uid, 'objetivo', `${moduloId}.`);
  const total = Math.min(questoesDoChefe(m.horas), todasQ.length);
  const qs = sortearChefe({
    topicos: f.topicos.map((t) => ({ id: t.id, horas: t.horas, fraqueza: fraqueza(desTop.get(t.id)), pool: todasQ.filter((q) => q.topicoId === t.id) })),
    total,
    adaptacao,
    vistasRecentes: new Set(todos<{ questao_id: string }>(ctx.db, `SELECT r.questao_id FROM resposta r JOIN tentativa t ON t.id = r.tentativa_id
      WHERE t.usuario_id = :uid AND t.alvo_id IN (SELECT value FROM json_each(:ids))`, { uid, ids: JSON.stringify([...topicoIds, moduloId]) }).map((r) => r.questao_id)),
    fraquezaObjetivo: new Map([...desObj].map(([k, d]) => [k, fraqueza(d)])),
    rng: ctx.rng,
  });
  return {
    tipo: 'chefe',
    alvoNome: `O Guardião — ${m.nome}`,
    moduloId,
    questoes: qs.map((q) => montarItem(ctx, q)),
    poder: poderDaFase(m.horas_antes, { adaptacao }),
    vidaMax: vidaDeBatalha(vidaMaxima(nivelAtual(ctx, uid)), qs.length),
    defesa: 0,
    perfuracao: perfuracao(adaptacao),
    adaptacao,
    revanche,
    piso: CONFIG.chefe.piso,
    trilha: m.trilha,
  };
}

// ---------------------------------------------------------------------------
// Responder

function tentativa(ctx: Contexto, uid: number, id: number): LinhaTentativa {
  const t = um<LinhaTentativa>(ctx.db, 'SELECT * FROM tentativa WHERE id = :id AND usuario_id = :uid', { id, uid });
  if (!t) throw naoEncontrado('Luta');
  return t;
}

export function responder(ctx: Contexto, uid: number, id: number, ordem: number, resposta: RespostaEnviada) {
  return transacao(ctx.db, () => {
    const t = tentativa(ctx, uid, id);
    if (t.resultado !== 'em_curso') throw new ErroApp(409, 'luta_encerrada', 'Essa luta já terminou.');
    const plano = JSON.parse(t.plano) as Plano;
    const estado = JSON.parse(t.estado) as Estado;
    if (ordem !== estado.proxima) throw new ErroApp(409, 'ordem_errada', 'Essa questão já foi respondida.', { proxima: estado.proxima });
    const item = plano.questoes[ordem]!;
    const q = questao(ctx, item.id);
    const { correta, gabaritoTela } = corrigir(q, item, resposta);
    const agora = ctx.agora().toISOString();
    exec(ctx.db, `INSERT INTO resposta (tentativa_id, ordem, questao_id, questao_versao, resposta, correta, em)
      VALUES (:t, :o, :q, :v, :r, :c, :em)`, { t: id, o: ordem, q: q.id, v: item.versao, r: JSON.stringify(resposta), c: correta, em: agora });
    gravarDesempenho(ctx, uid, 'topico', q.topico_id, correta);
    gravarDesempenho(ctx, uid, 'objetivo', q.objetivo_id, correta);

    let golpe: { dado: number; dano: number; vidaAntes: number; vida: number } | null = null;
    if (correta) estado.acertos += 1;
    else {
      const dado = ctx.dado();
      const dano = danoDoGolpe({ dado, poder: plano.poder, defesa: plano.defesa, perfuracao: plano.perfuracao });
      const vidaAntes = estado.vida;
      estado.vida = Math.max(0, Math.round((estado.vida - dano) * 10) / 10);
      golpe = { dado, dano, vidaAntes, vida: estado.vida };
      exec(ctx.db, `INSERT INTO golpe (tentativa_id, ordem, dado, poder, defesa, perfuracao, dano, vida_depois)
        VALUES (:t, :o, :d, :p, :def, :perf, :dano, :v)`, {
        t: id, o: ordem, d: dado, p: plano.poder, def: plano.defesa, perf: plano.perfuracao, dano, v: estado.vida,
      });
    }
    estado.proxima += 1;
    exec(ctx.db, 'UPDATE tentativa SET estado = :e, acertos = :a WHERE id = :id', { e: JSON.stringify(estado), a: estado.acertos, id });

    const acabou = estado.vida <= 0 || estado.proxima >= plano.questoes.length;
    return {
      correta,
      gabarito: gabaritoTela,
      explicacao: q.explicacao_md,
      fonte: q.fonte,
      golpe,
      vida: estado.vida,
      vidaMax: plano.vidaMax,
      acertos: estado.acertos,
      fim: acabou ? finalizar(ctx, uid, t, plano, estado) : null,
      proxima: acabou ? null : vistaQuestao(ctx, plano, estado.proxima),
    };
  });
}

function finalizar(ctx: Contexto, uid: number, t: LinhaTentativa, plano: Plano, estado: Estado, desistiu = false) {
  const respondidas = estado.proxima;
  const r = desistiu
    ? { resultado: 'derrota' as const, motivo: 'fuga' as const }
    : resultadoFinal({ tipo: plano.tipo, acertos: estado.acertos, total: plano.questoes.length, vida: estado.vida });
  const vitoria = r.resultado === 'vitoria';
  const agora = ctx.agora();
  let xp = 0;
  let critico = false;

  if (plano.tipo === 'combate') {
    critico = vitoria && estado.acertos === plano.questoes.length;
    if (vitoria) {
      xp = xpVitoriaInimigo(plano.horasTopico ?? 0, critico) * (plano.revanche ? CONFIG.xp.revancheInimigo : 1);
      if (!plano.revanche) {
        exec(ctx.db, `UPDATE progresso_topico SET derrotado_em = :em, vitorias = vitorias + 1 WHERE usuario_id = :uid AND topico_id = :t`, {
          em: agora.toISOString(), uid, t: t.alvo_id,
        });
        mudarAdaptacao(ctx, uid, t.alvo_id, 0);
      }
    } else if (!plano.revanche) {
      // Derrota: expulso da fase; precisa estudar +20% do mínimo; inimigo aprende (D007, D015).
      const linha = um<{ minimo_seg: number }>(ctx.db, 'SELECT minimo_seg FROM topico WHERE id = :t', { t: t.alvo_id })!;
      const p = um<{ segundos_estudo: number; recuperacao_seg: number }>(ctx.db, 'SELECT segundos_estudo, recuperacao_seg FROM progresso_topico WHERE usuario_id = :uid AND topico_id = :t', { uid, t: t.alvo_id })!;
      const alvo = Math.max(p.segundos_estudo, linha.minimo_seg, p.recuperacao_seg) + Math.round(linha.minimo_seg * CONFIG.estudo.recuperacaoFracao);
      exec(ctx.db, 'UPDATE progresso_topico SET derrotas = derrotas + 1, recuperacao_seg = :alvo WHERE usuario_id = :uid AND topico_id = :t', { alvo, uid, t: t.alvo_id });
      mudarAdaptacao(ctx, uid, t.alvo_id, plano.adaptacao + 1);
    }
  } else {
    exec(ctx.db, 'INSERT OR IGNORE INTO progresso_modulo (usuario_id, modulo_id) VALUES (:uid, :m)', { uid, m: t.alvo_id });
    if (vitoria) {
      xp = xpVitoriaChefe(plano.questoes.length, estado.acertos) * (plano.revanche ? CONFIG.xp.revancheChefe : 1);
      if (!plano.revanche) {
        exec(ctx.db, `UPDATE progresso_modulo SET vencido_em = :em, cooldown_ate = NULL,
          melhor_acerto = MAX(COALESCE(melhor_acerto, 0), :a) WHERE usuario_id = :uid AND modulo_id = :m`, {
          em: agora.toISOString(), a: estado.acertos / plano.questoes.length, uid, m: t.alvo_id,
        });
        mudarAdaptacao(ctx, uid, t.alvo_id, 0);
      }
    } else if (!plano.revanche) {
      exec(ctx.db, 'UPDATE progresso_modulo SET cooldown_ate = :ate WHERE usuario_id = :uid AND modulo_id = :m', {
        ate: new Date(agora.getTime() + CONFIG.chefe.cooldownHoras * 3_600_000).toISOString(), uid, m: t.alvo_id,
      });
      mudarAdaptacao(ctx, uid, t.alvo_id, plano.adaptacao + 1);
    }
  }

  const ganho: Ganho = darXp(ctx, uid, xp, `${plano.tipo}${plano.revanche ? '_revanche' : ''}`);
  exec(ctx.db, 'UPDATE tentativa SET resultado = :r, motivo = :m, fim = :f, xp_ganho = :xp WHERE id = :id', {
    r: r.resultado, m: r.motivo ?? null, f: agora.toISOString(), xp: ganho.xp, id: t.id,
  });
  evento(ctx, uid, plano.tipo, { alvo: t.alvo_id, resultado: r.resultado, acertos: estado.acertos, total: plano.questoes.length, revanche: plano.revanche });
  return {
    resultado: r.resultado,
    motivo: r.motivo ?? null,
    critico,
    acertos: estado.acertos,
    respondidas,
    total: plano.questoes.length,
    revanche: plano.revanche,
    ganho,
    adaptacaoNova: !vitoria && !plano.revanche ? limitarAdaptacao(plano.adaptacao + 1) : vitoria && !plano.revanche ? 0 : plano.adaptacao,
  };
}

export function desistir(ctx: Contexto, uid: number, id: number) {
  return transacao(ctx.db, () => {
    const t = tentativa(ctx, uid, id);
    if (t.resultado !== 'em_curso') throw new ErroApp(409, 'luta_encerrada', 'Essa luta já terminou.');
    return finalizar(ctx, uid, t, JSON.parse(t.plano) as Plano, JSON.parse(t.estado) as Estado, true);
  });
}

export function emCurso(ctx: Contexto, uid: number) {
  const t = um<LinhaTentativa>(ctx.db, "SELECT * FROM tentativa WHERE usuario_id = :uid AND resultado = 'em_curso'", { uid });
  if (!t) return null;
  const plano = JSON.parse(t.plano) as Plano;
  const estado = JSON.parse(t.estado) as Estado;
  return { tentativaId: t.id, alvoId: t.alvo_id, ...publicoDoPlano(plano), vida: estado.vida, acertos: estado.acertos, questao: vistaQuestao(ctx, plano, estado.proxima) };
}
