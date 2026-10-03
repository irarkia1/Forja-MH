import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { horasDoTopico, minimoDoTopicoSeg, questoesDoChefe } from '@forja/regras';
import { exec, transacao, type Db } from './db';

// Conteúdo no git, progresso no banco (D003). IDs estáveis; nada é apagado.

const Ato = z.object({
  id: z.string().regex(/^A\d$/),
  nome: z.string(),
  regiao: z.string(),
  lema: z.string(),
  horas: z.number().int().positive(),
  ordem: z.number().int(),
});

const Objetivo = z.object({ id: z.string().regex(/^O\d+$/), texto: z.string().min(10) });

const Topico = z.object({
  id: z.string().regex(/^M\d\.\d+\.T\d\d$/),
  nome: z.string(),
  tipo: z.enum(['comum', 'elite']),
  peso: z.number().positive(),
  depois_de: z.array(z.string()).nullish(),
  objetivos: z.array(Objetivo).default([]),
});

const Modulo = z.object({
  id: z.string().regex(/^M\d\.\d+$/),
  ato: z.string(),
  nome: z.string(),
  missao: z.string().nullish(),
  horas: z.number().int().positive(),
  trilha: z.enum(['base', 'firmware', 'hardware', 'fabricacao', 'silicio', 'sensores', 'produto', 'integrador']),
  ordem: z.number().int(),
  requer: z.array(z.string()),
  tags_chefe: z.array(z.string()).default([]),
  topicos: z.array(Topico).min(1),
});

const Base = {
  id: z.string().regex(/^Q-M\d\.\d+\.T\d\d-\d{3}$/),
  objetivo: z.string(),
  dificuldade: z.number().int().min(1).max(5),
  bloom: z.enum(['lembrar', 'entender', 'aplicar', 'analisar', 'avaliar', 'criar']),
  enunciado: z.string().min(5),
  explicacao: z.string().min(5),
  fonte: z.string().min(3),
  origem: z.enum(['humano', 'ia']),
  revisao: z.enum(['rascunho', 'revisada', 'contestada', 'aposentada']),
};

const Questao = z.discriminatedUnion('tipo', [
  z.object({ ...Base, tipo: z.literal('unica'), alternativas: z.array(z.string()).min(2).max(6), resposta: z.number().int().min(0) }),
  z.object({ ...Base, tipo: z.literal('multipla'), alternativas: z.array(z.string()).min(3).max(6), resposta: z.array(z.number().int().min(0)).min(1) }),
  z.object({ ...Base, tipo: z.literal('vf'), resposta: z.boolean() }),
  z.object({
    ...Base,
    tipo: z.literal('numerica'),
    resposta: z.object({ valor: z.number(), unidade: z.string(), tolerancia: z.number().min(0).max(0.5).default(0.01) }),
  }),
]);

export type QuestaoYaml = z.infer<typeof Questao>;
export type ModuloYaml = z.infer<typeof Modulo>;

export interface Conteudo {
  atos: z.infer<typeof Ato>[];
  modulos: (ModuloYaml & { roteiros: Map<string, string>; questoes: QuestaoYaml[]; pasta: string })[];
}

export interface Problema {
  arquivo: string;
  mensagem: string;
}

export function carregarConteudo(raiz: string): { conteudo: Conteudo; problemas: Problema[] } {
  const problemas: Problema[] = [];
  const ler = <T>(arquivo: string, schema: z.ZodType<T>): T | undefined => {
    try {
      const r = schema.safeParse(parse(readFileSync(arquivo, 'utf8')));
      if (r.success) return r.data;
      for (const i of r.error.issues) problemas.push({ arquivo, mensagem: `${i.path.join('.')}: ${i.message}` });
    } catch (e) {
      problemas.push({ arquivo, mensagem: (e as Error).message });
    }
    return undefined;
  };

  const atos = ler(join(raiz, 'atos.yaml'), z.array(Ato)) ?? [];
  const modulos: Conteudo['modulos'] = [];
  for (const ato of atos) {
    const pastaAto = join(raiz, ato.id);
    if (!existsSync(pastaAto)) continue;
    for (const nome of readdirSync(pastaAto).sort()) {
      const pasta = join(pastaAto, nome);
      const m = ler(join(pasta, 'modulo.yaml'), Modulo);
      if (!m) continue;
      const roteiros = new Map<string, string>();
      const questoes: QuestaoYaml[] = [];
      for (const t of m.topicos) {
        const curto = t.id.slice(-3);
        const roteiro = join(pasta, 'roteiros', `${curto}.md`);
        if (existsSync(roteiro)) roteiros.set(t.id, readFileSync(roteiro, 'utf8'));
        const arqQ = join(pasta, 'questoes', `${curto}.yaml`);
        if (existsSync(arqQ)) questoes.push(...(ler(arqQ, z.array(Questao)) ?? []));
      }
      modulos.push({ ...m, roteiros, questoes, pasta });
    }
  }
  problemas.push(...verificar({ atos, modulos }));
  return { conteudo: { atos, modulos }, problemas };
}

function verificar(c: Conteudo): Problema[] {
  const p: Problema[] = [];
  const ids = new Set<string>();
  const modulos = new Map(c.modulos.map((m) => [m.id, m]));
  for (const ato of c.atos) {
    const soma = c.modulos.filter((m) => m.ato === ato.id).reduce((s, m) => s + m.horas, 0);
    if (soma !== ato.horas) p.push({ arquivo: ato.id, mensagem: `horas dos módulos (${soma}) ≠ horas do ato (${ato.horas})` });
  }
  const total = c.atos.reduce((s, a) => s + a.horas, 0);
  if (total !== 10_000) p.push({ arquivo: 'atos.yaml', mensagem: `soma dos atos = ${total}, esperado 10000` });

  for (const m of c.modulos) {
    const arq = `${m.pasta}/modulo.yaml`;
    for (const r of m.requer.flatMap((x) => x.split('|'))) {
      if (!modulos.has(r.trim())) p.push({ arquivo: arq, mensagem: `requer módulo inexistente: ${r}` });
    }
    const topicos = new Set(m.topicos.map((t) => t.id));
    for (const t of m.topicos) {
      if (!t.id.startsWith(m.id + '.')) p.push({ arquivo: arq, mensagem: `${t.id} fora do módulo` });
      for (const d of t.depois_de ?? []) if (!topicos.has(d)) p.push({ arquivo: arq, mensagem: `${t.id}: depois_de inexistente ${d}` });
    }
    const porTopico = new Map<string, QuestaoYaml[]>();
    for (const q of m.questoes) {
      if (ids.has(q.id)) p.push({ arquivo: arq, mensagem: `questão duplicada ${q.id}` });
      ids.add(q.id);
      const topicoId = q.id.slice(2, q.id.lastIndexOf('-'));
      const t = m.topicos.find((x) => x.id === topicoId);
      if (!t) {
        p.push({ arquivo: arq, mensagem: `${q.id}: tópico ${topicoId} não existe` });
        continue;
      }
      if (!t.objetivos.some((o) => o.id === q.objetivo)) p.push({ arquivo: arq, mensagem: `${q.id}: objetivo ${q.objetivo} não existe em ${t.id}` });
      if (q.tipo === 'unica' && q.resposta >= q.alternativas.length) p.push({ arquivo: arq, mensagem: `${q.id}: resposta fora das alternativas` });
      if (q.tipo === 'multipla' && q.resposta.some((i) => i >= q.alternativas.length)) p.push({ arquivo: arq, mensagem: `${q.id}: resposta fora das alternativas` });
      // As alternativas são embaralhadas a cada luta: o texto não pode citar posição.
      if (/(últim|primeir|segund|terceir|quart)[ao]s? (alternativa|opção)|\b(alternativa|opção|letra) \(?[A-F]\)?\b/i.test(`${q.enunciado} ${q.explicacao}`)) {
        p.push({ arquivo: arq, mensagem: `${q.id}: cita a posição de uma alternativa (elas são embaralhadas)` });
      }
      porTopico.set(t.id, [...(porTopico.get(t.id) ?? []), q]);
    }
    for (const t of m.topicos) {
      const qs = porTopico.get(t.id) ?? [];
      if (qs.length === 0) continue;
      for (const o of t.objetivos) {
        if (qs.filter((q) => q.objetivo === o.id).length < 2) p.push({ arquivo: arq, mensagem: `${t.id}.${o.id}: menos de 2 questões` });
      }
    }
  }
  return p;
}

const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);

export function importarConteudo(db: Db, c: Conteudo): { modulos: number; topicos: number; questoes: number } {
  let horasAntes = 0;
  let nTopicos = 0;
  let nQuestoes = 0;
  const ordenados = [...c.modulos].sort((a, b) => a.ordem - b.ordem);
  transacao(db, () => {
    for (const a of c.atos) {
      exec(db, `INSERT INTO ato (id, nome, regiao, lema, horas, ordem) VALUES (:id, :nome, :regiao, :lema, :horas, :ordem)
        ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, regiao=excluded.regiao, lema=excluded.lema, horas=excluded.horas, ordem=excluded.ordem`, a);
    }
    for (const m of ordenados) {
      exec(db, `INSERT INTO modulo (id, ato_id, nome, missao, horas, trilha, ordem, requer, tags_chefe, horas_antes, questoes_chefe, situacao)
        VALUES (:id, :ato, :nome, :missao, :horas, :trilha, :ordem, :requer, :tags, :horasAntes, :qChefe, 'ativo')
        ON CONFLICT(id) DO UPDATE SET ato_id=excluded.ato_id, nome=excluded.nome, missao=excluded.missao, horas=excluded.horas,
          trilha=excluded.trilha, ordem=excluded.ordem, requer=excluded.requer, tags_chefe=excluded.tags_chefe,
          horas_antes=excluded.horas_antes, questoes_chefe=excluded.questoes_chefe, situacao='ativo'`, {
        id: m.id, ato: m.ato, nome: m.nome, missao: m.missao ?? null, horas: m.horas, trilha: m.trilha, ordem: m.ordem,
        requer: JSON.stringify(m.requer), tags: JSON.stringify(m.tags_chefe), horasAntes, qChefe: questoesDoChefe(m.horas),
      });
      horasAntes += m.horas;
      const somaPesos = m.topicos.reduce((s, t) => s + t.peso, 0);
      m.topicos.forEach((t, i) => {
        const horas = horasDoTopico(m.horas, t.peso, somaPesos);
        exec(db, `INSERT INTO topico (id, modulo_id, nome, ordem, tipo, horas, minimo_seg, depois_de, objetivos, roteiro_md, situacao)
          VALUES (:id, :modulo, :nome, :ordem, :tipo, :horas, :minimo, :depois, :objetivos, :roteiro, 'ativo')
          ON CONFLICT(id) DO UPDATE SET modulo_id=excluded.modulo_id, nome=excluded.nome, ordem=excluded.ordem, tipo=excluded.tipo,
            horas=excluded.horas, minimo_seg=excluded.minimo_seg, depois_de=excluded.depois_de, objetivos=excluded.objetivos,
            roteiro_md=excluded.roteiro_md, situacao='ativo'`, {
          id: t.id, modulo: m.id, nome: t.nome, ordem: i, tipo: t.tipo, horas, minimo: minimoDoTopicoSeg(horas),
          depois: t.depois_de == null ? null : JSON.stringify(t.depois_de), objetivos: JSON.stringify(t.objetivos),
          roteiro: m.roteiros.get(t.id) ?? null,
        });
        nTopicos++;
      });
      for (const q of m.questoes) {
        const topicoId = q.id.slice(2, q.id.lastIndexOf('-'));
        const dados = q.tipo === 'unica' || q.tipo === 'multipla' ? { alternativas: q.alternativas } : q.tipo === 'numerica' ? { unidade: q.resposta.unidade } : {};
        const corpo = { tipo: q.tipo, enunciado: q.enunciado, dados, gabarito: q.resposta, explicacao: q.explicacao };
        const h = hash(corpo);
        // Questão editada mantém o ID e sobe de versão (D003).
        exec(db, `INSERT INTO questao (id, topico_id, objetivo_id, tipo, enunciado_md, dados, gabarito, explicacao_md, fonte, dificuldade, bloom, origem, revisao, versao, hash)
          VALUES (:id, :topico, :objetivo, :tipo, :enunciado, :dados, :gabarito, :explicacao, :fonte, :dificuldade, :bloom, :origem, :revisao, 1, :hash)
          ON CONFLICT(id) DO UPDATE SET topico_id=excluded.topico_id, objetivo_id=excluded.objetivo_id, tipo=excluded.tipo,
            enunciado_md=excluded.enunciado_md, dados=excluded.dados, gabarito=excluded.gabarito, explicacao_md=excluded.explicacao_md,
            fonte=excluded.fonte, dificuldade=excluded.dificuldade, bloom=excluded.bloom, origem=excluded.origem, revisao=excluded.revisao,
            versao = questao.versao + (questao.hash <> excluded.hash), hash=excluded.hash`, {
          id: q.id, topico: topicoId, objetivo: `${topicoId}.${q.objetivo}`, tipo: q.tipo, enunciado: q.enunciado,
          dados: JSON.stringify(dados), gabarito: JSON.stringify(q.resposta), explicacao: q.explicacao, fonte: q.fonte,
          dificuldade: q.dificuldade, bloom: q.bloom, origem: q.origem, revisao: q.revisao, hash: h,
        });
        nQuestoes++;
      }
    }
    // O que sumiu do YAML é aposentado, nunca apagado (há respostas apontando para lá).
    const vivosM = ordenados.map((m) => m.id);
    const vivosQ = ordenados.flatMap((m) => m.questoes.map((q) => q.id));
    db.prepare(`UPDATE modulo SET situacao='aposentado' WHERE id NOT IN (SELECT value FROM json_each(?))`).run(JSON.stringify(vivosM));
    db.prepare(`UPDATE questao SET revisao='aposentada' WHERE id NOT IN (SELECT value FROM json_each(?))`).run(JSON.stringify(vivosQ));
  });
  return { modulos: ordenados.length, topicos: nTopicos, questoes: nQuestoes };
}
