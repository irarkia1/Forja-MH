import { embaralhar, limitarAdaptacao, registrar, type Dano, type Desempenho, type QuestaoPool } from '@forja/regras';
import { exec, todos, um } from '../db';
import type { Contexto } from '../contexto';
import { naoEncontrado } from '../erros';
import { revisoesJogaveis } from './mapa';

// Peças comuns das provas: tipos do plano, pool de questões, correção.

export type Tipo = 'combate' | 'chefe' | 'fantasma';

export interface ItemPlano {
  id: string;
  versao: number;
  perm?: number[]; // perm[posição na tela] = índice original da alternativa
  bloco?: number;
  feynman?: { objetivoId: string; texto: string };
}

export interface Bloco {
  nome: string;
  piso: number;
  dano: Dano;
  curaAntes?: number; // fração da vida recuperada ao entrar no bloco
  limiteSeg?: number;
  barra?: number; // Gêmeos: qual barra de vida apanha
  surpresa?: boolean; // Sangue-Frio reduz o dano
}

export interface Plano {
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
  trilha: string;
  horasTopico?: number;
  elite?: boolean;
  revisaoId?: number;
  etapa?: number;
  ferida?: boolean;
  minAcertos?: number;
  esquiva?: number;
  sorte?: number;
  cura?: number;
  niveisAtivas?: Record<string, number>;
  // Chefes (F2)
  variante?: { id: string; nome: string; frase: string; regra: string };
  blocos?: Bloco[];
  regraFinal?: 'piso' | 'furia' | 'oraculo';
  semSkills?: boolean;
  xpMult?: number;
  dinamico?: { tipo: 'furia' | 'vampiro' | 'lich'; pool: string[]; max?: number; alvo?: number; adicionadas?: number };
  bancada?: boolean;
  barras?: number[]; // vida máxima de cada barra (Gêmeos)
  sangueFrio?: boolean;
  totalBase?: number;
  intercalado?: boolean; // blocos misturados: piso de cada bloco só no fim
}

export interface Estado {
  vida: number;
  proxima: number;
  acertos: number;
  sorte?: number;
  escudo?: number | null;
  usos?: Record<string, number>;
  cortes?: Record<string, number[]>;
  ajudas?: number[];
  corretas?: boolean[]; // por ordem
  barras?: number[];
  servidaEm?: string | null;
  ultimaEm?: string;
  furia?: { nivel: number; seq: number };
  pontos?: number;
  oraculo?: { ordem: number; correta: boolean; conf: number }[];
  lichFeito?: boolean;
  comecou?: boolean;
}

export interface LinhaQuestao {
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

export type RespostaEnviada = number | number[] | boolean | string | { texto: string; rubrica: boolean[] };

export interface QuestaoPoolTipo extends QuestaoPool {
  tipo: string;
}

export function pool(ctx: Contexto, topicoIds: string[]): QuestaoPoolTipo[] {
  return todos<{ id: string; topico_id: string; objetivo_id: string; dificuldade: number; tipo: string }>(
    ctx.db,
    `SELECT id, topico_id, objetivo_id, dificuldade, tipo FROM questao
     WHERE topico_id IN (SELECT value FROM json_each(:t)) AND revisao IN (SELECT value FROM json_each(:r))`,
    { t: JSON.stringify(topicoIds), r: JSON.stringify(revisoesJogaveis(ctx)) },
  ).map((q) => ({ id: q.id, topicoId: q.topico_id, objetivoId: q.objetivo_id, dificuldade: q.dificuldade, tipo: q.tipo }));
}

export function vistasRecentes(ctx: Contexto, uid: number, alvoId: string, ultimas = 3): Set<string> {
  return new Set(
    todos<{ questao_id: string }>(
      ctx.db,
      `SELECT r.questao_id FROM resposta r WHERE r.tentativa_id IN (
         SELECT id FROM tentativa WHERE usuario_id = :uid AND alvo_id = :alvo ORDER BY id DESC LIMIT :n)`,
      { uid, alvo: alvoId, n: ultimas },
    ).map((r) => r.questao_id),
  );
}

export function vistasNosAlvos(ctx: Contexto, uid: number, alvos: string[]): Set<string> {
  return new Set(
    todos<{ questao_id: string }>(ctx.db, `SELECT r.questao_id FROM resposta r JOIN tentativa t ON t.id = r.tentativa_id
      WHERE t.usuario_id = :uid AND t.alvo_id IN (SELECT value FROM json_each(:ids))`, { uid, ids: JSON.stringify(alvos) }).map((r) => r.questao_id),
  );
}

export function desempenhos(ctx: Contexto, uid: number, escopo: 'topico' | 'objetivo', prefixo: string): Map<string, Desempenho> {
  return new Map(
    todos<{ ref_id: string; erros_pond: number; respostas_pond: number; atualizado_em: string }>(
      ctx.db,
      'SELECT * FROM desempenho WHERE usuario_id = :uid AND escopo = :e AND ref_id LIKE :p',
      { uid, e: escopo, p: `${prefixo}%` },
    ).map((d) => [d.ref_id, { errosPond: d.erros_pond, respostasPond: d.respostas_pond, atualizadoEm: new Date(d.atualizado_em) }]),
  );
}

export function gravarDesempenho(ctx: Contexto, uid: number, escopo: 'topico' | 'objetivo', ref: string, correta: boolean): void {
  const atual = desempenhos(ctx, uid, escopo, ref).get(ref);
  const d = registrar(atual, correta, ctx.agora());
  exec(ctx.db, `INSERT INTO desempenho (usuario_id, escopo, ref_id, erros_pond, respostas_pond, atualizado_em)
    VALUES (:uid, :e, :r, :er, :rp, :em)
    ON CONFLICT(usuario_id, escopo, ref_id) DO UPDATE SET erros_pond=excluded.erros_pond, respostas_pond=excluded.respostas_pond, atualizado_em=excluded.atualizado_em`, {
    uid, e: escopo, r: ref, er: d.errosPond, rp: d.respostasPond, em: d.atualizadoEm.toISOString(),
  });
}

export function mudarAdaptacao(ctx: Contexto, uid: number, alvo: string, nivel: number): void {
  exec(ctx.db, `INSERT INTO adaptacao (usuario_id, alvo_id, nivel, atualizado_em) VALUES (:uid, :a, :n, :em)
    ON CONFLICT(usuario_id, alvo_id) DO UPDATE SET nivel=excluded.nivel, atualizado_em=excluded.atualizado_em`, {
    uid, a: alvo, n: limitarAdaptacao(nivel), em: ctx.agora().toISOString(),
  });
}

export function questao(ctx: Contexto, id: string): LinhaQuestao {
  const q = um<LinhaQuestao>(ctx.db, 'SELECT * FROM questao WHERE id = :id', { id });
  if (!q) throw naoEncontrado('Questão');
  return q;
}

export function montarItem(ctx: Contexto, q: QuestaoPool, bloco?: number): ItemPlano {
  const l = questao(ctx, q.id);
  const dados = JSON.parse(l.dados) as { alternativas?: string[] };
  const item: ItemPlano = { id: l.id, versao: l.versao };
  if (dados.alternativas) item.perm = embaralhar(dados.alternativas.map((_, i) => i), ctx.rng);
  if (bloco !== undefined) item.bloco = bloco;
  return item;
}

export function corrigir(q: LinhaQuestao, item: ItemPlano, r: RespostaEnviada): { correta: boolean; gabaritoTela: unknown } {
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
      return { correta: Number.isFinite(n) && String(r).trim() !== '' && Math.abs(n - valor) <= margem + 1e-12, gabaritoTela: g };
    }
  }
}
