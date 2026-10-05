import { CONFIG, classificar, fraqueza } from '@forja/regras';
import { todos, um } from '../db';
import type { Contexto } from '../contexto';
import { DIA_MS, inicioDaSemana, inicioDoDia } from '../tempo';
import { fusoDo } from './fantasmas';
import { resumo } from './personagem';

// Painel de acompanhamento (docs/06-INTERFACE/TELAS.md §10).

const SEMANAS = 26;
const MEDIA_SEMANAS = 8;
const META_JORNADA = 10_000;
const MIN_DIA_SEQUENCIA_SEG = 30 * 60; // um dia "conta" na sequência com 30 min válidos

export function painel(ctx: Contexto, uid: number) {
  const agora = ctx.agora();
  const fuso = fusoDo(ctx, uid);
  const p = resumo(ctx, uid);
  const sessoes = todos<{ inicio: string; segundos_validos: number; trilha: string; ato: string }>(ctx.db, `
    SELECT s.inicio, s.segundos_validos, m.trilha, m.ato_id AS ato FROM sessao_estudo s
    JOIN topico t ON t.id = s.topico_id JOIN modulo m ON m.id = t.modulo_id
    WHERE s.usuario_id = :uid AND s.segundos_validos > 0`, { uid });

  // Horas por semana (26 semanas, a atual por último).
  const semanaAtual = inicioDaSemana(agora, fuso).getTime();
  const semanas = Array.from({ length: SEMANAS }, (_, i) => ({ inicio: new Date(semanaAtual - (SEMANAS - 1 - i) * 7 * DIA_MS).toISOString(), horas: 0 }));
  for (const s of sessoes) {
    const idx = SEMANAS - 1 - Math.floor((semanaAtual - inicioDaSemana(new Date(s.inicio), fuso).getTime()) / (7 * DIA_MS));
    if (idx >= 0 && idx < SEMANAS) semanas[idx]!.horas += s.segundos_validos / 3600;
  }
  semanas.forEach((s) => (s.horas = Math.round(s.horas * 10) / 10));

  // Ritmo: média das últimas 8 semanas COMPLETAS (a atual ainda está em andamento).
  const completas = semanas.slice(-MEDIA_SEMANAS - 1, -1);
  const primeiraSessao = sessoes.length ? Math.min(...sessoes.map((s) => new Date(s.inicio).getTime())) : null;
  const semanasDeHistorico = primeiraSessao ? Math.max(1, Math.ceil((semanaAtual - inicioDaSemana(new Date(primeiraSessao), fuso).getTime()) / (7 * DIA_MS))) : 0;
  const base = Math.min(MEDIA_SEMANAS, semanasDeHistorico);
  const media = base ? completas.slice(-base).reduce((a, s) => a + s.horas, 0) / base : 0;
  const faltam = Math.max(0, META_JORNADA - p.horasTotais);
  const previsao = media > 0 ? new Date(agora.getTime() + (faltam / media) * 7 * DIA_MS).toISOString() : null;

  // Sequência de dias com pelo menos 30 min (termina hoje ou ontem).
  const porDia = new Map<number, number>();
  for (const s of sessoes) {
    const dia = inicioDoDia(new Date(s.inicio), fuso).getTime();
    porDia.set(dia, (porDia.get(dia) ?? 0) + s.segundos_validos);
  }
  let sequencia = 0;
  let dia = inicioDoDia(agora, fuso).getTime();
  if ((porDia.get(dia) ?? 0) < MIN_DIA_SEQUENCIA_SEG) dia -= DIA_MS; // hoje ainda pode estudar
  while ((porDia.get(dia) ?? 0) >= MIN_DIA_SEQUENCIA_SEG) {
    sequencia++;
    dia -= DIA_MS;
  }

  // Progresso por ato: vencido × consolidado × dominado.
  const atos = todos<{ id: string; nome: string; horas: number }>(ctx.db, 'SELECT id, nome, horas FROM ato ORDER BY ordem');
  const porAto = todos<{ ato: string; topicos: number; derrotados: number; consolidados: number; dominados: number }>(ctx.db, `
    SELECT m.ato_id AS ato, COUNT(*) AS topicos,
      SUM(CASE WHEN p.derrotado_em IS NOT NULL THEN 1 ELSE 0 END) AS derrotados,
      SUM(CASE WHEN p.consolidado_em IS NOT NULL THEN 1 ELSE 0 END) AS consolidados,
      SUM(CASE WHEN p.dominado_em IS NOT NULL THEN 1 ELSE 0 END) AS dominados
    FROM topico t JOIN modulo m ON m.id = t.modulo_id
    LEFT JOIN progresso_topico p ON p.topico_id = t.id AND p.usuario_id = :uid
    WHERE t.situacao = 'ativo' AND m.situacao = 'ativo' GROUP BY m.ato_id`, { uid });
  const modulosVencidos = todos<{ ato: string; n: number; total: number }>(ctx.db, `
    SELECT m.ato_id AS ato, COUNT(*) AS total, SUM(CASE WHEN pm.vencido_em IS NOT NULL THEN 1 ELSE 0 END) AS n
    FROM modulo m LEFT JOIN progresso_modulo pm ON pm.modulo_id = m.id AND pm.usuario_id = :uid
    WHERE m.situacao = 'ativo' GROUP BY m.ato_id`, { uid });
  const horasPorAto = new Map<string, number>();
  for (const s of sessoes) horasPorAto.set(s.ato, (horasPorAto.get(s.ato) ?? 0) + s.segundos_validos / 3600);

  // Horas por trilha.
  const trilhas = new Map<string, number>();
  for (const s of sessoes) trilhas.set(s.trilha, (trilhas.get(s.trilha) ?? 0) + s.segundos_validos / 3600);

  // Qualidade.
  const primeiras = todos<{ resultado: string }>(ctx.db, `
    SELECT t.resultado FROM tentativa t WHERE t.usuario_id = :uid AND t.tipo = 'combate' AND t.revanche = 0
      AND t.resultado IN ('vitoria', 'derrota')
      AND t.id = (SELECT MIN(t2.id) FROM tentativa t2 WHERE t2.usuario_id = t.usuario_id AND t2.alvo_id = t.alvo_id AND t2.tipo = 'combate' AND t2.revanche = 0)`, { uid });
  const chefes = um<{ n: number; v: number; acerto: number | null }>(ctx.db, `
    SELECT COUNT(*) AS n, SUM(CASE WHEN resultado = 'vitoria' THEN 1 ELSE 0 END) AS v, AVG(CAST(acertos AS REAL) / NULLIF(total, 0)) AS acerto
    FROM tentativa WHERE usuario_id = :uid AND tipo = 'chefe' AND resultado IN ('vitoria', 'derrota')`, { uid })!;
  const fant = um<{ n: number; v: number }>(ctx.db, `
    SELECT COUNT(*) AS n, SUM(CASE WHEN resultado = 'vitoria' THEN 1 ELSE 0 END) AS v FROM revisao
    WHERE usuario_id = :uid AND feita_em IS NOT NULL AND resultado IN ('vitoria', 'derrota')`, { uid })!;
  const atrasados = um<{ n: number }>(ctx.db, `SELECT COUNT(*) AS n FROM revisao WHERE usuario_id = :uid AND feita_em IS NULL AND vence_em < :limite`, {
    uid, limite: new Date(agora.getTime() - DIA_MS).toISOString(),
  })!.n;
  const ajuda = um<{ q: number; a: number }>(ctx.db, `
    SELECT (SELECT COUNT(*) FROM resposta r JOIN tentativa t ON t.id = r.tentativa_id WHERE t.usuario_id = :uid AND t.tipo = 'chefe') AS q,
           (SELECT COUNT(DISTINCT u.tentativa_id || ':' || u.ordem) FROM uso_skill u JOIN tentativa t ON t.id = u.tentativa_id WHERE u.usuario_id = :uid AND t.tipo = 'chefe') AS a`, { uid })!;

  // Pontos fracos: objetivos com maior fraqueza (pelo menos 3 respostas).
  const objetivos = new Map<string, { texto: string; topico: string }>();
  for (const t of todos<{ id: string; nome: string; objetivos: string }>(ctx.db, 'SELECT id, nome, objetivos FROM topico')) {
    for (const o of JSON.parse(t.objetivos) as { id: string; texto: string }[]) objetivos.set(`${t.id}.${o.id}`, { texto: o.texto, topico: t.nome });
  }
  const fracos = todos<{ ref_id: string; erros_pond: number; respostas_pond: number }>(ctx.db, `
    SELECT ref_id, erros_pond, respostas_pond FROM desempenho WHERE usuario_id = :uid AND escopo = 'objetivo' AND respostas_pond >= 3`, { uid })
    .map((d) => ({ id: d.ref_id, fraqueza: fraqueza({ errosPond: d.erros_pond, respostasPond: d.respostas_pond }), classe: classificar({ errosPond: d.erros_pond, respostasPond: d.respostas_pond }), ...objetivos.get(d.ref_id) }))
    .filter((d) => d.texto)
    .sort((a, b) => b.fraqueza - a.fraqueza)
    .slice(0, 10)
    .map((d) => ({ ...d, topicoId: d.id.split('.').slice(0, 3).join('.'), fraqueza: Math.round(d.fraqueza * 100) / 100 }));

  // Horas reais × planejadas nos módulos vencidos.
  const reais = todos<{ id: string; nome: string; horas: number; reais: number }>(ctx.db, `
    SELECT m.id, m.nome, m.horas, COALESCE((SELECT SUM(s.segundos_validos) FROM sessao_estudo s JOIN topico t ON t.id = s.topico_id
      WHERE s.usuario_id = :uid AND t.modulo_id = m.id), 0) / 3600.0 AS reais
    FROM modulo m JOIN progresso_modulo pm ON pm.modulo_id = m.id AND pm.usuario_id = :uid
    WHERE pm.vencido_em IS NOT NULL ORDER BY m.ordem`, { uid });

  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 1000 : null);
  return {
    personagem: p,
    horas: {
      total: p.horasTotais,
      meta: META_JORNADA,
      semana: semanas.at(-1)!.horas,
      metaSemana: p.metaSemana,
      media8: Math.round(media * 10) / 10,
      semanasBase: base,
      previsao,
      sequenciaDias: sequencia,
    },
    semanas,
    atos: atos.map((a) => {
      const t = porAto.find((x) => x.ato === a.id);
      const m = modulosVencidos.find((x) => x.ato === a.id);
      return {
        id: a.id, nome: a.nome, horasPlanejadas: a.horas, horasReais: Math.round((horasPorAto.get(a.id) ?? 0) * 10) / 10,
        modulos: m?.total ?? 0, vencidos: m?.n ?? 0,
        topicos: t?.topicos ?? 0, derrotados: t?.derrotados ?? 0, consolidados: t?.consolidados ?? 0, dominados: t?.dominados ?? 0,
      };
    }),
    trilhas: [...trilhas].map(([trilha, horas]) => ({ trilha, horas: Math.round(horas * 10) / 10 })).sort((a, b) => b.horas - a.horas),
    qualidade: {
      combatePrimeira: pct(primeiras.filter((x) => x.resultado === 'vitoria').length, primeiras.length),
      combates: primeiras.length,
      chefeVitorias: pct(chefes.v ?? 0, chefes.n),
      chefes: chefes.n,
      chefeAcerto: chefes.acerto === null ? null : Math.round(chefes.acerto * 1000) / 1000,
      fantasmas: fant.n,
      fantasmasVencidos: pct(fant.v ?? 0, fant.n),
      fantasmasAtrasados: atrasados,
      ajudaChefe: pct(ajuda.a, ajuda.q),
      metaAjuda: CONFIG.energia.ajudaMaxChefe,
    },
    fracos,
    reaisPlanejadas: reais.map((r) => ({ ...r, reais: Math.round(r.reais * 10) / 10, razao: r.horas ? Math.round((r.reais / r.horas) * 100) / 100 : null })),
  };
}
