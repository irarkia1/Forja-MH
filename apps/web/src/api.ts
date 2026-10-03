// Cliente HTTP. Caminhos relativos ("api/...") para funcionar em / e em /estudos/.

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly dados: Record<string, unknown>,
  ) {
    super(mensagem);
  }
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const r = await fetch(`api/${caminho}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new ErroApi(r.status, String(json.erro ?? 'erro'), String(json.mensagem ?? 'Algo deu errado.'), json);
  return json as T;
}

export const api = {
  get: <T>(c: string) => chamar<T>('GET', c),
  post: <T>(c: string, corpo: unknown = {}) => chamar<T>('POST', c, corpo),
  put: <T>(c: string, corpo: unknown) => chamar<T>('PUT', c, corpo),
  beacon: (c: string) => navigator.sendBeacon?.(`api/${c}`),
};

// ---- Tipos das respostas -----------------------------------------------------

export interface Personagem {
  nivel: number;
  faixa: number;
  xpFaixa: number;
  xpProximo: number;
  xpTotal: number;
  vida: number;
  defesa: number;
  pontosSkill: number;
  horasTotais: number;
  horasSemana: number;
  metaSemana: number;
  proximoMarco: number | null;
  posicao: { ato: string; modulo: string | null; no: string | null } | null;
}

export interface Ato { id: string; nome: string; regiao: string; lema: string; horas: number; ordem: number }
export type EstadoModulo = 'bloqueado' | 'em_preparo' | 'disponivel' | 'em_andamento' | 'vencido';
export interface ModuloMapa { id: string; ato: string; nome: string; horas: number; trilha: string; ordem: number; requer: string[]; estado: EstadoModulo }
export interface Mapa { atos: Ato[]; modulos: ModuloMapa[]; personagem: Personagem }

export type EstadoTopico = 'bloqueado' | 'disponivel' | 'em_estudo' | 'pronto' | 'derrotado';
export interface TopicoFase {
  id: string; nome: string; tipo: 'comum' | 'elite'; estado: EstadoTopico; depoisDe: string[]; horas: number;
  minimoSeg: number; exigidoSeg: number; estudadoSeg: number; adaptacao: number; poder: number; perfuracao: number;
  vitorias: number; derrotas: number;
}
export interface Fase {
  modulo: { id: string; ato: string; nome: string; missao: string | null; horas: number; trilha: string; estado: EstadoModulo };
  topicos: TopicoFase[];
  chefe: { estado: 'bloqueado' | 'liberado' | 'vencido'; questoes: number; cooldownAte: string | null; adaptacao: number; poder: number; perfuracao: number };
}

export interface Sessao { id: number; topicoId: string; aberta: boolean; segundosSessao: number; estudadoSeg: number; checkinNecessario: boolean; prazoCheckin: string; perdeuCheckin: boolean }
export interface DetalheTopico extends TopicoFase {
  modulo: { id: string; nome: string };
  objetivos: { id: string; texto: string }[];
  roteiro: string | null;
  nota: string | null;
  evidencias: { id: number; descricao_md: string; link: string | null; criada_em: string }[];
  sessao: Sessao | null;
}

export interface QuestaoTela {
  ordem: number; total: number; id: string; tipo: 'unica' | 'multipla' | 'vf' | 'numerica';
  enunciado: string; alternativas?: string[]; unidade?: string; dificuldade: number; rascunho: boolean;
}
export interface Ganho { xp: number; niveisGanhos: number; marcos: number; nivel: number }
export interface Luta {
  tentativaId: number; tipo: 'combate' | 'chefe'; alvoNome: string; moduloId: string; alvoId?: string; total: number; trilha: string; elite: boolean;
  poder: number; vidaMax: number; defesa: number; perfuracao: number; adaptacao: number; revanche: boolean; piso: number;
  variante: { id: string; nome: string; regra: string } | null; vida: number; acertos?: number; questao: QuestaoTela;
}
export interface Fim {
  resultado: 'vitoria' | 'derrota'; motivo: 'vida' | 'piso' | 'fuga' | null; critico: boolean; acertos: number;
  respondidas: number; total: number; revanche: boolean; ganho: Ganho; adaptacaoNova: number;
}
export interface Retorno {
  correta: boolean; gabarito: unknown; explicacao: string; fonte: string;
  golpe: { dado: number; dano: number; vidaAntes: number; vida: number } | null;
  vida: number; vidaMax: number; acertos: number; fim: Fim | null; proxima: QuestaoTela | null;
}
export interface Eu { personagem: Personagem; luta: Luta | null; sessao: string | null; dev?: { fatorTempo: number } }
