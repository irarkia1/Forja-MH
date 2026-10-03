// Uso: npm run criar-usuario -- <login>   (a senha é pedida no terminal)
import { createInterface } from 'node:readline/promises';
import { lerConfig } from '../apps/api/src/config';
import { abrirBanco, exec, um } from '../apps/api/src/db';
import { criarUsuario, hashSenha } from '../apps/api/src/servicos/auth';

const login = (process.argv[2] ?? '').trim().toLowerCase();
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
  exec(db, 'UPDATE usuario SET senha_hash = :h WHERE id = :id', { h: await hashSenha(senha), id: existente.id });
  exec(db, 'DELETE FROM sessao_login WHERE usuario_id = :id', { id: existente.id });
  console.log(`✔ senha de ${login} trocada`);
} else {
  const ctx = { db, config, agora: () => new Date(), rng: Math.random, dado: () => 0 };
  await criarUsuario(ctx, login, senha);
  console.log(`✔ usuário ${login} criado`);
}
