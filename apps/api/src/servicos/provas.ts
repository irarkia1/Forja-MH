import {
  CONFIG,
  bonusMemoria,
  curaPorAcerto,
  defesaDeSkill,
  esquivaDeSkill,
  horasDeDescanso,
  nv,
  danoDoGolpe,
  etapaEfetiva,
  proximaRevisao,
  regraDaEtapa,
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
import { abrirFerida, agendar, demaisPendentes, feridasAbertas, fusoDo, proximaPendente } from './fantasmas';
import { DIA_MS, inicioDoDia } from '../tempo';
import { adaptacaoDe, fase, revisoesJogaveis, topicoDaFase, type LinhaModulo } from './mapa';
import { darXp, evento, nivelAtual, type Ganho } from './personagem';
import { gastarEnergia, ganharEnergia, niveis as niveisSkill } from './skills';

type Tipo = 'combate' | 'chefe' | 'fantasma';

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
  revisaoId?: number;
  etapa?: number;
  ferida?: boolean;
  minAcertos?: number;
  esquiva?: number;
  sorte?: number;
  cura?: number;
  niveisAtivas?: Record<string, number>;
}

interface Estado {
  vida: number;
  proxima: number;
  acertos: number;
  sorte?: number; // rerrolagens que sobram
  escudo?: number | null; // ordem da questão com escudo armado
  usos?: Record<string, number>;
  cortes?: Record<string, number[]>; // ordem → índices ocultos na tela
  ajudas?: number[]; // ordens com ajuda
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
function vistaQuestao(ctx: Contexto, plano: Plano, ordem: number, estado?: Estado) {
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
    ocultas: estado?.cortes?.[String(ordem)] ?? [],
    escudo: estado?.escudo === ordem,
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
  const plano =
    tipo === 'combate' ? planejarCombate(ctx, uid, alvoId) : tipo === 'chefe' ? planejarChefe(ctx, uid, alvoId) : planejarFantasma(ctx, uid, alvoId);
  return transacao(ctx.db, () => {
    const estado: Estado = { vida: plano.vidaMax, proxima: 0, acertos: 0, sorte: plano.sorte ?? 0, escudo: null, usos: {}, cortes: {}, ajudas: [] };
    const r = exec(ctx.db, `INSERT INTO tentativa (usuario_id, tipo, alvo_id, revanche, variante_id, plano, estado, inicio, total)
      VALUES (:uid, :tipo, :alvo, :rev, :var, :plano, :estado, :inicio, :total)`, {
      uid, tipo, alvo: alvoId, rev: plano.revanche, var: tipo === 'chefe' ? 'guardiao' : null,
      plano: JSON.stringify(plano), estado: JSON.stringify(estado), inicio: ctx.agora().toISOString(), total: plano.questoes.length,
    });
    return { tentativaId: r.lastInsertRowid, ...publicoDoPlano(plano), vida: estado.vida, questao: vistaQuestao(ctx, plano, 0, estado) };
  });
}

function publicoDoPlano(p: Plano) {
  return {
    tipo: p.tipo, alvoNome: p.alvoNome, moduloId: p.moduloId, trilha: p.trilha, elite: Boolean(p.elite), total: p.questoes.length, poder: p.poder, vidaMax: p.vidaMax,
    defesa: p.defesa, perfuracao: p.perfuracao, adaptacao: p.adaptacao, revanche: p.revanche, piso: p.piso,
    fantasma: p.tipo === 'fantasma' ? { etapa: p.etapa ?? 0, ferida: Boolean(p.ferida), minAcertos: p.minAcertos ?? 0 } : null,
    skills: p.tipo === 'fantasma' ? null : { esquiva: p.esquiva ?? 0, sorte: p.sorte ?? 0, cura: p.cura ?? 0, corte: p.niveisAtivas?.corte ?? 0, escudo: p.niveisAtivas?.escudo ?? 0 },
    variante: p.tipo === 'chefe' ? { id: 'guardiao', nome: 'O Guardião', regra: 'Prova direta. Chegue vivo ao fim com pelo menos 60% de acerto.' } : null,
  };
}

function planejarCombate(ctx: Contexto, uid: number, topicoId: string): Plano {
  const { linha, resumo, fase: f } = topicoDaFase(ctx, uid, topicoId);
  const revanche = resumo.estado === 'derrotado';
  if (resumo.estado === 'bloqueado') throw new ErroApp(409, 'topico_bloqueado', 'Esse inimigo ainda está bloqueado.');
  if (!revanche) {
    if (demaisPendentes(ctx, uid)) throw new ErroApp(409, 'fantasmas_demais', 'Fantasmas demais esperando: faça as revisões antes de enfrentar inimigos novos.');
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
  const sk = niveisSkill(ctx, uid);
  return {
    ...efeitosDeSkill(sk, poderDaFase(m.horas_antes, { elite: linha.tipo === 'elite', adaptacao })),
    tipo: 'combate',
    alvoNome: linha.nome,
    moduloId: m.id,
    questoes: qs.map((q) => montarItem(ctx, q)),
    poder: poderDaFase(m.horas_antes, { elite: linha.tipo === 'elite', adaptacao }),
    vidaMax: vidaMaxima(nivelAtual(ctx, uid), nv(sk, 'vitalidade')),
    defesa: defesaTotal(defesaDeSkill(sk), defesaDePreparo(resumo.estudadoSeg, resumo.minimoSeg)),
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
  if (!revanche && feridasAbertas(ctx, uid, moduloId)) {
    throw new ErroApp(409, 'feridas_abertas', 'Cure as feridas da última luta (fantasmas dos temas que você errou) antes de voltar ao chefe.');
  }
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
  const sk = niveisSkill(ctx, uid);
  return {
    ...efeitosDeSkill(sk, poderDaFase(m.horas_antes, { adaptacao })),
    tipo: 'chefe',
    alvoNome: `O Guardião — ${m.nome}`,
    moduloId,
    questoes: qs.map((q) => montarItem(ctx, q)),
    poder: poderDaFase(m.horas_antes, { adaptacao }),
    vidaMax: vidaDeBatalha(vidaMaxima(nivelAtual(ctx, uid), nv(sk, 'vitalidade')), qs.length),
    defesa: defesaTotal(defesaDeSkill(sk), 0),
    perfuracao: perfuracao(adaptacao),
    adaptacao,
    revanche,
    piso: CONFIG.chefe.piso,
    trilha: m.trilha,
  };
}

function efeitosDeSkill(sk: Record<string, number>, poder: number) {
  return {
    esquiva: esquivaDeSkill(sk),
    sorte: nv(sk, 'sorte'),
    cura: curaPorAcerto(sk, poder),
    niveisAtivas: { corte: nv(sk, 'corte'), escudo: nv(sk, 'escudo') },
  };
}

function planejarFantasma(ctx: Contexto, uid: number, topicoId: string): Plano {
  const rev = proximaPendente(ctx, uid, topicoId);
  if (!rev) throw new ErroApp(409, 'sem_fantasma', 'Nenhum fantasma deste inimigo para hoje.');
  const { linha, fase: f } = topicoDaFase(ctx, uid, topicoId);
  const ferida = rev.tipo === 'ferida';
  const etapa = ferida ? 0 : etapaEfetiva(rev.etapa, new Date(rev.vence_em), ctx.agora());
  const regra = regraDaEtapa(etapa);
  const obj = desempenhos(ctx, uid, 'objetivo', `${topicoId}.`);
  const comErro = new Set([...obj].filter(([, d]) => d.errosPond > 0.05).map(([k]) => k));
  // Fantasma mira o objetivo mais fraco, sem dano e sem adaptação.
  const qs = sortearCombate({
    pool: pool(ctx, [topicoId]),
    vistasRecentes: vistasRecentes(ctx, uid, topicoId),
    fraquezaObjetivo: new Map([...obj].map(([k, d]) => [k, fraqueza(d)])),
    objetivosComErro: comErro,
    adaptacao: comErro.size ? 1 : 0,
    rng: ctx.rng,
    quantidade: regra.questoes,
  });
  if (qs.length < regra.questoes) throw new ErroApp(409, 'sem_questoes', 'Este tópico não tem questões suficientes.');
  return {
    tipo: 'fantasma', alvoNome: linha.nome, moduloId: f.modulo.id, questoes: qs.map((q) => montarItem(ctx, q)),
    poder: 0, vidaMax: 1, defesa: 0, perfuracao: 0, adaptacao: 0, revanche: false, piso: regra.minimo / regra.questoes,
    trilha: f.modulo.trilha, revisaoId: rev.id, etapa, ferida, minAcertos: regra.minimo, horasTopico: linha.horas,
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

    let golpe: { dado: number; dano: number; vidaAntes: number; vida: number; esquivou?: boolean; escudo?: boolean; sorte?: number[] } | null = null;
    let cura = 0;
    if (correta) {
      estado.acertos += 1;
      if (plano.cura && plano.tipo !== 'fantasma') {
        const antes = estado.vida;
        estado.vida = Math.min(plano.vidaMax, Math.round((estado.vida + plano.cura) * 10) / 10);
        cura = Math.round((estado.vida - antes) * 10) / 10;
      }
    } else if (plano.tipo !== 'fantasma') {
      const vidaAntes = estado.vida;
      const detalhe: { esquivou?: boolean; escudo?: boolean; sorte?: number[] } = {};
      let dado = ctx.dado();
      // Perfuração também atravessa a esquiva (D015).
      const esquiva = (plano.esquiva ?? 0) * (1 - plano.perfuracao);
      if (estado.escudo === ordem) detalhe.escudo = true;
      else if (esquiva > 0 && ctx.rng() < esquiva) detalhe.esquivou = true;
      else if (dado >= 4 && (estado.sorte ?? 0) > 0) {
        const outro = ctx.dado();
        detalhe.sorte = [dado, outro];
        dado = Math.min(dado, outro);
        estado.sorte = (estado.sorte ?? 0) - 1;
      }
      const dano = detalhe.escudo || detalhe.esquivou ? 0 : danoDoGolpe({ dado, poder: plano.poder, defesa: plano.defesa, perfuracao: plano.perfuracao });
      estado.vida = Math.max(0, Math.round((estado.vida - dano) * 10) / 10);
      golpe = { dado, dano, vidaAntes, vida: estado.vida, ...detalhe };
      exec(ctx.db, `INSERT INTO golpe (tentativa_id, ordem, dado, poder, defesa, perfuracao, dano, vida_depois, detalhe)
        VALUES (:t, :o, :d, :p, :def, :perf, :dano, :v, :det)`, {
        t: id, o: ordem, d: dado, p: plano.poder, def: plano.defesa, perf: plano.perfuracao, dano, v: estado.vida, det: JSON.stringify(detalhe),
      });
    }
    if (estado.escudo === ordem) estado.escudo = null;
    estado.proxima += 1;
    exec(ctx.db, 'UPDATE tentativa SET estado = :e, acertos = :a WHERE id = :id', { e: JSON.stringify(estado), a: estado.acertos, id });

    const acabou = estado.vida <= 0 || estado.proxima >= plano.questoes.length;
    return {
      correta,
      gabarito: gabaritoTela,
      explicacao: q.explicacao_md,
      fonte: q.fonte,
      golpe,
      cura,
      vida: estado.vida,
      vidaMax: plano.vidaMax,
      acertos: estado.acertos,
      fim: acabou ? finalizar(ctx, uid, t, plano, estado) : null,
      proxima: acabou ? null : vistaQuestao(ctx, plano, estado.proxima, estado),
    };
  });
}

function finalizar(ctx: Contexto, uid: number, t: LinhaTentativa, plano: Plano, estado: Estado, desistiu = false) {
  const respondidas = estado.proxima;
  const r = desistiu
    ? { resultado: 'derrota' as const, motivo: 'fuga' as const }
    : plano.tipo === 'fantasma'
      ? estado.acertos >= (plano.minAcertos ?? 0) ? { resultado: 'vitoria' as const } : { resultado: 'derrota' as const, motivo: 'piso' as const }
      : resultadoFinal({ tipo: plano.tipo, acertos: estado.acertos, total: plano.questoes.length, vida: estado.vida });
  const vitoria = r.resultado === 'vitoria';
  const agora = ctx.agora();
  let xp = 0;
  let critico = false;
  let revisao: { passou: boolean; proximaEm: string | null; concluido: boolean; consolidado: boolean } | null = null;

  if (plano.tipo === 'fantasma') {
    const rev = um<{ vence_em: string; tipo: string }>(ctx.db, 'SELECT vence_em, tipo FROM revisao WHERE id = :id', { id: plano.revisaoId! })!;
    exec(ctx.db, 'UPDATE revisao SET feita_em = :em, resultado = :r, tentativa_id = :t WHERE id = :id', {
      em: agora.toISOString(), r: r.resultado, t: t.id, id: plano.revisaoId!,
    });
    let proximaEm: string | null = null;
    let concluido = false;
    let consolidado = false;
    if (plano.ferida) {
      if (!vitoria) abrirFerida(ctx, uid, t.alvo_id); // ferida só fecha curando
    } else {
      const prox = proximaRevisao(plano.etapa ?? 1, vitoria);
      if ('concluido' in prox) {
        concluido = true;
        exec(ctx.db, 'UPDATE progresso_topico SET dominado_em = COALESCE(dominado_em, :em) WHERE usuario_id = :uid AND topico_id = :t', { em: agora.toISOString(), uid, t: t.alvo_id });
      } else proximaEm = agendar(ctx, uid, t.alvo_id, prox.etapa, prox.dias);
      if (vitoria && plano.etapa === 4) {
        consolidado = true;
        exec(ctx.db, 'UPDATE progresso_topico SET consolidado_em = COALESCE(consolidado_em, :em) WHERE usuario_id = :uid AND topico_id = :t', { em: agora.toISOString(), uid, t: t.alvo_id });
      }
    }
    if (vitoria) {
      const noPrazo = agora.getTime() < new Date(rev.vence_em).getTime() + DIA_MS;
      xp = (noPrazo ? CONFIG.xp.fantasmaNoDia : CONFIG.xp.fantasmaAtrasado) * bonusMemoria(niveisSkill(ctx, uid));
      if (noPrazo) ganharEnergia(ctx, uid, CONFIG.energia.fantasma);
    }
    revisao = { passou: vitoria, proximaEm, concluido, consolidado };
  } else if (plano.tipo === 'combate') {
    critico = vitoria && estado.acertos === plano.questoes.length;
    if (vitoria) {
      xp = xpVitoriaInimigo(plano.horasTopico ?? 0, critico) * (plano.revanche ? CONFIG.xp.revancheInimigo : 1);
      if (!plano.revanche) {
        exec(ctx.db, `UPDATE progresso_topico SET derrotado_em = :em, vitorias = vitorias + 1 WHERE usuario_id = :uid AND topico_id = :t`, {
          em: agora.toISOString(), uid, t: t.alvo_id,
        });
        mudarAdaptacao(ctx, uid, t.alvo_id, 0);
        agendar(ctx, uid, t.alvo_id, 1, 1); // primeiro fantasma: amanhã
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
      // Descanso de 48 h só a partir da 2ª derrota seguida (★★) — D020.
      if (plano.adaptacao + 1 >= CONFIG.chefe.cooldownAPartirDeAdaptacao) {
        exec(ctx.db, 'UPDATE progresso_modulo SET cooldown_ate = :ate WHERE usuario_id = :uid AND modulo_id = :m', {
          ate: new Date(agora.getTime() + horasDeDescanso(niveisSkill(ctx, uid)) * 3_600_000).toISOString(), uid, m: t.alvo_id,
        });
      }
      // Feridas: cada tema errado vira fantasma imediato.
      for (const { topico_id } of todos<{ topico_id: string }>(ctx.db, `SELECT DISTINCT q.topico_id FROM resposta r JOIN questao q ON q.id = r.questao_id
        WHERE r.tentativa_id = :t AND r.correta = 0`, { t: t.id })) abrirFerida(ctx, uid, topico_id);
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
    revisao,
    adaptacaoNova: plano.tipo === 'fantasma' ? 0 : !vitoria && !plano.revanche ? limitarAdaptacao(plano.adaptacao + 1) : vitoria && !plano.revanche ? 0 : plano.adaptacao,
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
  return { tentativaId: t.id, alvoId: t.alvo_id, ...publicoDoPlano(plano), vida: estado.vida, acertos: estado.acertos, questao: vistaQuestao(ctx, plano, estado.proxima, estado) };
}

// ---------------------------------------------------------------------------
// Skills ativas: Corte e Escudo. Nunca revelam a resposta; tudo fica registrado.

export function usarSkill(ctx: Contexto, uid: number, id: number, skill: 'corte' | 'escudo', ordem: number) {
  return transacao(ctx.db, () => {
    const t = tentativa(ctx, uid, id);
    if (t.resultado !== 'em_curso') throw new ErroApp(409, 'luta_encerrada', 'Essa luta já terminou.');
    const plano = JSON.parse(t.plano) as Plano;
    const estado = JSON.parse(t.estado) as Estado;
    if (plano.tipo === 'fantasma') throw new ErroApp(409, 'sem_skill_fantasma', 'Fantasmas não aceitam skills: a revisão prova o que ficou.');
    if (ordem !== estado.proxima) throw new ErroApp(409, 'ordem_errada', 'Só dá para usar skill na questão atual.');
    const nivel = plano.niveisAtivas?.[skill] ?? 0;
    if (!nivel) throw new ErroApp(409, 'skill_sem_nivel', 'Você ainda não tem essa skill.');
    estado.usos ??= {};
    estado.cortes ??= {};
    estado.ajudas ??= [];
    const novaAjuda = !estado.ajudas.includes(ordem);
    if (plano.tipo === 'chefe' && novaAjuda && estado.ajudas.length + 1 > Math.floor(plano.questoes.length * CONFIG.energia.ajudaMaxChefe)) {
      throw new ErroApp(409, 'ajuda_limite', 'Limite de ajuda do chefe atingido (20% das questões).');
    }
    let resposta: { ocultar?: number[]; escudo?: boolean } = {};
    if (skill === 'corte') {
      const item = plano.questoes[ordem]!;
      if (!item.perm) throw new ErroApp(409, 'corte_invalido', 'Corte só funciona em questões com alternativas.');
      if (estado.cortes[String(ordem)]?.length) throw new ErroApp(409, 'corte_usado', 'Corte já usado nesta questão.');
      const q = questao(ctx, item.id);
      const g = JSON.parse(q.gabarito) as number | number[];
      const certas = new Set((Array.isArray(g) ? g : [g]).map((i) => item.perm!.indexOf(i)));
      const erradas = embaralhar(item.perm.map((_, i) => i).filter((i) => !certas.has(i)), ctx.rng);
      const quantas = nivel >= 3 && item.perm.length >= 5 ? 2 : 1;
      // Nunca deixa só as certas: sobram pelo menos 2 alternativas e 1 errada.
      const ocultar = erradas.slice(0, Math.min(quantas, erradas.length - 1, item.perm.length - 2));
      if (!ocultar.length) throw new ErroApp(409, 'corte_invalido', 'Não há alternativa para cortar aqui.');
      estado.cortes[String(ordem)] = ocultar;
      resposta = { ocultar };
    } else {
      if ((estado.usos.escudo ?? 0) >= nivel) throw new ErroApp(409, 'escudo_esgotado', `Escudo já usado ${nivel} vez(es) nesta luta.`);
      if (estado.escudo === ordem) throw new ErroApp(409, 'escudo_armado', 'O escudo já está armado nesta questão.');
      estado.escudo = ordem;
      resposta = { escudo: true };
    }
    const sobra = gastarEnergia(ctx, uid, SKILLS_ENERGIA[skill]);
    estado.usos[skill] = (estado.usos[skill] ?? 0) + 1;
    if (novaAjuda) estado.ajudas.push(ordem);
    exec(ctx.db, 'UPDATE tentativa SET estado = :e WHERE id = :id', { e: JSON.stringify(estado), id });
    exec(ctx.db, 'INSERT INTO uso_skill (usuario_id, skill_id, tentativa_id, ordem, em) VALUES (:uid, :s, :t, :o, :em)', {
      uid, s: skill, t: id, o: ordem, em: ctx.agora().toISOString(),
    });
    return { ...resposta, energia: Math.round(sobra * 10) / 10 };
  });
}

const SKILLS_ENERGIA = { corte: 2, escudo: 3 } as const;
