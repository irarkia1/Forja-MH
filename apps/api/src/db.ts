import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Db = DatabaseSync;
type Valor = string | number | bigint | null | Uint8Array;
export type Params = Record<string, Valor | boolean | undefined>;

const PASTA_MIGRACOES = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export function abrirBanco(caminho: string): Db {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (caminho !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrar(db);
  return db;
}

function migrar(db: Db): void {
  db.exec('CREATE TABLE IF NOT EXISTS migracao (versao TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)');
  const feitas = new Set(db.prepare('SELECT versao FROM migracao').all().map((r) => String(r.versao)));
  for (const arquivo of readdirSync(PASTA_MIGRACOES).filter((f) => f.endsWith('.sql')).sort()) {
    if (feitas.has(arquivo)) continue;
    transacao(db, () => {
      db.exec(readFileSync(join(PASTA_MIGRACOES, arquivo), 'utf8'));
      db.prepare('INSERT INTO migracao (versao, aplicada_em) VALUES (?, ?)').run(arquivo, new Date().toISOString());
    });
  }
}

export function transacao<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// Booleans viram 0/1; undefined vira null.
function limpar(p: Params = {}): Record<string, Valor> {
  const out: Record<string, Valor> = {};
  for (const [k, v] of Object.entries(p)) out[k] = v === undefined ? null : typeof v === 'boolean' ? Number(v) : v;
  return out;
}

export function um<T>(db: Db, sql: string, p?: Params): T | undefined {
  return db.prepare(sql).get(limpar(p)) as T | undefined;
}

export function todos<T>(db: Db, sql: string, p?: Params): T[] {
  return db.prepare(sql).all(limpar(p)) as T[];
}

export function exec(db: Db, sql: string, p?: Params): { changes: number; lastInsertRowid: number } {
  const r = db.prepare(sql).run(limpar(p));
  return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
}
