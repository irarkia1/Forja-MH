import { CONFIG } from './config';

export type Rng = () => number; // [0, 1)

export interface QuestaoPool {
  id: string;
  topicoId: string;
  objetivoId: string;
  dificuldade: number;
}

export function embaralhar<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function fracaoPontosFracos(adaptacao: number): number {
  const { fracoBase, fracoPorNivel, fracoMax } = CONFIG.adaptacao;
  return Math.min(fracoMax, fracoBase + fracoPorNivel * adaptacao);
}

export function fracaoDificeis(adaptacao: number): number {
  const { dificilBase, dificilPorNivel, dificilMax } = CONFIG.adaptacao;
  return Math.min(dificilMax, dificilBase + dificilPorNivel * adaptacao);
}

// Combate: 3 questões; evita as vistas há pouco; ≥ 2 com dificuldade ≥ 2;
// inimigo adaptado tira ≥ 2 dos objetivos em que você errou.
export function sortearCombate(p: {
  pool: readonly QuestaoPool[];
  vistasRecentes: ReadonlySet<string>;
  fraquezaObjetivo: ReadonlyMap<string, number>;
  objetivosComErro: ReadonlySet<string>;
  adaptacao: number;
  rng: Rng;
  quantidade?: number;
}): QuestaoPool[] {
  const n = p.quantidade ?? CONFIG.combate.questoes;
  const frescas = p.pool.filter((q) => !p.vistasRecentes.has(q.id));
  const base = frescas.length >= n ? frescas : [...p.pool];
  const escolhidas: QuestaoPool[] = [];
  const usar = (q: QuestaoPool | undefined) => {
    if (q && !escolhidas.includes(q)) escolhidas.push(q);
  };

  if (p.adaptacao >= 1 && p.objetivosComErro.size > 0) {
    const alvo = embaralhar(
      base.filter((q) => p.objetivosComErro.has(q.objetivoId)),
      p.rng,
    ).sort((a, b) => (p.fraquezaObjetivo.get(b.objetivoId) ?? 0) - (p.fraquezaObjetivo.get(a.objetivoId) ?? 0));
    for (const q of alvo) if (escolhidas.length < Math.min(2, n)) usar(q);
  }

  // Garante pelo menos 2 com dificuldade ≥ 2.
  const medias = embaralhar(base.filter((q) => q.dificuldade >= 2), p.rng);
  while (escolhidas.filter((q) => q.dificuldade >= 2).length < Math.min(2, n) && medias.length) usar(medias.shift());

  // Completa variando objetivos.
  for (const q of embaralhar(base, p.rng)) {
    if (escolhidas.length >= n) break;
    if (!escolhidas.some((e) => e.objetivoId === q.objetivoId)) usar(q);
  }
  for (const q of embaralhar(base, p.rng)) {
    if (escolhidas.length >= n) break;
    usar(q);
  }
  return embaralhar(escolhidas.slice(0, n), p.rng);
}

export interface TopicoChefe {
  id: string;
  horas: number;
  fraqueza: number;
  pool: readonly QuestaoPool[];
}

// Quantas questões cada tópico recebe na prova do chefe:
// cobertura (1 por tópico) + fração nos pontos fracos + resto por horas.
export function distribuirChefe(topicos: readonly TopicoChefe[], total: number, adaptacao: number): Map<string, number> {
  const cota = new Map<string, number>(topicos.map((t) => [t.id, 0]));
  const cabe = (t: TopicoChefe) => (cota.get(t.id) ?? 0) < t.pool.length;
  const somar = (t: TopicoChefe) => cota.set(t.id, (cota.get(t.id) ?? 0) + 1);
  let restante = total;

  for (const t of topicos) {
    if (restante > 0 && cabe(t)) {
      somar(t);
      restante--;
    }
  }

  const fracos = Math.round(restante * fracaoPontosFracos(adaptacao));
  const porFraqueza = [...topicos].sort((a, b) => b.fraqueza - a.fraqueza);
  const pesoFraqueza = porFraqueza.reduce((s, t) => s + t.fraqueza, 0) || 1;
  restante -= repartir(porFraqueza, fracos, (t) => t.fraqueza / pesoFraqueza, cabe, somar);

  const pesoHoras = topicos.reduce((s, t) => s + t.horas, 0) || 1;
  restante -= repartir(topicos, restante, (t) => t.horas / pesoHoras, cabe, somar);

  // Sobra (pools pequenos): espalha onde couber.
  for (let i = 0; restante > 0 && i < total * topicos.length; i++) {
    const t = topicos[i % topicos.length]!;
    if (cabe(t)) {
      somar(t);
      restante--;
    }
  }
  return cota;
}

// Maior resto: reparte `n` vagas proporcionalmente a `peso`.
function repartir(
  ts: readonly TopicoChefe[],
  n: number,
  peso: (t: TopicoChefe) => number,
  cabe: (t: TopicoChefe) => boolean,
  somar: (t: TopicoChefe) => void,
): number {
  if (n <= 0) return 0;
  const alvo = ts.map((t) => ({ t, exato: n * peso(t) }));
  let dados = 0;
  for (const a of alvo) {
    for (let k = 0; k < Math.floor(a.exato) && dados < n && cabe(a.t); k++) {
      somar(a.t);
      dados++;
    }
  }
  for (const a of [...alvo].sort((x, y) => (y.exato % 1) - (x.exato % 1))) {
    if (dados >= n) break;
    if (cabe(a.t)) {
      somar(a.t);
      dados++;
    }
  }
  return dados;
}

export function sortearChefe(p: {
  topicos: readonly TopicoChefe[];
  total: number;
  adaptacao: number;
  vistasRecentes: ReadonlySet<string>;
  fraquezaObjetivo: ReadonlyMap<string, number>;
  rng: Rng;
}): QuestaoPool[] {
  const cota = distribuirChefe(p.topicos, p.total, p.adaptacao);
  const dificeis = fracaoDificeis(p.adaptacao);
  const escolhidas: QuestaoPool[] = [];
  for (const t of p.topicos) {
    const n = cota.get(t.id) ?? 0;
    if (!n) continue;
    // Inéditas primeiro, objetivos fracos primeiro; respeita a parcela de difíceis.
    const ordenadas = embaralhar(t.pool, p.rng).sort(
      (a, b) =>
        Number(p.vistasRecentes.has(a.id)) - Number(p.vistasRecentes.has(b.id)) ||
        (p.fraquezaObjetivo.get(b.objetivoId) ?? 0.5) - (p.fraquezaObjetivo.get(a.objetivoId) ?? 0.5),
    );
    const querDificeis = Math.round(n * dificeis);
    const daqui: QuestaoPool[] = [];
    for (const q of ordenadas) if (daqui.length < querDificeis && q.dificuldade >= 4) daqui.push(q);
    for (const q of ordenadas) if (daqui.length < n && !daqui.includes(q)) daqui.push(q);
    escolhidas.push(...daqui);
  }
  return embaralhar(escolhidas, p.rng);
}
