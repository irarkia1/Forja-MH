import {
  CONFIG,
  RUBRICA_FEYNMAN,
  bonusMemoria,
  curaPorAcerto,
  danoDoGolpe,
  defesaDeSkill,
  defesaDePreparo,
  defesaTotal,
  embaralhar,
  esquivaDeSkill,
  etapaEfetiva,
  fraqueza,
  horasDeDescanso,
  limitarAdaptacao,
  nv,
  perfuracao,
  poderDaFase,
  pontosOraculo,
  proximaFuria,
  proximaRevisao,
  regraDaEtapa,
  resultadoFinal,
  sortearCombate,
  textoDano,
  vidaMaxima,
  xpVitoriaChefe,
  xpVitoriaInimigo,
  type Dano,
} from '@forja/regras';
import { exec, todos, transacao, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp, naoEncontrado } from '../erros';
import { DIA_MS, inicioDoDia } from '../tempo';
import { escolherVariante, fixarVariante, montarVariante, type Contexto2 } from './chefes';
import { encerrarAberta } from './estudo';
import { abrirFerida, agendar, demaisPendentes, feridasAbertas, fusoDo, proximaPendente } from './fantasmas';
import { adaptacaoDe, fase, topicoDaFase, type LinhaModulo } from './mapa';
import { darXp, evento, nivelAtual, type Ganho } from './personagem';
import {
  corrigir,
  desempenhos,
  gravarDesempenho,
  montarItem,
  mudarAdaptacao,
  pool,
  questao,
  vistasRecentes,
  type Bloco,
  type Estado,
  type ItemPlano,
  type Plano,
  type RespostaEnviada,
  type Tipo,
} from './questoes';
import { gastarEnergia, ganharEnergia, niveis as niveisSkill } from './skills';

const FOLGA_TEMPO_SEG = 10; // rede lenta não pune

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

const arred = (x: number) => Math.round(x * 10) / 10;
const blocoDe = (plano: Plano, item: ItemPlano | undefined): Bloco | undefined => (item && plano.blocos ? plano.blocos[item.bloco ?? 0] : undefined);

function limiteDe(ctx: Contexto, plano: Plano, item: ItemPlano): number | undefined {
  const b = blocoDe(plano, item);
  if (!b?.limiteSeg || item.feynman) return undefined;
  const numerica = questao(ctx, item.id).tipo === 'numerica';
  return numerica ? b.limiteSeg * 2 : b.limiteSeg;
}

// O que vai para a tela: nunca gabarito nem explicação (D004).
function vistaQuestao(ctx: Contexto, plano: Plano, ordem: number, estado?: Estado) {
  const item = plano.questoes[ordem]!;
  const bloco = blocoDe(plano, item);
  const comum = {
    ordem,
    total: totalPrevisto(plano),
    bloco: bloco ? { nome: bloco.nome, indice: item.bloco ?? 0, total: plano.blocos!.length, dano: textoDano(bloco.dano) } : null,
    ocultas: estado?.cortes?.[String(ordem)] ?? [],
    escudo: estado?.escudo === ordem,
    confianca: plano.regraFinal === 'oraculo',
  };
  if (item.feynman) {
    return {
      ...comum, id: 'FEYNMAN', tipo: 'feynman' as const, dificuldade: 4, rascunho: false,
      enunciado: `Explique com as suas palavras, como se ensinasse alguém que nunca viu o assunto:\n\n**${item.feynman.texto}**\n\nEscreva pelo menos 150 caracteres. Depois, marque com honestidade o que a sua explicação cumpre.`,
      rubrica: [...RUBRICA_FEYNMAN],
    };
  }
  const q = questao(ctx, item.id);
  const dados = JSON.parse(q.dados) as { alternativas?: string[]; unidade?: string };
  const limite = limiteDe(ctx, plano, item);
  const servida = estado?.servidaEm ? new Date(estado.servidaEm).getTime() : ctx.agora().getTime();
  return {
    ...comum,
    id: q.id,
    tipo: q.tipo,
    enunciado: q.enunciado_md,
    alternativas: item.perm && dados.alternativas ? item.perm.map((i) => dados.alternativas![i]!) : undefined,
    unidade: dados.unidade,
    dificuldade: q.dificuldade,
    rascunho: q.revisao !== 'revisada',
    limiteSeg: limite ?? null,
    restanteSeg: limite ? Math.max(0, Math.round(limite - (ctx.agora().getTime() - servida) / 1000)) : null,
  };
}

function totalPrevisto(plano: Plano): number {
  if (plano.dinamico?.tipo === 'furia') return plano.dinamico.alvo ?? plano.questoes.length;
  return plano.questoes.length;
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
    const agora = ctx.agora().toISOString();
    const estado: Estado = {
      vida: plano.vidaMax, proxima: 0, acertos: 0, sorte: plano.sorte ?? 0, escudo: null, usos: {}, cortes: {}, ajudas: [], corretas: [],
      // O chefe só começa a contar o tempo quando você clica em "Enfrentar".
      comecou: plano.tipo !== 'chefe',
      servidaEm: plano.tipo !== 'chefe' ? agora : null,
      ultimaEm: agora,
    };
    if (plano.barras) estado.barras = [...plano.barras];
    if (plano.dinamico?.tipo === 'furia') estado.furia = { nivel: 3, seq: 0 };
    if (plano.regraFinal === 'oraculo') estado.oraculo = [];
    if (plano.regraFinal === 'furia') estado.pontos = 0;
    const r = exec(ctx.db, `INSERT INTO tentativa (usuario_id, tipo, alvo_id, revanche, variante_id, plano, estado, inicio, total)
      VALUES (:uid, :tipo, :alvo, :rev, :var, :plano, :estado, :inicio, :total)`, {
      uid, tipo, alvo: alvoId, rev: plano.revanche, var: plano.variante?.id ?? null,
      plano: JSON.stringify(plano), estado: JSON.stringify(estado), inicio: agora, total: totalPrevisto(plano),
    });
    return { tentativaId: r.lastInsertRowid, ...publico(plano, estado), questao: vistaQuestao(ctx, plano, 0, estado) };
  });
}

function publico(p: Plano, e: Estado) {
  return {
    tipo: p.tipo, alvoNome: p.alvoNome, moduloId: p.moduloId, trilha: p.trilha, elite: Boolean(p.elite), total: totalPrevisto(p), poder: p.poder, vidaMax: p.vidaMax,
    defesa: p.defesa, perfuracao: p.perfuracao, adaptacao: p.adaptacao, revanche: p.revanche, piso: p.piso,
    fantasma: p.tipo === 'fantasma' ? { etapa: p.etapa ?? 0, ferida: Boolean(p.ferida), minAcertos: p.minAcertos ?? 0 } : null,
    skills: p.tipo === 'fantasma' || p.semSkills ? null : { esquiva: p.esquiva ?? 0, sorte: p.sorte ?? 0, cura: p.cura ?? 0, corte: p.niveisAtivas?.corte ?? 0, escudo: p.niveisAtivas?.escudo ?? 0 },
    variante: p.variante ?? null,
    blocos: p.blocos?.map((b) => ({ nome: b.nome, piso: b.piso, dano: textoDano(b.dano), limiteSeg: b.limiteSeg ?? null, curaAntes: b.curaAntes ?? null })) ?? null,
    bancada: Boolean(p.bancada),
    barras: p.barras ?? null,
    vida: e.vida,
    barrasAtuais: e.barras ?? null,
    acertos: e.acertos,
    comecou: Boolean(e.comecou),
    furia: e.furia ?? null,
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
  const poder = poderDaFase(m.horas_antes, { elite: linha.tipo === 'elite', adaptacao });
  return {
    ...efeitosDeSkill(sk, poder),
    tipo: 'combate',
    alvoNome: linha.nome,
    moduloId: m.id,
    questoes: qs.map((q) => montarItem(ctx, q)),
    poder,
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

export function contextoDoChefe(ctx: Contexto, uid: number, moduloId: string, adaptacao: number): Contexto2 {
  const f = fase(ctx, uid, moduloId);
  const m = um<LinhaModulo>(ctx.db, 'SELECT * FROM modulo WHERE id = :id', { id: moduloId })!;
  const sk = niveisSkill(ctx, uid);
  return {
    m,
    topicos: f.topicos.map((t) => ({ id: t.id, horas: t.horas, tipo: t.tipo })),
    adaptacao,
    vidaPersonagem: vidaMaxima(nivelAtual(ctx, uid), nv(sk, 'vitalidade')),
    sk,
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
    const libera = ultima ? new Date(new Date(ultima.inicio).getTime() + CONFIG.xp.revancheChefeDias * DIA_MS) : null;
    if (libera && libera > ctx.agora()) throw new ErroApp(409, 'revanche_semana', 'A revanche deste chefe libera a cada 7 dias.', { ate: libera.toISOString() });
  }
  const adaptacao = revanche ? 0 : adaptacaoDe(ctx, uid, moduloId);
  const c = contextoDoChefe(ctx, uid, moduloId, adaptacao);
  const v = escolherVariante(ctx, uid, c, revanche);
  const montado = montarVariante(ctx, uid, c, v);
  const poder = poderDaFase(c.m.horas_antes, { adaptacao });
  return {
    ...efeitosDeSkill(c.sk, poder),
    ...montado,
    tipo: 'chefe',
    alvoNome: `${v.nome} — ${c.m.nome}`,
    moduloId,
    poder,
    defesa: defesaTotal(defesaDeSkill(c.sk), 0),
    perfuracao: perfuracao(adaptacao),
    adaptacao,
    revanche,
    trilha: c.m.trilha,
    variante: { id: v.id, nome: v.nome, frase: v.frase, regra: v.regra },
    sangueFrio: nv(c.sk, 'sangue_frio') > 0,
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
// Começar (chefe): o relógio e a Bancada só contam a partir daqui.

export function comecar(ctx: Contexto, uid: number, id: number, bancada?: { descricao: string; link: string | null }) {
  return transacao(ctx.db, () => {
    const t = tentativa(ctx, uid, id);
    if (t.resultado !== 'em_curso') throw new ErroApp(409, 'luta_encerrada', 'Essa luta já terminou.');
    const plano = JSON.parse(t.plano) as Plano;
    const estado = JSON.parse(t.estado) as Estado;
    if (!estado.comecou) {
      if (plano.bancada) {
        if (!bancada || bancada.descricao.trim().length < 80) {
          throw new ErroApp(400, 'bancada_curta', 'Senhor da Bancada: descreva a tarefa prática que você fez (pelo menos 80 caracteres): o que montou, o que mediu, o que deu diferente.');
        }
        const topico = um<{ id: string }>(ctx.db, "SELECT id FROM topico WHERE modulo_id = :m AND tipo = 'elite' ORDER BY ordem LIMIT 1", { m: plano.moduloId })
          ?? um<{ id: string }>(ctx.db, 'SELECT id FROM topico WHERE modulo_id = :m ORDER BY ordem LIMIT 1', { m: plano.moduloId })!;
        exec(ctx.db, 'INSERT INTO evidencia (usuario_id, topico_id, descricao_md, link, criada_em) VALUES (:uid, :t, :d, :l, :em)', {
          uid, t: topico.id, d: `[Senhor da Bancada] ${bancada.descricao.trim()}`, l: bancada.link, em: ctx.agora().toISOString(),
        });
      }
      estado.comecou = true;
      estado.servidaEm = ctx.agora().toISOString();
      estado.ultimaEm = estado.servidaEm;
      exec(ctx.db, 'UPDATE tentativa SET estado = :e WHERE id = :id', { e: JSON.stringify(estado), id });
    }
    return { ...publico(plano, estado), tentativaId: t.id, questao: vistaQuestao(ctx, plano, estado.proxima, estado) };
  });
}

// ---------------------------------------------------------------------------
// Responder

function tentativa(ctx: Contexto, uid: number, id: number): LinhaTentativa {
  const t = um<LinhaTentativa>(ctx.db, 'SELECT * FROM tentativa WHERE id = :id AND usuario_id = :uid', { id, uid });
  if (!t) throw naoEncontrado('Luta');
  return t;
}

interface Golpe {
  dados: number[];
  dano: number;
  vidaAntes: number;
  vida: number;
  barra?: number;
  esquivou?: boolean;
  escudo?: boolean;
  sorte?: number[];
}

// Rola o dano de um bloco: n dados (Sorte rerrola os altos), +soma, ×mult.
function rolar(ctx: Contexto, plano: Plano, estado: Estado, d: Dano, extra = 0): { total: number; dados: number[]; sorte?: number[] } {
  const dados: number[] = [];
  let sorte: number[] | undefined;
  for (let i = 0; i < d.dados; i++) {
    let x = ctx.dado();
    if (x >= 4 && (estado.sorte ?? 0) > 0) {
      const outro = ctx.dado();
      sorte = [x, outro];
      x = Math.min(x, outro);
      estado.sorte = (estado.sorte ?? 0) - 1;
    }
    dados.push(x);
  }
  void plano;
  return { total: (dados.reduce((a, b) => a + b, 0) + d.soma + extra) * d.mult, dados, sorte };
}

function golpear(ctx: Contexto, t: LinhaTentativa, plano: Plano, estado: Estado, ordem: number, d: Dano, opts: { mult?: number; extra?: number; surpresa?: boolean; barra?: number } = {}): Golpe {
  const detalhe: { esquivou?: boolean; escudo?: boolean; sorte?: number[] } = {};
  const esquiva = (plano.esquiva ?? 0) * (1 - plano.perfuracao); // perfuração atravessa a esquiva (D015)
  let rolagem: { total: number; dados: number[]; sorte?: number[] } = { total: 0, dados: [] };
  if (estado.escudo === ordem) detalhe.escudo = true;
  else if (esquiva > 0 && ctx.rng() < esquiva) detalhe.esquivou = true;
  else {
    rolagem = rolar(ctx, plano, estado, d, opts.extra ?? 0);
    if (rolagem.sorte) detalhe.sorte = rolagem.sorte;
  }
  let dano = detalhe.escudo || detalhe.esquivou ? 0 : danoDoGolpe({ dado: rolagem.total, poder: plano.poder, defesa: plano.defesa, perfuracao: plano.perfuracao });
  if (opts.surpresa && plano.sangueFrio) dano = arred(dano / 2);
  if (opts.mult) dano = arred(dano * opts.mult);
  let vidaAntes: number;
  let vida: number;
  if (opts.barra !== undefined && estado.barras) {
    vidaAntes = estado.barras[opts.barra]!;
    estado.barras[opts.barra] = Math.max(0, arred(vidaAntes - dano));
    vida = estado.barras[opts.barra]!;
    estado.vida = Math.min(...estado.barras);
  } else {
    vidaAntes = estado.vida;
    estado.vida = Math.max(0, arred(estado.vida - dano));
    vida = estado.vida;
  }
  exec(ctx.db, `INSERT INTO golpe (tentativa_id, ordem, dado, poder, defesa, perfuracao, dano, vida_depois, detalhe)
    VALUES (:t, :o, :d, :p, :def, :perf, :dano, :v, :det)`, {
    t: t.id, o: ordem, d: rolagem.dados.reduce((a, b) => a + b, 0), p: plano.poder, def: plano.defesa, perf: plano.perfuracao, dano, v: vida,
    det: JSON.stringify({ ...detalhe, dados: rolagem.dados, barra: opts.barra }),
  });
  return { dados: rolagem.dados, dano, vidaAntes, vida, barra: opts.barra, ...detalhe };
}

function curar(plano: Plano, estado: Estado, valor: number, barra?: number): number {
  if (valor <= 0) return 0;
  if (barra !== undefined && estado.barras && plano.barras) {
    const antes = estado.barras[barra]!;
    estado.barras[barra] = Math.min(plano.barras[barra]!, arred(antes + valor));
    estado.vida = Math.min(...estado.barras);
    return arred(estado.barras[barra]! - antes);
  }
  const antes = estado.vida;
  estado.vida = Math.min(plano.vidaMax, arred(estado.vida + valor));
  return arred(estado.vida - antes);
}

// Questão dinâmica: pega a próxima do pool (Fúria: a mais perto do nível).
function puxarDoPool(ctx: Contexto, plano: Plano, filtro: (id: string) => boolean = () => true, nivel?: number): ItemPlano | null {
  const din = plano.dinamico;
  if (!din) return null;
  const usadas = new Set(plano.questoes.map((q) => q.id));
  let candidatas = din.pool.filter((id) => !usadas.has(id) && filtro(id));
  if (!candidatas.length) return null;
  if (nivel !== undefined) {
    const dif = new Map(candidatas.map((id) => [id, questao(ctx, id).dificuldade]));
    const melhor = Math.min(...candidatas.map((id) => Math.abs(dif.get(id)! - nivel)));
    candidatas = candidatas.filter((id) => Math.abs(dif.get(id)! - nivel) === melhor);
  }
  const id = embaralhar(candidatas, ctx.rng)[0]!;
  const q = questao(ctx, id);
  return montarItem(ctx, { id, topicoId: q.topico_id, objetivoId: q.objetivo_id, dificuldade: q.dificuldade }, plano.questoes.at(-1)?.bloco ?? 0);
}

function acertosDoBloco(plano: Plano, estado: Estado, bloco: number): { acertos: number; total: number } {
  let acertos = 0;
  let total = 0;
  plano.questoes.forEach((q, i) => {
    if ((q.bloco ?? 0) !== bloco || i >= estado.proxima) return;
    total++;
    if (estado.corretas?.[i]) acertos++;
  });
  return { acertos, total };
}

export function responder(ctx: Contexto, uid: number, id: number, ordem: number, resposta: RespostaEnviada, confianca?: number) {
  return transacao(ctx.db, () => {
    const t = tentativa(ctx, uid, id);
    if (t.resultado !== 'em_curso') throw new ErroApp(409, 'luta_encerrada', 'Essa luta já terminou.');
    const plano = JSON.parse(t.plano) as Plano;
    const estado = JSON.parse(t.estado) as Estado;
    if (!estado.comecou) throw new ErroApp(409, 'nao_comecou', 'Clique em "Enfrentar" para começar a luta.');
    if (ordem !== estado.proxima) throw new ErroApp(409, 'ordem_errada', 'Essa questão já foi respondida.', { proxima: estado.proxima });
    const agoraD = ctx.agora();
    const agora = agoraD.toISOString();
    const avisos: string[] = [];

    // O Purista não aceita pausa de mais de 24 h.
    if (plano.variante?.id === 'purista' && estado.ultimaEm && agoraD.getTime() - new Date(estado.ultimaEm).getTime() > DIA_MS) {
      return { correta: false, gabarito: null, explicacao: '', fonte: '', golpe: null, cura: 0, avisos: ['O Purista não perdoa: mais de 24 h de pausa.'], vida: estado.vida, vidaMax: plano.vidaMax, barras: estado.barras ?? null, acertos: estado.acertos, oculto: false, fim: finalizar(ctx, uid, t, plano, estado, 'pausa'), proxima: null };
    }

    const item = plano.questoes[ordem]!;
    const bloco = blocoDe(plano, item);
    let correta: boolean;
    let gabarito: unknown = null;
    let explicacao = '';
    let fonte = '';

    if (item.feynman) {
      const r = resposta as { texto?: string; rubrica?: boolean[] };
      const texto = String(r?.texto ?? '').trim();
      const marcados = Array.isArray(r?.rubrica) ? r.rubrica.filter(Boolean).length : 0;
      correta = texto.length >= 150 && marcados >= 3;
      explicacao = correta
        ? `Rubrica: ${marcados} de 4. Explicar é o teste mais duro de entendimento.`
        : texto.length < 150 ? 'A explicação ficou curta demais (mínimo 150 caracteres).' : `Rubrica: ${marcados} de 4 — precisava de 3.`;
      fonte = 'Técnica de Feynman';
      exec(ctx.db, `INSERT INTO resposta (tentativa_id, ordem, questao_id, questao_versao, resposta, correta, em) VALUES (:t, :o, :q, 0, :r, :c, :em)`, {
        t: id, o: ordem, q: `FEYNMAN:${item.feynman.objetivoId}`, r: JSON.stringify(resposta), c: correta, em: agora,
      });
    } else {
      const q = questao(ctx, item.id);
      const corr = corrigir(q, item, resposta);
      correta = corr.correta;
      // Tempo esgotado (servidor é quem conta) vira erro.
      const limite = limiteDe(ctx, plano, item);
      if (limite && estado.servidaEm && (agoraD.getTime() - new Date(estado.servidaEm).getTime()) / 1000 > limite + FOLGA_TEMPO_SEG) {
        if (correta) avisos.push('⏳ Tempo esgotado: a resposta chegou tarde e conta como erro.');
        correta = false;
      }
      gabarito = corr.gabaritoTela;
      explicacao = q.explicacao_md;
      fonte = q.fonte;
      exec(ctx.db, `INSERT INTO resposta (tentativa_id, ordem, questao_id, questao_versao, resposta, correta, em)
        VALUES (:t, :o, :q, :v, :r, :c, :em)`, { t: id, o: ordem, q: q.id, v: item.versao, r: JSON.stringify(resposta), c: correta, em: agora });
      gravarDesempenho(ctx, uid, 'topico', q.topico_id, correta);
      gravarDesempenho(ctx, uid, 'objetivo', q.objetivo_id, correta);
      if (plano.regraFinal === 'furia' && correta) estado.pontos = (estado.pontos ?? 0) + q.dificuldade;
    }
    (estado.corretas ??= [])[ordem] = correta;

    let golpe: Golpe | null = null;
    let cura = 0;
    const oraculo = plano.regraFinal === 'oraculo';
    if (oraculo) {
      // Oráculo Cego: guarda tudo para o fim; não mostra nada agora.
      const conf = Math.max(1, Math.min(3, Math.round(confianca ?? 2)));
      (estado.oraculo ??= []).push({ ordem, correta, conf });
      if (correta) estado.acertos += 1;
    } else if (correta) {
      estado.acertos += 1;
      if (plano.tipo !== 'fantasma') {
        cura = curar(plano, estado, plano.cura ?? 0, bloco?.barra);
        if (plano.dinamico?.tipo === 'vampiro') cura = arred(cura + curar(plano, estado, plano.poder, bloco?.barra));
      }
    } else if (plano.tipo !== 'fantasma') {
      const extraFuria = plano.dinamico?.tipo === 'furia' ? Math.max(0, (estado.furia?.nivel ?? 3) - 3) : 0;
      golpe = golpear(ctx, t, plano, estado, ordem, bloco?.dano ?? { dados: 1, soma: 0, mult: 1 }, { extra: extraFuria, surpresa: bloco?.surpresa, barra: bloco?.barra });
      // Vampiro: cada erro suga e acrescenta 1 questão.
      const din = plano.dinamico;
      if (din?.tipo === 'vampiro' && (din.adicionadas ?? 0) < (din.max ?? 0)) {
        const nova = puxarDoPool(ctx, plano);
        if (nova) {
          plano.questoes.push(nova);
          din.adicionadas = (din.adicionadas ?? 0) + 1;
          avisos.push('🧛 O Vampiro sugou: +1 questão.');
        }
      }
    }
    if (estado.escudo === ordem) estado.escudo = null;
    if (estado.furia) {
      const antes = estado.furia.nivel;
      estado.furia = proximaFuria(estado.furia, correta);
      if (estado.furia.nivel > antes) avisos.push(`🔥 A Fúria cresce: dificuldade ${estado.furia.nivel}.`);
      if (estado.furia.nivel < antes) avisos.push(`A Fúria recua: dificuldade ${estado.furia.nivel}.`);
    }
    estado.proxima += 1;
    estado.ultimaEm = agora;

    // Fim de bloco: confere o piso do bloco e aplica a cura de entrada do próximo.
    let derrotaPiso = false;
    const proximoItem = plano.questoes[estado.proxima];
    if (plano.blocos && plano.regraFinal === 'piso' && !plano.intercalado && bloco && (!proximoItem || (proximoItem.bloco ?? 0) !== (item.bloco ?? 0))) {
      const b = acertosDoBloco(plano, estado, item.bloco ?? 0);
      if (bloco.piso > 0 && b.total > 0 && b.acertos / b.total < bloco.piso - 1e-9) derrotaPiso = true;
      else if (proximoItem) {
        const nb = blocoDe(plano, proximoItem)!;
        if (nb.curaAntes) {
          const c = curar(plano, estado, plano.vidaMax * nb.curaAntes);
          avisos.push(`${bloco.nome} superado! Você recupera ${arred(c)} de vida. Começa: ${nb.nome}.`);
        } else if (nb.nome !== bloco.nome) avisos.push(`${bloco.nome} superado! Começa: ${nb.nome} (dano ${textoDano(nb.dano)}).`);
      }
    }

    // Lich: ao terminar a primeira vida, ressurge com os temas que você errou.
    if (!derrotaPiso && estado.vida > 0 && !proximoItem && plano.dinamico?.tipo === 'lich' && !estado.lichFeito) {
      const b0 = acertosDoBloco(plano, estado, 0);
      if (b0.acertos / Math.max(1, b0.total) >= (plano.blocos?.[0]?.piso ?? 0.6) - 1e-9) {
        estado.lichFeito = true;
        const errados = new Set(plano.questoes.filter((q, i) => !estado.corretas?.[i] && !q.feynman).map((q) => questao(ctx, q.id).topico_id));
        const filtro = errados.size ? (qid: string) => errados.has(questao(ctx, qid).topico_id) : () => true;
        const n = plano.dinamico.max ?? 3;
        for (let i = 0; i < n; i++) {
          const nova = puxarDoPool(ctx, plano, filtro) ?? puxarDoPool(ctx, plano);
          if (!nova) break;
          nova.bloco = 1;
          plano.questoes.push(nova);
        }
        if (plano.questoes.length > estado.proxima) {
          const c = curar(plano, estado, plano.vidaMax * (plano.blocos?.[1]?.curaAntes ?? 0.3));
          avisos.push(`💀 O Lich ressurge com ${plano.questoes.length - estado.proxima} questões dos temas que você errou. Você recupera ${arred(c)} de vida.`);
        }
      }
    }

    // Fúria: escolhe a próxima questão pelo nível atual.
    if (plano.dinamico?.tipo === 'furia' && estado.proxima >= plano.questoes.length && estado.proxima < (plano.dinamico.alvo ?? 0) && estado.vida > 0) {
      const nova = puxarDoPool(ctx, plano, () => true, estado.furia?.nivel ?? 3);
      if (nova) plano.questoes.push(nova);
    }

    const acabou = derrotaPiso || estado.vida <= 0 || estado.proxima >= plano.questoes.length;
    if (!acabou) estado.servidaEm = agora;
    exec(ctx.db, 'UPDATE tentativa SET estado = :e, plano = :p, acertos = :a, total = :n WHERE id = :id', {
      e: JSON.stringify(estado), p: JSON.stringify(plano), a: estado.acertos, n: totalPrevisto(plano), id,
    });

    return {
      correta: oraculo ? null : correta,
      gabarito: oraculo ? null : gabarito,
      explicacao: oraculo ? '' : explicacao,
      fonte: oraculo ? '' : fonte,
      oculto: oraculo,
      golpe,
      cura,
      avisos,
      vida: estado.vida,
      vidaMax: plano.vidaMax,
      barras: estado.barras ?? null,
      acertos: oraculo ? null : estado.acertos,
      total: totalPrevisto(plano),
      furia: estado.furia ?? null,
      fim: acabou ? finalizar(ctx, uid, t, plano, estado, derrotaPiso ? 'piso_bloco' : undefined) : null,
      proxima: acabou ? null : vistaQuestao(ctx, plano, estado.proxima, estado),
    };
  });
}

type Motivo = 'vida' | 'piso' | 'fuga' | 'pausa' | null;

function finalizar(ctx: Contexto, uid: number, t: LinhaTentativa, plano: Plano, estado: Estado, especial?: 'fuga' | 'pausa' | 'piso_bloco') {
  const respondidas = estado.proxima;
  let oraculo: { ordem: number; correta: boolean; conf: number; dano: number; cura: number }[] | null = null;

  // Oráculo Cego: agora sim, os golpes caem de uma vez.
  if (plano.regraFinal === 'oraculo' && !especial) {
    oraculo = [];
    for (const r of estado.oraculo ?? []) {
      let dano = 0;
      let cura = 0;
      if (!r.correta && estado.vida > 0) dano = golpear(ctx, t, plano, estado, r.ordem, { dados: 1, soma: 0, mult: r.conf }).dano;
      else if (r.correta && r.conf === 3) cura = curar(plano, estado, plano.poder);
      oraculo.push({ ...r, dano, cura });
    }
  }

  let resultado: 'vitoria' | 'derrota';
  let motivo: Motivo = null;
  if (especial === 'fuga' || especial === 'pausa') {
    resultado = 'derrota';
    motivo = especial;
  } else if (especial === 'piso_bloco') {
    resultado = 'derrota';
    motivo = 'piso';
  } else if (plano.tipo === 'fantasma') {
    resultado = estado.acertos >= (plano.minAcertos ?? 0) ? 'vitoria' : 'derrota';
    if (resultado === 'derrota') motivo = 'piso';
  } else if (estado.vida <= 0) {
    resultado = 'derrota';
    motivo = 'vida';
  } else if (plano.regraFinal === 'furia') {
    const alvo = 0.7 * 3 * (plano.dinamico?.alvo ?? plano.questoes.length);
    resultado = (estado.pontos ?? 0) >= alvo - 1e-9 ? 'vitoria' : 'derrota';
    if (resultado === 'derrota') motivo = 'piso';
  } else if (plano.regraFinal === 'oraculo') {
    const pts = pontosOraculo(estado.oraculo ?? []);
    resultado = pts >= 0.6 * 3 * plano.questoes.length - 1e-9 ? 'vitoria' : 'derrota';
    if (resultado === 'derrota') motivo = 'piso';
  } else if (plano.intercalado && plano.blocos) {
    // Gêmeos e Arquivista: piso em cada parte, conferido no fim.
    const ok = plano.blocos.every((_, i) => {
      const b = acertosDoBloco(plano, estado, i);
      return !b.total || b.acertos / b.total >= plano.blocos![i]!.piso - 1e-9;
    });
    resultado = ok ? 'vitoria' : 'derrota';
    if (!ok) motivo = 'piso';
  } else {
    const r = resultadoFinal({ tipo: plano.tipo === 'combate' ? 'combate' : 'chefe', acertos: estado.acertos, total: plano.questoes.length, vida: estado.vida });
    resultado = r.resultado;
    motivo = r.motivo ?? null;
    if (plano.tipo === 'chefe' && resultado === 'vitoria' && estado.acertos / plano.questoes.length < plano.piso - 1e-9) {
      resultado = 'derrota';
      motivo = 'piso';
    }
  }
  const vitoria = resultado === 'vitoria';
  const agora = ctx.agora();
  let xp = 0;
  let critico = false;
  let revisao: { passou: boolean; proximaEm: string | null; concluido: boolean; consolidado: boolean } | null = null;

  if (plano.tipo === 'fantasma') {
    const rev = um<{ vence_em: string; tipo: string }>(ctx.db, 'SELECT vence_em, tipo FROM revisao WHERE id = :id', { id: plano.revisaoId! })!;
    exec(ctx.db, 'UPDATE revisao SET feita_em = :em, resultado = :r, tentativa_id = :t WHERE id = :id', {
      em: agora.toISOString(), r: resultado, t: t.id, id: plano.revisaoId!,
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
    const total = plano.questoes.length;
    if (vitoria) {
      xp = xpVitoriaChefe(total, estado.acertos) * (plano.revanche ? CONFIG.xp.revancheChefe : 1) * (plano.xpMult ?? 1);
      if (plano.revanche) fixarVariante(ctx, uid, t.alvo_id, null);
      if (!plano.revanche) {
        exec(ctx.db, `UPDATE progresso_modulo SET vencido_em = :em, cooldown_ate = NULL,
          melhor_acerto = MAX(COALESCE(melhor_acerto, 0), :a) WHERE usuario_id = :uid AND modulo_id = :m`, {
          em: agora.toISOString(), a: estado.acertos / total, uid, m: t.alvo_id,
        });
        mudarAdaptacao(ctx, uid, t.alvo_id, 0);
        fixarVariante(ctx, uid, t.alvo_id, null); // a próxima luta (revanche) sorteia de novo
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
  exec(ctx.db, 'UPDATE tentativa SET resultado = :r, motivo = :m, fim = :f, xp_ganho = :xp, estado = :e, total = :n WHERE id = :id', {
    r: resultado, m: motivo, f: agora.toISOString(), xp: ganho.xp, e: JSON.stringify(estado), n: plano.questoes.length, id: t.id,
  });
  evento(ctx, uid, plano.tipo, { alvo: t.alvo_id, resultado, acertos: estado.acertos, total: plano.questoes.length, revanche: plano.revanche, variante: plano.variante?.id });
  return {
    resultado,
    motivo,
    critico,
    acertos: estado.acertos,
    respondidas,
    total: plano.questoes.length,
    revanche: plano.revanche,
    ganho,
    revisao,
    oraculo,
    pontos: plano.regraFinal === 'furia' ? { feitos: estado.pontos ?? 0, alvo: Math.ceil(0.7 * 3 * (plano.dinamico?.alvo ?? 0)) } : plano.regraFinal === 'oraculo' ? { feitos: pontosOraculo(estado.oraculo ?? []), alvo: Math.ceil(0.6 * 3 * plano.questoes.length) } : null,
    vidaFinal: estado.vida,
    adaptacaoNova: plano.tipo === 'fantasma' ? 0 : !vitoria && !plano.revanche ? limitarAdaptacao(plano.adaptacao + 1) : vitoria && !plano.revanche ? 0 : plano.adaptacao,
  };
}

export function desistir(ctx: Contexto, uid: number, id: number) {
  return transacao(ctx.db, () => {
    const t = tentativa(ctx, uid, id);
    if (t.resultado !== 'em_curso') throw new ErroApp(409, 'luta_encerrada', 'Essa luta já terminou.');
    return finalizar(ctx, uid, t, JSON.parse(t.plano) as Plano, JSON.parse(t.estado) as Estado, 'fuga');
  });
}

export function emCurso(ctx: Contexto, uid: number) {
  const t = um<LinhaTentativa>(ctx.db, "SELECT * FROM tentativa WHERE usuario_id = :uid AND resultado = 'em_curso'", { uid });
  if (!t) return null;
  const plano = JSON.parse(t.plano) as Plano;
  const estado = JSON.parse(t.estado) as Estado;
  return { tentativaId: t.id, alvoId: t.alvo_id, ...publico(plano, estado), questao: vistaQuestao(ctx, plano, estado.proxima, estado) };
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
    if (plano.semSkills) throw new ErroApp(409, 'purista', 'O Purista não aceita skills ativas.');
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
