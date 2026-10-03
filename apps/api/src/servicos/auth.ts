import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { exec, um } from '../db';
import type { Contexto } from '../contexto';
import { ErroApp } from '../erros';

const scrypt = promisify(scryptCb) as (s: string, sal: Buffer, n: number, o: object) => Promise<Buffer>;
const N = 2 ** 15;
const OPCOES = { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DIAS_SESSAO = 30;

export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(senha, sal, 32, OPCOES);
  return `scrypt$${N}$${sal.toString('base64')}$${h.toString('base64')}`;
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [alg, n, sal, h] = guardado.split('$');
  if (alg !== 'scrypt' || !sal || !h) return false;
  const esperado = Buffer.from(h, 'base64');
  const calc = await scrypt(senha, Buffer.from(sal, 'base64'), esperado.length, { ...OPCOES, N: Number(n) });
  return timingSafeEqual(calc, esperado);
}

const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export async function criarUsuario(ctx: Contexto, login: string, senha: string, papel: 'jogador' | 'admin' = 'jogador'): Promise<number> {
  if (senha.length < 8) throw new ErroApp(400, 'senha_curta', 'A senha precisa ter pelo menos 8 caracteres.');
  const r = exec(ctx.db, 'INSERT INTO usuario (login, senha_hash, criado_em, papel) VALUES (:login, :hash, :em, :papel)', {
    login, hash: await hashSenha(senha), em: ctx.agora().toISOString(), papel,
  });
  exec(ctx.db, 'INSERT INTO personagem (usuario_id) VALUES (:id)', { id: r.lastInsertRowid });
  return r.lastInsertRowid;
}

// Freio de login: 5 erros → espera crescente (por login e por IP).
const falhas = new Map<string, { n: number; ate: number }>();

export async function entrar(ctx: Contexto, login: string, senha: string, ip: string): Promise<{ token: string; usuarioId: number }> {
  const agora = ctx.agora().getTime();
  for (const chave of [`l:${login}`, `i:${ip}`]) {
    const f = falhas.get(chave);
    if (f && f.ate > agora) throw new ErroApp(429, 'muitas_tentativas', 'Muitas tentativas. Espere um pouco e tente de novo.');
  }
  const u = um<{ id: number; senha_hash: string }>(ctx.db, 'SELECT id, senha_hash FROM usuario WHERE login = :login', { login });
  if (!u || !(await conferirSenha(senha, u.senha_hash))) {
    for (const chave of [`l:${login}`, `i:${ip}`]) {
      const f = falhas.get(chave) ?? { n: 0, ate: 0 };
      f.n += 1;
      if (f.n >= 5) f.ate = agora + 2 ** (f.n - 5) * 30_000;
      falhas.set(chave, f);
    }
    throw new ErroApp(401, 'login_invalido', 'Login ou senha incorretos.');
  }
  falhas.delete(`l:${login}`);
  falhas.delete(`i:${ip}`);
  const token = randomBytes(32).toString('base64url');
  exec(ctx.db, 'INSERT INTO sessao_login (token_hash, usuario_id, expira_em) VALUES (:t, :u, :e)', {
    t: hashToken(token), u: u.id, e: new Date(agora + DIAS_SESSAO * 86_400_000).toISOString(),
  });
  return { token, usuarioId: u.id };
}

export function usuarioDoToken(ctx: Contexto, token: string | undefined): number | undefined {
  if (!token) return undefined;
  const s = um<{ usuario_id: number; expira_em: string }>(ctx.db, 'SELECT usuario_id, expira_em FROM sessao_login WHERE token_hash = :t', {
    t: hashToken(token),
  });
  if (!s || s.expira_em < ctx.agora().toISOString()) return undefined;
  return s.usuario_id;
}

export function sair(ctx: Contexto, token: string | undefined): void {
  if (token) exec(ctx.db, 'DELETE FROM sessao_login WHERE token_hash = :t', { t: hashToken(token) });
}
