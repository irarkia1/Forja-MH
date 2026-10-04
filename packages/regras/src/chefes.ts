import type { Rng } from './sorteio';

// As 20 variantes de chefe (docs/05-RPG/CHEFES.md, D008). Aqui só o catálogo
// e as contas puras; a montagem das questões fica no servidor.

export interface Dano {
  dados: number; // quantos dados de 0 a 6
  soma: number; // + k
  mult: number; // × m
}

export const D: Dano = { dados: 1, soma: 0, mult: 1 };
export const dano = (dados = 1, soma = 0, mult = 1): Dano => ({ dados, soma, mult });

export function textoDano(d: Dano): string {
  const base = d.dados === 1 ? 'D' : `${d.dados}D`;
  const soma = d.soma ? `+${d.soma}` : '';
  const mult = d.mult === 1 ? '' : d.mult === 0.5 ? ' ÷ 2' : ` × ${d.mult}`;
  return `${base}${soma}${mult}`;
}

// Quanto este dado bate, em média, comparado ao D normal (média 3).
export function fatorDano(d: Dano): number {
  return ((3 * d.dados + d.soma) * d.mult) / 3;
}

export interface Variante {
  id: string;
  nome: string;
  frase: string;
  regra: string;
  peso: number;
  exige?: string[]; // basta uma destas marcas no módulo
  pratica?: boolean; // aceita em módulo integrador
}

export const VARIANTES: Variante[] = [
  { id: 'guardiao', nome: 'O Guardião', frase: 'Ninguém passa sem provar que sabe.', regra: 'Prova direta. Chegue vivo ao fim com pelo menos 60% de acerto.', peso: 10 },
  { id: 'hidra', nome: 'Hidra de Duas Cabeças', frase: 'Corte uma cabeça e a outra vem com perguntas novas.', regra: 'Cabeça 1 com 60% das questões; ao cair, a cabeça 2 surge com o resto, batendo D+1. A vida não volta entre cabeças. 60% em cada cabeça.', peso: 10 },
  { id: 'golem', nome: 'Golem de Três Núcleos', frase: 'Três núcleos, três partes do módulo.', regra: 'Cada núcleo cobre um terço dos tópicos. Entre núcleos você recupera 25% da vida. 60% em cada núcleo.', peso: 10 },
  { id: 'traicoeiro', nome: 'O Traiçoeiro', frase: 'Quando você acha que acabou…', regra: 'Depois das questões normais vem um ataque surpresa: a questão mais difícil do módulo, batendo 3D.', peso: 10 },
  { id: 'lich', nome: 'Lich Ressurgente', frase: 'A morte é só uma pausa.', regra: 'Vencido, ele ressurge com +25% de questões só dos temas que você errou (você recupera 30% da vida; ele bate D+1). 60% nas duas partes.', peso: 10 },
  { id: 'cronomante', nome: 'Cronomante', frase: 'O tempo é a arma dele.', regra: '90 s por questão (numéricas 180 s). Tempo esgotado conta como erro.', peso: 10 },
  { id: 'espelho', nome: 'Espelho Quebrado', frase: 'Encontre o defeito no reflexo.', regra: '40% das questões são "ache o erro"; errar uma delas bate D × 1,5.', peso: 10, exige: ['achar_erro'] },
  { id: 'engenheiro', nome: 'Engenheiro Sombrio', frase: 'Três projetos, três armadilhas.', regra: 'Três estudos de caso com questões encadeadas; erros seguidos no mesmo caso batem mais.', peso: 10, exige: ['caso'], pratica: true },
  { id: 'enxame', nome: 'O Enxame', frase: 'Muitos, rápidos, pequenos.', regra: '1,5 × as questões, 45 s cada, mais fáceis. Cada picada bate D ÷ 2. Precisa de 70%.', peso: 10 },
  { id: 'colosso', nome: 'Colosso Numérico', frase: 'Só números sobrevivem.', regra: 'Menos questões, todas de cálculo. Cada erro bate 2D.', peso: 10, exige: ['calculo'] },
  { id: 'arquivista', nome: 'O Arquivista', frase: 'Ele guarda tudo o que você já estudou.', regra: 'As questões do módulo + 30% de módulos anteriores da mesma trilha (essas batem D+1). 60% em cada parte.', peso: 10, exige: ['arquivo'] },
  { id: 'furia', nome: 'Fúria Crescente', frase: 'Cada acerto o deixa mais furioso.', regra: 'A dificuldade sobe a cada 3 acertos seguidos e desce a cada erro; o dano cresce com ela. Vence quem soma pontos (acerto × dificuldade) ≥ 70% do que valeria acertar tudo no nível 3.', peso: 10 },
  { id: 'purista', nome: 'O Purista', frase: 'Sem truques. Só você.', regra: 'Nenhuma skill ativa (passivas valem), sem pausa de mais de 24 h. Precisa de 65%. Vale +50% de XP.', peso: 10 },
  { id: 'feynman', nome: 'Duelo de Feynman', frase: 'Se não sabe explicar, não sabe.', regra: '80% das questões + 1 explicação escrita de um objetivo do módulo, conferida por você numa rubrica de 4 pontos (precisa de 3). Rubrica falha bate 3D.', peso: 10 },
  { id: 'mimico', nome: 'O Mímico', frase: 'Parece fácil. Não é.', regra: 'As questões em que mais gente erra, com distratores fortes. Piso menor: 55%.', peso: 10 },
  { id: 'bancada', nome: 'Senhor da Bancada', frase: 'Mostre na bancada.', regra: 'Antes de começar, registre uma tarefa prática do módulo. Depois, metade das questões, dos tópicos de laboratório, batendo 2D.', peso: 10, exige: ['pratico'], pratica: true },
  { id: 'dragao', nome: 'Dragão de Três Fases', frase: 'Ele fica mais forte a cada fase.', regra: 'Fácil → médio → difícil. Dano D, 2D e 3D. A 3ª fase tem 120 s por questão. Piso 60% / 70% / 70%.', peso: 10 },
  { id: 'vampiro', nome: 'O Vampiro', frase: 'Cada erro alimenta a sede dele.', regra: 'Cada erro dá dano e acrescenta 1 questão (até +20%). Cada acerto cura você em 1 × poder.', peso: 10 },
  { id: 'gemeos', nome: 'Os Gêmeos', frase: 'Dois inimigos, duas frentes.', regra: 'Duas provas intercaladas com tópicos separados. Sua vida vira duas barras, uma por gêmeo: se qualquer uma zerar, você cai. 60% em cada gêmeo.', peso: 10 },
  { id: 'oraculo', nome: 'Oráculo Cego', frase: 'Você só saberá no fim.', regra: 'Sem correção nem dano até o fim. Cada resposta leva confiança 1–3. No fim: erro bate D × confiança; acerto com confiança 3 cura. Pontos (acerto = +confiança, erro = −(confiança−1)) ≥ 60% do máximo.', peso: 10 },
];

export const VARIANTE_POR_ID = new Map(VARIANTES.map((v) => [v.id, v]));

// Sorteio ponderado entre as possíveis, sem repetir as 3 últimas (D008).
export function variantesPossiveis(marcas: ReadonlySet<string>, integrador: boolean): Variante[] {
  return VARIANTES.filter((v) => (!v.exige || v.exige.some((m) => marcas.has(m))) && (!integrador || v.pratica));
}

export function sortearVariante(p: { marcas: ReadonlySet<string>; integrador: boolean; ultimas: readonly string[]; rng: Rng }): Variante {
  let opcoes = variantesPossiveis(p.marcas, p.integrador);
  if (!opcoes.length) opcoes = [VARIANTE_POR_ID.get('guardiao')!];
  const frescas = opcoes.filter((v) => !p.ultimas.slice(0, 3).includes(v.id));
  const base = frescas.length ? frescas : opcoes;
  const total = base.reduce((s, v) => s + v.peso, 0);
  let x = p.rng() * total;
  for (const v of base) if ((x -= v.peso) < 0) return v;
  return base.at(-1)!;
}

// Fúria Crescente: sobe a cada 3 acertos seguidos, desce a cada erro (1..5).
export function proximaFuria(f: { nivel: number; seq: number }, correta: boolean): { nivel: number; seq: number } {
  if (!correta) return { nivel: Math.max(1, f.nivel - 1), seq: 0 };
  return f.seq + 1 >= 3 ? { nivel: Math.min(5, f.nivel + 1), seq: 0 } : { nivel: f.nivel, seq: f.seq + 1 };
}

// Oráculo Cego: acerto vale a confiança; erro tira (confiança − 1).
export function pontosOraculo(respostas: readonly { correta: boolean; conf: number }[]): number {
  return respostas.reduce((s, r) => s + (r.correta ? r.conf : -(r.conf - 1)), 0);
}

export const RUBRICA_FEYNMAN = [
  'Defini o conceito com as minhas palavras, sem copiar',
  'Dei um exemplo concreto (número, circuito, comando ou situação)',
  'Expliquei um erro comum ou uma armadilha',
  'Liguei o tema a outro tópico do módulo',
] as const;
