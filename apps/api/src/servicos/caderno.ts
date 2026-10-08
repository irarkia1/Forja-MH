import { z } from 'zod';
import { exec, todos, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp, naoEncontrado } from '../erros';

// Caderno do aluno. O conteúdo é estruturado (parágrafos de trechos com cor),
// nunca HTML: o navegador monta com textContent, sem risco de script.

export const CORES = ['amarelo', 'vermelho', 'preto', 'branco', 'azul'] as const;

const Trecho = z.object({
  t: z.string().max(20_000),
  c: z.enum(CORES).optional(),
  b: z.boolean().optional(),
});
export const Conteudo = z.array(z.array(Trecho).max(500)).max(2_000);
export type ConteudoCaderno = z.infer<typeof Conteudo>;

interface Linha {
  id: number;
  topico_id: string | null;
  titulo: string;
  conteudo: string;
  criada_em: string;
  atualizada_em: string;
}

const LIMITE_CARACTERES = 100_000;

function validar(conteudo: ConteudoCaderno): string {
  const json = JSON.stringify(conteudo);
  const total = conteudo.reduce((n, p) => n + p.reduce((m, t) => m + t.t.length, 0), 0);
  if (total > LIMITE_CARACTERES) throw new ErroApp(400, 'pagina_grande', 'Página grande demais: divida em duas.');
  return json;
}

function topicoInfo(ctx: Contexto, topicoId: string) {
  const t = um<{ id: string; nome: string; modulo_id: string; modulo_nome: string }>(ctx.db,
    'SELECT t.id, t.nome, t.modulo_id, m.nome AS modulo_nome FROM topico t JOIN modulo m ON m.id = t.modulo_id WHERE t.id = :id', { id: topicoId });
  if (!t) throw naoEncontrado('Tópico');
  return t;
}

function vista(ctx: Contexto, l: Linha) {
  const t = l.topico_id ? topicoInfo(ctx, l.topico_id) : null;
  return {
    id: l.id,
    titulo: l.titulo,
    topico: t ? { id: t.id, nome: t.nome, moduloId: t.modulo_id, moduloNome: t.modulo_nome } : null,
    conteudo: JSON.parse(l.conteudo) as ConteudoCaderno,
    criadaEm: l.criada_em,
    atualizadaEm: l.atualizada_em,
  };
}

function pagina(ctx: Contexto, uid: number, id: number): Linha {
  const l = um<Linha>(ctx.db, 'SELECT * FROM caderno_pagina WHERE id = :id AND usuario_id = :uid', { id, uid });
  if (!l) throw naoEncontrado('Página');
  return l;
}

export function listar(ctx: Contexto, uid: number) {
  const linhas = todos<Linha & { modulo_id: string | null; topico_nome: string | null; ordem: number | null }>(ctx.db,
    `SELECT p.*, t.modulo_id, t.nome AS topico_nome FROM caderno_pagina p LEFT JOIN topico t ON t.id = p.topico_id
     WHERE p.usuario_id = :uid ORDER BY p.atualizada_em DESC`, { uid });
  return {
    cores: CORES,
    paginas: linhas.map((l) => {
      const conteudo = JSON.parse(l.conteudo) as ConteudoCaderno;
      const texto = conteudo.map((p) => p.map((t) => t.t).join('')).join(' ').replace(/\s+/g, ' ').trim();
      const cores = [...new Set(conteudo.flat().map((t) => t.c).filter(Boolean))];
      return {
        id: l.id, titulo: l.titulo, topicoId: l.topico_id, moduloId: l.modulo_id, topicoNome: l.topico_nome,
        resumo: texto.slice(0, 140), cores, atualizadaEm: l.atualizada_em,
        marcas: conteudo.flat().filter((t) => t.c && t.t.trim()).slice(0, 60).map((t) => ({ t: t.t.slice(0, 240), c: t.c! })),
      };
    }),
  };
}

export function ler(ctx: Contexto, uid: number, id: number) {
  return vista(ctx, pagina(ctx, uid, id));
}

// Página do tópico: existe no máximo uma; devolve um rascunho vazio se ainda não foi salva.
export function doTopico(ctx: Contexto, uid: number, topicoId: string) {
  const t = topicoInfo(ctx, topicoId);
  const l = um<Linha>(ctx.db, 'SELECT * FROM caderno_pagina WHERE usuario_id = :uid AND topico_id = :t', { uid, t: topicoId });
  if (l) return vista(ctx, l);
  return { id: null, titulo: t.nome, topico: { id: t.id, nome: t.nome, moduloId: t.modulo_id, moduloNome: t.modulo_nome }, conteudo: [], criadaEm: null, atualizadaEm: null };
}

export function salvarDoTopico(ctx: Contexto, uid: number, topicoId: string, conteudo: ConteudoCaderno) {
  const t = topicoInfo(ctx, topicoId);
  const json = validar(conteudo);
  const agora = ctx.agora().toISOString();
  exec(ctx.db, `INSERT INTO caderno_pagina (usuario_id, topico_id, titulo, conteudo, criada_em, atualizada_em)
    VALUES (:uid, :t, :titulo, :c, :a, :a)
    ON CONFLICT (usuario_id, topico_id) WHERE topico_id IS NOT NULL DO UPDATE SET conteudo = :c, atualizada_em = :a`,
  { uid, t: topicoId, titulo: t.nome, c: json, a: agora });
  return doTopico(ctx, uid, topicoId);
}

export function criar(ctx: Contexto, uid: number, titulo: string, conteudo: ConteudoCaderno) {
  const json = validar(conteudo);
  const agora = ctx.agora().toISOString();
  const r = exec(ctx.db, `INSERT INTO caderno_pagina (usuario_id, titulo, conteudo, criada_em, atualizada_em)
    VALUES (:uid, :titulo, :c, :a, :a)`, { uid, titulo: titulo.trim() || 'Sem título', c: json, a: agora });
  return ler(ctx, uid, Number(r.lastInsertRowid));
}

export function atualizar(ctx: Contexto, uid: number, id: number, dados: { titulo?: string; conteudo?: ConteudoCaderno }) {
  const l = pagina(ctx, uid, id);
  const titulo = l.topico_id ? l.titulo : (dados.titulo?.trim() || l.titulo);
  const json = dados.conteudo ? validar(dados.conteudo) : l.conteudo;
  exec(ctx.db, 'UPDATE caderno_pagina SET titulo = :titulo, conteudo = :c, atualizada_em = :a WHERE id = :id', {
    id, titulo, c: json, a: ctx.agora().toISOString(),
  });
  return ler(ctx, uid, id);
}

export function apagar(ctx: Contexto, uid: number, id: number) {
  pagina(ctx, uid, id);
  exec(ctx.db, 'DELETE FROM caderno_pagina WHERE id = :id', { id });
  return { ok: true };
}
