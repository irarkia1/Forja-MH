import { CONFIG } from './config';

// Árvore de skills (PERSONAGEM-E-SKILLS.md, D013). Os números moram aqui.

export type Ramo = 'guerreiro' | 'estudioso' | 'estrategista' | 'explorador';

export interface Skill {
  id: string;
  ramo: Ramo;
  nome: string;
  efeito: string; // texto com {n} = nível
  nivelMax: number;
  custo: { tipo: 'fixo'; pontos: number } | { tipo: 'progressivo' }; // progressivo: nível k custa k
  energia?: number; // ativa: custo por uso
  requer?: { skill: string; nivel: number }[];
  pronta: boolean; // false = "em breve"
}

export const SKILLS: Skill[] = [
  // Guerreiro — valores do Matheus (D013)
  { id: 'vitalidade', ramo: 'guerreiro', nome: 'Vitalidade', efeito: '+1 de vida máxima por nível', nivelMax: 50, custo: { tipo: 'fixo', pontos: 1 }, pronta: true },
  { id: 'defesa', ramo: 'guerreiro', nome: 'Defesa', efeito: '+2% de redução de dano por nível (total até 80%)', nivelMax: 40, custo: { tipo: 'fixo', pontos: 1 }, requer: [{ skill: 'vitalidade', nivel: 3 }], pronta: true },
  { id: 'esquiva', ramo: 'guerreiro', nome: 'Esquiva', efeito: '+1% por nível de chance do golpe errar (máx. 50%)', nivelMax: 50, custo: { tipo: 'fixo', pontos: 1 }, requer: [{ skill: 'defesa', nivel: 1 }], pronta: true },
  { id: 'sorte', ramo: 'guerreiro', nome: 'Sorte', efeito: 'Dado alto (4+) rola de novo e fica o menor: {n} vez(es) por luta', nivelMax: 3, custo: { tipo: 'fixo', pontos: 3 }, requer: [{ skill: 'esquiva', nivel: 1 }], pronta: true },
  { id: 'regeneracao', ramo: 'guerreiro', nome: 'Regeneração', efeito: 'Cada acerto cura 0,05 × poder por nível', nivelMax: 20, custo: { tipo: 'fixo', pontos: 1 }, requer: [{ skill: 'defesa', nivel: 3 }], pronta: true },
  // Estudioso
  { id: 'foco', ramo: 'estudioso', nome: 'Foco Profundo', efeito: '+5% de XP de estudo por nível em sessões de 50 min ou mais', nivelMax: 5, custo: { tipo: 'progressivo' }, pronta: true },
  { id: 'memoria', ramo: 'estudioso', nome: 'Memória de Ferro', efeito: '+10% de XP por nível nos fantasmas vencidos', nivelMax: 5, custo: { tipo: 'progressivo' }, pronta: true },
  { id: 'ferreiro', ramo: 'estudioso', nome: 'Ferreiro', efeito: '+10% de XP por nível nas evidências de laboratório', nivelMax: 5, custo: { tipo: 'progressivo' }, pronta: true },
  { id: 'vigor', ramo: 'estudioso', nome: 'Vigor', efeito: '+2 de energia máxima por nível', nivelMax: 5, custo: { tipo: 'progressivo' }, requer: [{ skill: 'foco', nivel: 2 }], pronta: true },
  { id: 'recuperacao', ramo: 'estudioso', nome: 'Recuperação', efeito: 'Descanso do chefe: 48 h → 40 / 32 / 24 h', nivelMax: 3, custo: { tipo: 'progressivo' }, requer: [{ skill: 'memoria', nivel: 3 }], pronta: true },
  // Estrategista — ativas, gastam energia, nunca mostram a resposta
  { id: 'corte', ramo: 'estrategista', nome: 'Corte', efeito: 'Elimina 1 alternativa errada (nv. 3: 2 em questões de 5+)', nivelMax: 3, custo: { tipo: 'progressivo' }, energia: 2, pronta: true },
  { id: 'escudo', ramo: 'estrategista', nome: 'Escudo', efeito: 'Anula o dano de um erro; {n} uso(s) por luta (o erro conta no piso)', nivelMax: 3, custo: { tipo: 'progressivo' }, energia: 3, requer: [{ skill: 'corte', nivel: 1 }], pronta: true },
  { id: 'lupa', ramo: 'estrategista', nome: 'Lupa', efeito: 'Dica conceitual da questão (nunca o valor)', nivelMax: 3, custo: { tipo: 'progressivo' }, energia: 1, pronta: false },
  { id: 'segunda_chance', ramo: 'estrategista', nome: 'Segunda Chance', efeito: 'Errou? Explique o erro e responda uma questão irmã', nivelMax: 3, custo: { tipo: 'progressivo' }, energia: 3, pronta: false },
  { id: 'rascunho', ramo: 'estrategista', nome: 'Rascunho', efeito: 'Abre sua folha de fórmulas numa questão numérica', nivelMax: 1, custo: { tipo: 'progressivo' }, energia: 1, pronta: false },
  // Explorador — depende das variantes de chefe (F2)
  { id: 'olho', ramo: 'explorador', nome: 'Olho do Batedor', efeito: 'Revela a variante do chefe antes de entrar (ela fica fixa)', nivelMax: 1, custo: { tipo: 'progressivo' }, energia: 2, pronta: true },
  { id: 'folego', ramo: 'explorador', nome: 'Fôlego', efeito: '+15% de tempo por nível nas variantes cronometradas', nivelMax: 3, custo: { tipo: 'progressivo' }, pronta: true },
  { id: 'sangue_frio', ramo: 'explorador', nome: 'Sangue-Frio', efeito: 'Ataque surpresa do Traiçoeiro e ressurreição do Lich: dano −50%', nivelMax: 1, custo: { tipo: 'progressivo' }, requer: [{ skill: 'olho', nivel: 1 }], pronta: true },
  { id: 'mapa_estelar', ramo: 'explorador', nome: 'Mapa Estelar', efeito: 'Mostra quando cada fase será alcançada no seu ritmo', nivelMax: 1, custo: { tipo: 'progressivo' }, pronta: false },
];

export const SKILL_POR_ID = new Map(SKILLS.map((s) => [s.id, s]));

export type Niveis = Readonly<Record<string, number>>;
export const nv = (n: Niveis, id: string) => n[id] ?? 0;

export function custoDoNivel(s: Skill, nivelAlvo: number): number {
  return s.custo.tipo === 'fixo' ? s.custo.pontos : nivelAlvo;
}

export function pontosGastos(n: Niveis): number {
  let total = 0;
  for (const [id, nivel] of Object.entries(n)) {
    const s = SKILL_POR_ID.get(id);
    if (s) for (let k = 1; k <= nivel; k++) total += custoDoNivel(s, k);
  }
  return total;
}

export function podeEvoluir(s: Skill, n: Niveis, pontosLivres: number): { ok: true; custo: number } | { ok: false; motivo: string } {
  const atual = nv(n, s.id);
  if (!s.pronta) return { ok: false, motivo: 'Em breve' };
  if (atual >= s.nivelMax) return { ok: false, motivo: 'Nível máximo' };
  const falta = (s.requer ?? []).find((r) => nv(n, r.skill) < r.nivel);
  if (falta) return { ok: false, motivo: `Exige ${SKILL_POR_ID.get(falta.skill)?.nome} nv. ${falta.nivel}` };
  const custo = custoDoNivel(s, atual + 1);
  if (custo > pontosLivres) return { ok: false, motivo: `Faltam ${custo - pontosLivres} ponto(s)` };
  return { ok: true, custo };
}

// ---- Efeitos em números
export const defesaDeSkill = (n: Niveis) => 0.02 * nv(n, 'defesa');
export const esquivaDeSkill = (n: Niveis) => Math.min(CONFIG.personagem.esquivaMax, 0.01 * nv(n, 'esquiva'));
export const curaPorAcerto = (n: Niveis, poder: number) => Math.round(0.05 * nv(n, 'regeneracao') * poder * 100) / 100;
export const energiaMaxima = (n: Niveis) => CONFIG.energia.max + 2 * nv(n, 'vigor');
export const horasDeDescanso = (n: Niveis) => CONFIG.chefe.cooldownHoras - 8 * nv(n, 'recuperacao');
export const fatorTempo = (n: Niveis) => 1 + 0.15 * nv(n, 'folego');
export const bonusFoco = (n: Niveis) => 1 + 0.05 * nv(n, 'foco');
export const bonusMemoria = (n: Niveis) => 1 + 0.1 * nv(n, 'memoria');
export const bonusFerreiro = (n: Niveis) => 1 + 0.1 * nv(n, 'ferreiro');
