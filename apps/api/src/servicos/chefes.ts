import {
  CONFIG,
  D,
  RUBRICA_FEYNMAN,
  VARIANTE_POR_ID,
  dano,
  embaralhar,
  fatorDano,
  fatorTempo,
  fraqueza,
  nv,
  questoesDoChefe,
  sortearChefe,
  sortearVariante,
  type Niveis,
  type Variante,
} from '@forja/regras';
import { exec, todos, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp } from '../erros';
import type { LinhaModulo } from './mapa';
import { desempenhos, montarItem, pool, vistasNosAlvos, type Bloco, type ItemPlano, type Plano, type QuestaoPoolTipo } from './questoes';
import { gastarEnergia } from './skills';

// Montagem das 20 variantes de chefe (CHEFES.md). Cada uma devolve blocos,
// questões e as regras especiais que o motor de luta (provas.ts) aplica.

interface TopicoInfo {
  id: string;
  horas: number;
  tipo: 'comum' | 'elite';
}

export interface Contexto2 {
  m: LinhaModulo;
  topicos: TopicoInfo[];
  adaptacao: number;
  vidaPersonagem: number;
  sk: Niveis;
}

// Marcas que liberam variantes: calculo, pratico, arquivo (achar_erro e caso
// ainda não existem no conteúdo).
export function marcasDoModulo(ctx: Contexto, uid: number, c: Contexto2): Set<string> {
  const marcas = new Set<string>();
  const todasQ = pool(ctx, c.topicos.map((t) => t.id));
  const n = questoesDoChefe(c.m.horas);
  if (todasQ.filter((q) => q.tipo === 'numerica').length >= Math.max(5, Math.round(0.6 * n))) marcas.add('calculo');
  if (c.topicos.some((t) => t.tipo === 'elite')) marcas.add('pratico');
  if (arquivo(ctx, uid, c.m).length >= Math.max(3, Math.round(0.3 * n))) marcas.add('arquivo');
  return marcas;
}

// Questões de módulos anteriores já vencidos, da mesma trilha.
function arquivo(ctx: Contexto, uid: number, m: LinhaModulo): QuestaoPoolTipo[] {
  const anteriores = todos<{ id: string }>(ctx.db, `SELECT pm.modulo_id AS id FROM progresso_modulo pm JOIN modulo mo ON mo.id = pm.modulo_id
    WHERE pm.usuario_id = :uid AND pm.vencido_em IS NOT NULL AND mo.trilha = :tr AND mo.id <> :m`, { uid, tr: m.trilha, m: m.id }).map((r) => r.id);
  if (!anteriores.length) return [];
  const topicos = todos<{ id: string }>(ctx.db, `SELECT id FROM topico WHERE modulo_id IN (SELECT value FROM json_each(:ms))`, { ms: JSON.stringify(anteriores) }).map((t) => t.id);
  return pool(ctx, topicos);
}

function ultimasVariantes(ctx: Contexto, uid: number): string[] {
  return todos<{ variante_id: string }>(ctx.db, `SELECT variante_id FROM tentativa WHERE usuario_id = :uid AND tipo = 'chefe'
    AND variante_id IS NOT NULL ORDER BY id DESC LIMIT 3`, { uid }).map((r) => r.variante_id);
}

// D008: a variante é sorteada ao entrar e fica fixa até vencer. Revanche sorteia outra.
export function escolherVariante(ctx: Contexto, uid: number, c: Contexto2, revanche: boolean): Variante {
  // Fixa (sorteada antes ou forçada pelo admin) vale até vencer; revanche sem fixa sorteia na hora.
  const fixa = um<{ variante_atual: string | null }>(ctx.db, 'SELECT variante_atual FROM progresso_modulo WHERE usuario_id = :uid AND modulo_id = :m', { uid, m: c.m.id })?.variante_atual;
  if (fixa && VARIANTE_POR_ID.has(fixa)) return VARIANTE_POR_ID.get(fixa)!;
  const v = sortearVariante({ marcas: marcasDoModulo(ctx, uid, c), integrador: c.m.trilha === 'integrador', ultimas: ultimasVariantes(ctx, uid), rng: ctx.rng });
  if (!revanche) fixarVariante(ctx, uid, c.m.id, v.id);
  return v;
}

export function fixarVariante(ctx: Contexto, uid: number, moduloId: string, varianteId: string | null): void {
  exec(ctx.db, 'INSERT OR IGNORE INTO progresso_modulo (usuario_id, modulo_id) VALUES (:uid, :m)', { uid, m: moduloId });
  exec(ctx.db, 'UPDATE progresso_modulo SET variante_atual = :v WHERE usuario_id = :uid AND modulo_id = :m', { v: varianteId, uid, m: moduloId });
}

// Olho do Batedor: revela (e fixa) a variante antes de entrar.
export function revelarVariante(ctx: Contexto, uid: number, c: Contexto2) {
  if (!nv(c.sk, 'olho')) throw new ErroApp(409, 'skill_sem_nivel', 'Você ainda não tem o Olho do Batedor.');
  const ja = um<{ variante_atual: string | null }>(ctx.db, 'SELECT variante_atual FROM progresso_modulo WHERE usuario_id = :uid AND modulo_id = :m', { uid, m: c.m.id })?.variante_atual;
  if (!ja) gastarEnergia(ctx, uid, 2);
  const v = escolherVariante(ctx, uid, c, false);
  return { id: v.id, nome: v.nome, frase: v.frase, regra: v.regra };
}

export function varianteRevelada(ctx: Contexto, uid: number, moduloId: string) {
  const id = um<{ variante_atual: string | null }>(ctx.db, 'SELECT variante_atual FROM progresso_modulo WHERE usuario_id = :uid AND modulo_id = :m', { uid, m: moduloId })?.variante_atual;
  const v = id ? VARIANTE_POR_ID.get(id) : undefined;
  return v ? { id: v.id, nome: v.nome, frase: v.frase, regra: v.regra } : null;
}

type Montado = Pick<Plano, 'questoes' | 'blocos' | 'vidaMax' | 'regraFinal' | 'semSkills' | 'xpMult' | 'dinamico' | 'bancada' | 'barras' | 'piso' | 'totalBase' | 'intercalado'>;

export function montarVariante(ctx: Contexto, uid: number, c: Contexto2, v: Variante): Montado {
  const todasQ = pool(ctx, c.topicos.map((t) => t.id));
  const N = Math.min(questoesDoChefe(c.m.horas), todasQ.length);
  const desTop = desempenhos(ctx, uid, 'topico', `${c.m.id}.`);
  const desObj = desempenhos(ctx, uid, 'objetivo', `${c.m.id}.`);
  const vistas = vistasNosAlvos(ctx, uid, [...c.topicos.map((t) => t.id), c.m.id]);
  const fraqObj = new Map([...desObj].map(([k, d]) => [k, fraqueza(d)]));
  const tempo = fatorTempo(c.sk);
  const usadas = new Set<string>();

  // Escolhe n questões de um grupo de tópicos, com cobertura e pontos fracos.
  const escolher = (topicos: TopicoInfo[], n: number, filtro: (q: QuestaoPoolTipo) => boolean = () => true) => {
    const qs = sortearChefe({
      topicos: topicos.map((t) => ({ id: t.id, horas: t.horas, fraqueza: fraqueza(desTop.get(t.id)), pool: todasQ.filter((q) => q.topicoId === t.id && filtro(q) && !usadas.has(q.id)) })),
      total: n,
      adaptacao: c.adaptacao,
      vistasRecentes: vistas,
      fraquezaObjetivo: fraqObj,
      rng: ctx.rng,
    });
    qs.forEach((q) => usadas.add(q.id));
    return qs;
  };
  const itens = (qs: QuestaoPoolTipo[] | ReturnType<typeof escolher>, bloco: number) => qs.map((q) => montarItem(ctx, q, bloco));
  const vidaDe = (questoes: ItemPlano[], blocos: Bloco[]) =>
    Math.round(((c.vidaPersonagem / CONFIG.chefe.divisorVida) * questoes.reduce((s, q) => s + fatorDano(blocos[q.bloco ?? 0]!.dano), 0)) * 10) / 10;
  const piso = CONFIG.chefe.piso;
  const simples = (blocos: Bloco[], questoes: ItemPlano[], extra: Partial<Montado> = {}): Montado => ({
    questoes, blocos, vidaMax: vidaDe(questoes, blocos), regraFinal: 'piso', piso, totalBase: questoes.length, ...extra,
  });

  switch (v.id) {
    case 'hidra': {
      const qs = escolher(c.topicos, N);
      const corte = Math.round(qs.length * 0.6);
      const blocos: Bloco[] = [{ nome: 'Cabeça 1', piso, dano: D }, { nome: 'Cabeça 2', piso, dano: dano(1, 1) }];
      return simples(blocos, [...itens(qs.slice(0, corte), 0), ...itens(qs.slice(corte), 1)]);
    }
    case 'golem': {
      const grupos = [0, 1, 2].map((g) => c.topicos.filter((_, i) => i % 3 === g)).filter((g) => g.length);
      const horas = c.topicos.reduce((s, t) => s + t.horas, 0);
      const blocos: Bloco[] = grupos.map((_, i) => ({ nome: `Núcleo ${i + 1}`, piso, dano: D, curaAntes: i ? 0.25 : undefined }));
      const questoes = grupos.flatMap((g, i) => itens(escolher(g, Math.max(g.length, Math.round((N * g.reduce((s, t) => s + t.horas, 0)) / horas))), i));
      return simples(blocos, questoes);
    }
    case 'traicoeiro': {
      const qs = escolher(c.topicos, N);
      const restantes = todasQ.filter((q) => !usadas.has(q.id)).sort((a, b) => b.dificuldade - a.dificuldade);
      const surpresa = restantes[0] ?? qs.at(-1)!;
      const blocos: Bloco[] = [{ nome: 'Combate', piso, dano: D }, { nome: 'Ataque surpresa', piso: 0, dano: dano(3), surpresa: true }];
      return simples(blocos, [...itens(qs, 0), montarItem(ctx, surpresa, 1)]);
    }
    case 'lich': {
      const qs = escolher(c.topicos, N);
      const blocos: Bloco[] = [{ nome: 'Primeira vida', piso, dano: D }, { nome: 'Ressurreição', piso, dano: dano(1, 1), curaAntes: 0.3, surpresa: true }];
      return simples(blocos, itens(qs, 0), { dinamico: { tipo: 'lich', pool: todasQ.filter((q) => !usadas.has(q.id)).map((q) => q.id), max: Math.ceil(0.25 * N) } });
    }
    case 'cronomante': {
      const qs = escolher(c.topicos, N);
      return simples([{ nome: 'Cronomante', piso, dano: D, limiteSeg: Math.round(90 * tempo) }], itens(qs, 0), {
        // numéricas ganham o dobro de tempo (aplicado na vista)
      });
    }
    case 'enxame': {
      const n = Math.min(CONFIG.chefe.maxQuestoes, Math.round(1.5 * N));
      const qs = escolher(c.topicos, n, (q) => q.dificuldade <= 3);
      const mais = qs.length < n ? escolher(c.topicos, n - qs.length) : [];
      return simples([{ nome: 'Enxame', piso: 0.7, dano: dano(1, 0, 0.5), limiteSeg: Math.round(45 * tempo) }], itens([...qs, ...mais], 0), { piso: 0.7 });
    }
    case 'colosso': {
      const n = Math.max(5, Math.round(0.6 * N));
      const qs = escolher(c.topicos, n, (q) => q.tipo === 'numerica');
      return simples([{ nome: 'Colosso', piso, dano: dano(2) }], itens(qs, 0));
    }
    case 'arquivista': {
      const qs = escolher(c.topicos, N);
      const arq = embaralhar(arquivo(ctx, uid, c.m), ctx.rng).slice(0, Math.max(3, Math.round(0.3 * N)));
      const blocos: Bloco[] = [{ nome: 'Módulo', piso, dano: D }, { nome: 'Arquivo', piso, dano: dano(1, 1) }];
      return simples(blocos, embaralhar([...itens(qs, 0), ...itens(arq, 1)], ctx.rng), { intercalado: true });
    }
    case 'furia': {
      const primeira = escolher(c.topicos, 1, (q) => q.dificuldade >= 2);
      const blocos: Bloco[] = [{ nome: 'Fúria', piso: 0, dano: D }];
      const questoes = itens(primeira.length ? primeira : escolher(c.topicos, 1), 0);
      return {
        questoes, blocos, regraFinal: 'furia', piso: 0.7, totalBase: N,
        vidaMax: Math.round((c.vidaPersonagem / CONFIG.chefe.divisorVida) * N * 1.2 * 10) / 10,
        dinamico: { tipo: 'furia', pool: todasQ.filter((q) => !usadas.has(q.id)).map((q) => q.id), alvo: N },
      };
    }
    case 'purista': {
      const qs = escolher(c.topicos, N);
      return simples([{ nome: 'Purista', piso: 0.65, dano: D }], itens(qs, 0), { semSkills: true, xpMult: 1.5, piso: 0.65 });
    }
    case 'feynman': {
      const qs = escolher(c.topicos, Math.max(5, Math.round(0.8 * N)));
      const objetivos = todos<{ id: string; objetivos: string }>(ctx.db, 'SELECT id, objetivos FROM topico WHERE modulo_id = :m', { m: c.m.id })
        .flatMap((t) => (JSON.parse(t.objetivos) as { id: string; texto: string }[]).map((o) => ({ id: `${t.id}.${o.id}`, texto: o.texto })));
      const alvo = objetivos.sort((a, b) => (fraqObj.get(b.id) ?? 0.5) - (fraqObj.get(a.id) ?? 0.5))[0] ?? { id: c.m.id, texto: c.m.nome };
      const blocos: Bloco[] = [{ nome: 'Duelo', piso, dano: D }, { nome: 'Explicação', piso: 0, dano: dano(3) }];
      const questoes = [...itens(qs, 0), { id: 'FEYNMAN', versao: 0, bloco: 1, feynman: { objetivoId: alvo.id, texto: alvo.texto } }];
      return { ...simples(blocos, questoes), vidaMax: vidaDe(questoes, blocos) };
    }
    case 'mimico': {
      // As questões em que mais se erra (histórico de todos), com dificuldade alta.
      const taxas = new Map(todos<{ questao_id: string; taxa: number }>(ctx.db, `SELECT questao_id, 1.0 - AVG(correta) AS taxa FROM resposta GROUP BY questao_id`).map((r) => [r.questao_id, r.taxa]));
      const nota = (q: QuestaoPoolTipo) => q.dificuldade + 2 * (taxas.get(q.id) ?? 0.3);
      const corte = new Set([...todasQ].sort((a, b) => nota(b) - nota(a)).slice(0, Math.max(N, Math.round(todasQ.length / 2))).map((q) => q.id));
      const qs = escolher(c.topicos, N, (q) => corte.has(q.id));
      return simples([{ nome: 'Mímico', piso: 0.55, dano: D }], itens(qs, 0), { piso: 0.55 });
    }
    case 'bancada': {
      const elites = c.topicos.filter((t) => t.tipo === 'elite');
      const n = Math.max(5, Math.round(0.5 * N));
      const qs = escolher(elites.length ? elites : c.topicos, n);
      return simples([{ nome: 'Bancada', piso, dano: dano(2) }], itens(qs, 0), { bancada: true });
    }
    case 'dragao': {
      const qs = escolher(c.topicos, N).sort((a, b) => a.dificuldade - b.dificuldade);
      const t1 = Math.round(qs.length / 3);
      const t2 = Math.round((2 * qs.length) / 3);
      const blocos: Bloco[] = [
        { nome: 'Fase 1 · fácil', piso: 0.6, dano: D },
        { nome: 'Fase 2 · média', piso: 0.7, dano: dano(2) },
        { nome: 'Fase 3 · difícil', piso: 0.7, dano: dano(3), limiteSeg: Math.round(120 * tempo) },
      ];
      return simples(blocos, [...itens(qs.slice(0, t1), 0), ...itens(qs.slice(t1, t2), 1), ...itens(qs.slice(t2), 2)]);
    }
    case 'vampiro': {
      const qs = escolher(c.topicos, N);
      return simples([{ nome: 'Vampiro', piso, dano: D }], itens(qs, 0), {
        dinamico: { tipo: 'vampiro', pool: todasQ.filter((q) => !usadas.has(q.id)).map((q) => q.id), max: Math.round(0.2 * N), adicionadas: 0 },
      });
    }
    case 'gemeos': {
      const a = c.topicos.filter((_, i) => i % 2 === 0);
      const b = c.topicos.filter((_, i) => i % 2 === 1);
      const qa = escolher(a, Math.ceil(N / 2));
      const qb = b.length ? escolher(b, Math.floor(N / 2)) : [];
      const blocos: Bloco[] = [{ nome: 'Gêmeo A', piso, dano: D, barra: 0 }, { nome: 'Gêmeo B', piso, dano: D, barra: 1 }];
      const ia = itens(qa, 0);
      const ib = itens(qb, 1);
      const questoes: ItemPlano[] = [];
      for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
        if (ia[i]) questoes.push(ia[i]!);
        if (ib[i]) questoes.push(ib[i]!);
      }
      const barra = (lista: ItemPlano[]) => Math.round(((c.vidaPersonagem / CONFIG.chefe.divisorVida) * lista.length) * 10) / 10;
      return { ...simples(blocos, questoes), barras: [barra(ia), barra(ib)], vidaMax: barra(ia) + barra(ib), intercalado: true };
    }
    case 'oraculo': {
      const qs = escolher(c.topicos, N);
      return {
        ...simples([{ nome: 'Oráculo', piso: 0, dano: D }], itens(qs, 0)),
        regraFinal: 'oraculo', piso: 0.6,
        vidaMax: Math.round(((c.vidaPersonagem / CONFIG.chefe.divisorVida) * qs.length * 2) * 10) / 10,
      };
    }
    default: {
      const qs = escolher(c.topicos, N);
      return simples([{ nome: 'Guardião', piso, dano: D }], itens(qs, 0));
    }
  }
}

export { RUBRICA_FEYNMAN };
