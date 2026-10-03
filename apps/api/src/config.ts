import { join, resolve } from 'node:path';

export interface ConfigApp {
  producao: boolean;
  host: string;
  porta: number;
  bancoCaminho: string;
  conteudoDir: string;
  webDist: string;
  // Fora de produção, questões em rascunho jogam (com selo "rascunho" na tela).
  aceitarRascunho: boolean;
  // SÓ fora de produção: multiplica o tempo contado, para testar sem esperar horas.
  fatorTempo: number;
  minQuestoesPorTopico: number;
}

const RAIZ = resolve(import.meta.dirname, '..', '..', '..');

export function lerConfig(env: NodeJS.ProcessEnv = process.env): ConfigApp {
  const producao = env.NODE_ENV === 'production';
  return {
    producao,
    host: env.HOST ?? '127.0.0.1',
    porta: Number(env.PORT ?? 8090),
    bancoCaminho: env.FORJA_DB ?? join(RAIZ, 'data', 'estudos.db'),
    conteudoDir: env.FORJA_CONTEUDO ?? join(RAIZ, 'conteudo'),
    webDist: join(RAIZ, 'apps', 'web', 'dist'),
    aceitarRascunho: producao ? env.FORJA_ACEITAR_RASCUNHO === '1' : env.FORJA_ACEITAR_RASCUNHO !== '0',
    fatorTempo: producao ? 1 : Math.max(1, Number(env.FORJA_FATOR_TEMPO ?? 1)),
    minQuestoesPorTopico: Number(env.FORJA_MIN_QUESTOES ?? 12),
  };
}
