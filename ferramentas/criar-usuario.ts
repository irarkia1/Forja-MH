// Uso: npm run criar-usuario -- <login> [--admin]   (a senha é pedida no terminal)
import { createInterface } from 'node:readline/promises';
import { lerConfig } from '../apps/api/src/config';
import { abrirBanco, exec, um } from '../apps/api/src/db';
import { criarUsuario, hashSenha } from '../apps/api/src/servicos/auth';

const login = (process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '').trim().toLowerCase();
const papel = process.argv.includes('--admin') ? 'admin' : 'jogador';
if (!login) {
  console.error('Uso: npm run criar-usuario -- <login>');
  process.exit(1);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
const senha = process.env.FORJA_SENHA ?? (await rl.question('Senha (mín. 8): '));
rl.close();
const config = lerConfig();
const db = abrirBanco(config.bancoCaminho);
const existente = um<{ id: number }>(db, 'SELECT id FROM usuario WHERE login = :login', { login });
if (existente) {
  if (senha.length < 8) throw new Error('senha curta');
  exec(db, 'UPDATE usuario SET senha_hash = :h, papel = :p WHERE id = :id', { h: await hashSenha(senha), p: papel, id: existente.id });
  exec(db, 'DELETE FROM sessao_login WHERE usuario_id = :id', { id: existente.id });
  console.log(`✔ senha de ${login} trocada (${papel})`);
} else {
  const ctx = { db, config, agora: () => new Date(), rng: Math.random, dado: () => 0 };
  await criarUsuario(ctx, login, senha, papel);
  console.log(`✔ usuário ${login} criado (${papel})`);
}
