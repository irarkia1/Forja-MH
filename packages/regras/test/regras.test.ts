import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  NIVEL_INICIAL,
  aplicarHoras,
  custoProximoNivel,
  danoDoGolpe,
  defesaDePreparo,
  defesaTotal,
  dependenciasDosTopicos,
  distribuirChefe,
  fraqueza,
  ganharXp,
  minimoDoTopicoSeg,
  nivelEsperado,
  poderDaFase,
  questoesDoChefe,
  registrar,
  requisitoAtendido,
  resultadoFinal,
  sortearCombate,
  topicoDisponivel,
  vidaDeBatalha,
  vidaMaxima,
  type QuestaoPool,
} from '../src';

const rngFixo = (seed = 1) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

describe('curva por faixas (D014)', () => {
  it('cada nível custa o dobro dentro da faixa', () => {
    expect(custoProximoNivel({ faixa: 0, niveisNaFaixa: 0 })).toBe(100);
    expect(custoProximoNivel({ faixa: 0, niveisNaFaixa: 4 })).toBe(1600);
    expect(custoProximoNivel({ faixa: 1, niveisNaFaixa: 0 })).toBe(200);
  });

  it('ganhar XP sobe vários níveis quando sobra', () => {
    const r = ganharXp(NIVEL_INICIAL, 100 + 200 + 50);
    expect(r.estado.nivel).toBe(3);
    expect(r.estado.xpFaixa).toBe(50);
    expect(r.niveisGanhos).toBe(2);
  });

  it('Marco: nível preso sobe, barra zera, custo volta à base da nova faixa', () => {
    const preso = { nivel: 11, faixa: 0, niveisNaFaixa: 10, xpFaixa: 40_000, xpTotal: 150_000 };
    const r = aplicarHoras(preso, 2000);
    expect(r.marcos).toBe(1);
    expect(r.estado).toMatchObject({ nivel: 12, faixa: 1, niveisNaFaixa: 0, xpFaixa: 0, xpTotal: 150_000 });
    expect(custoProximoNivel(r.estado)).toBe(200);
  });

  it('XP sozinho nunca cruza Marco', () => {
    const r = ganharXp(NIVEL_INICIAL, 10_000_000);
    expect(r.estado.faixa).toBe(0);
  });

  it('nível esperado bate com a tabela do BALANCEAMENTO', () => {
    expect(nivelEsperado(0)).toBe(1);
    expect(nivelEsperado(10)).toBe(4);
    expect(nivelEsperado(100)).toBe(7);
    expect(nivelEsperado(1999)).toBe(11);
    expect(nivelEsperado(2050)).toBe(16);
    expect(nivelEsperado(10_000)).toBe(45);
  });

  it('vida = 6 + (nível − 1) + vitalidade', () => {
    expect(vidaMaxima(1)).toBe(6);
    expect(vidaMaxima(17, 3)).toBe(25);
  });
});

describe('combate (D010, D015)', () => {
  it('exemplo do documento: dado 5, defesa 30%, poder 1 → 3,5', () => {
    expect(danoDoGolpe({ dado: 5, poder: 1, defesa: 0.3, perfuracao: 0 })).toBe(3.5);
  });

  it('perfuração ignora parte da defesa', () => {
    expect(danoDoGolpe({ dado: 4, poder: 1, defesa: 0.5, perfuracao: 0.5 })).toBe(3);
  });

  it('poder das fases segue a tabela', () => {
    expect(poderDaFase(0)).toBe(1);
    expect(poderDaFase(380)).toBe(2.33);
    expect(poderDaFase(0, { elite: true })).toBe(1.25);
    expect(poderDaFase(0, { adaptacao: 2 })).toBe(1.2);
  });

  it('preparo: +5% a cada 10% além do mínimo, máx. 20%', () => {
    expect(defesaDePreparo(100, 100)).toBe(0);
    expect(defesaDePreparo(110, 100)).toBe(0.05);
    expect(defesaDePreparo(135, 100)).toBe(0.15);
    expect(defesaDePreparo(500, 100)).toBe(0.2);
    expect(defesaTotal(0.75, 0.2)).toBe(CONFIG.personagem.defesaMax);
  });

  it('piso: 0/3 perde com vida sobrando; chefe abaixo de 60% perde', () => {
    expect(resultadoFinal({ tipo: 'combate', acertos: 0, total: 3, vida: 6 })).toEqual({ resultado: 'derrota', motivo: 'piso' });
    expect(resultadoFinal({ tipo: 'combate', acertos: 1, total: 3, vida: 0.1 })).toEqual({ resultado: 'vitoria' });
    expect(resultadoFinal({ tipo: 'combate', acertos: 3, total: 3, vida: 0 })).toEqual({ resultado: 'derrota', motivo: 'vida' });
    expect(resultadoFinal({ tipo: 'chefe', acertos: 27, total: 47, vida: 50 }).resultado).toBe('derrota');
    expect(resultadoFinal({ tipo: 'chefe', acertos: 6, total: 10, vida: 1 }).resultado).toBe('vitoria');
  });

  it('chefe: N = clamp(h/3, 10, 100) e vida de batalha', () => {
    expect(questoesDoChefe(40)).toBe(13);
    expect(questoesDoChefe(20)).toBe(10);
    expect(questoesDoChefe(1000)).toBe(100);
    expect(vidaDeBatalha(22, 47)).toBe(147.7);
  });

  it('tempo mínimo = 60% arredondado a 15 min (exemplo do M0.4)', () => {
    expect(minimoDoTopicoSeg(140 / 11)).toBe(7 * 3600 + 45 * 60);
    expect(minimoDoTopicoSeg((140 * 2) / 11)).toBe(15 * 3600 + 15 * 60);
  });
});

describe('fraqueza', () => {
  it('começa neutra e cai com acertos; erros antigos pesam menos', () => {
    expect(fraqueza(undefined)).toBe(0.5);
    const t0 = new Date('2026-01-01');
    let d = registrar(undefined, false, t0);
    d = registrar(d, false, t0);
    const recente = fraqueza(d);
    const depois = registrar(d, true, new Date('2026-03-02'));
    expect(fraqueza(depois)).toBeLessThan(recente);
  });
});

describe('sorteio', () => {
  const pool: QuestaoPool[] = Array.from({ length: 14 }, (_, i) => ({
    id: `Q${i}`,
    topicoId: 'T',
    objetivoId: `O${(i % 4) + 1}`,
    dificuldade: (i % 4) + 1,
  }));

  it('combate: 3 distintas, ≥ 2 com dificuldade ≥ 2, evita vistas', () => {
    for (let s = 1; s < 50; s++) {
      const vistas = new Set(['Q0', 'Q1', 'Q2']);
      const q = sortearCombate({ pool, vistasRecentes: vistas, fraquezaObjetivo: new Map(), objetivosComErro: new Set(), adaptacao: 0, rng: rngFixo(s) });
      expect(new Set(q.map((x) => x.id)).size).toBe(3);
      expect(q.filter((x) => x.dificuldade >= 2).length).toBeGreaterThanOrEqual(2);
      expect(q.some((x) => vistas.has(x.id))).toBe(false);
    }
  });

  it('inimigo adaptado: ≥ 2 questões dos objetivos com erro', () => {
    for (let s = 1; s < 50; s++) {
      const q = sortearCombate({
        pool,
        vistasRecentes: new Set(),
        fraquezaObjetivo: new Map([['O3', 0.8]]),
        objetivosComErro: new Set(['O3']),
        adaptacao: 1,
        rng: rngFixo(s),
      });
      expect(q.filter((x) => x.objetivoId === 'O3').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('chefe: cobre todos os tópicos e respeita o total, mesmo com adaptação 5', () => {
    const topicos = ['A', 'B', 'C', 'D'].map((id, i) => ({
      id,
      horas: 5 + i,
      fraqueza: id === 'D' ? 0.9 : 0.2,
      pool: pool.map((q) => ({ ...q, id: id + q.id, topicoId: id })),
    }));
    for (const adapt of [0, 5]) {
      const cota = distribuirChefe(topicos, 13, adapt);
      expect([...cota.values()].reduce((a, b) => a + b, 0)).toBe(13);
      for (const t of topicos) expect(cota.get(t.id)).toBeGreaterThanOrEqual(1);
    }
    expect(distribuirChefe(topicos, 13, 5).get('D')!).toBeGreaterThan(distribuirChefe(topicos, 13, 0).get('D')!);
  });
});

describe('progresso', () => {
  it('requisito "A|B" basta um', () => {
    expect(requisitoAtendido(['M1.4|M1.6'], new Set(['M1.6']))).toBe(true);
    expect(requisitoAtendido(['M0.2', 'M0.4'], new Set(['M0.2']))).toBe(false);
  });

  it('sem depois_de depende do anterior; lista vazia é livre', () => {
    const deps = dependenciasDosTopicos([{ id: 'T1' }, { id: 'T2' }, { id: 'T3', depoisDe: [] }]);
    expect(deps.get('T2')).toEqual(['T1']);
    expect(topicoDisponivel('T3', deps, new Set())).toBe(true);
    expect(topicoDisponivel('T2', deps, new Set())).toBe(false);
  });
});

import { etapaEfetiva, proximaRevisao, regraDaEtapa } from '../src';

describe('fantasmas', () => {
  it('agenda 1/3/7/21/60 e volta à etapa 1 quando erra', () => {
    expect(proximaRevisao(1, true)).toEqual({ etapa: 2, dias: 3 });
    expect(proximaRevisao(3, true)).toEqual({ etapa: 4, dias: 21 });
    expect(proximaRevisao(5, true)).toEqual({ concluido: true });
    expect(proximaRevisao(4, false)).toEqual({ etapa: 1, dias: 1 });
  });

  it('regras por etapa e rebaixamento por atraso', () => {
    expect(regraDaEtapa(1)).toEqual({ questoes: 2, minimo: 2 });
    expect(regraDaEtapa(5)).toEqual({ questoes: 3, minimo: 3 });
    const vence = new Date('2026-10-01');
    expect(etapaEfetiva(3, vence, new Date('2026-10-05'))).toBe(3);
    expect(etapaEfetiva(3, vence, new Date('2026-10-12'))).toBe(2);
  });
});

import { VARIANTES, fatorDano, pontosOraculo, proximaFuria, sortearVariante, variantesPossiveis, dano } from '../src';

describe('chefes', () => {
  it('são 20 variantes; sem marcas, Espelho, Engenheiro, Colosso, Arquivista e Bancada ficam de fora', () => {
    expect(VARIANTES).toHaveLength(20);
    const ids = variantesPossiveis(new Set(), false).map((v) => v.id);
    for (const fora of ['espelho', 'engenheiro', 'colosso', 'arquivista', 'bancada']) expect(ids).not.toContain(fora);
    expect(variantesPossiveis(new Set(['pratico']), true).map((v) => v.id)).toEqual(['bancada']);
  });

  it('nunca repete as 3 últimas', () => {
    let s = 7;
    const rng = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 200; i++) {
      const v = sortearVariante({ marcas: new Set(), integrador: false, ultimas: ['guardiao', 'hidra', 'lich'], rng });
      expect(['guardiao', 'hidra', 'lich']).not.toContain(v.id);
    }
  });

  it('fator do dano, fúria e pontos do oráculo', () => {
    expect(fatorDano(dano())).toBe(1);
    expect(fatorDano(dano(2))).toBe(2);
    expect(fatorDano(dano(1, 0, 0.5))).toBe(0.5);
    expect(proximaFuria({ nivel: 3, seq: 2 }, true)).toEqual({ nivel: 4, seq: 0 });
    expect(proximaFuria({ nivel: 1, seq: 1 }, false)).toEqual({ nivel: 1, seq: 0 });
    expect(pontosOraculo([{ correta: true, conf: 3 }, { correta: false, conf: 3 }, { correta: false, conf: 1 }])).toBe(1);
  });
});
