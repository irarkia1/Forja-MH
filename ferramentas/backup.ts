// Copia consistente do banco (VACUUM INTO): 30 diárias + 12 mensais.
// Uso: tsx ferramentas/backup.ts <pasta-de-destino>
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { lerConfig } from '../apps/api/src/config';

const destino = process.argv[2] ?? 'data/copias';
mkdirSync(destino, { recursive: true });
const hoje = new Date().toISOString().slice(0, 10);
const arquivo = join(destino, `estudos-${hoje}.db`);
const db = new DatabaseSync(lerConfig().bancoCaminho);
try {
  unlinkSync(arquivo);
} catch { /* não existia */ }
db.exec(`VACUUM INTO '${arquivo.replace(/'/g, "''")}'`);
db.close();

// Retenção: mantém as 30 mais novas e a primeira de cada mês dos últimos 12.
const copias = readdirSync(destino).filter((f) => /^estudos-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().reverse();
const primeiraDoMes = new Map<string, string>();
for (const f of [...copias].reverse()) if (!primeiraDoMes.has(f.slice(8, 15))) primeiraDoMes.set(f.slice(8, 15), f);
const manter = new Set([...copias.slice(0, 30), ...[...primeiraDoMes.values()].slice(-12)]);
for (const f of copias) if (!manter.has(f)) unlinkSync(join(destino, f));
console.log(`✔ backup: ${arquivo} (${manter.size} cópias guardadas)`);
