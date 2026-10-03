import type { Db } from './db';
import type { ConfigApp } from './config';

// Tudo que os serviços precisam do mundo lá fora — injetável nos testes.
export interface Contexto {
  db: Db;
  config: ConfigApp;
  agora: () => Date;
  rng: () => number; // [0, 1) — sorteio de questões e alternativas
  dado: () => number; // 0..6 — sempre no servidor (D010)
}
