import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import { CONFIG } from '@forja/regras';
import type { ConfigApp } from './config';
import type { Contexto } from './contexto';
import type { Db } from './db';
import { ErroApp } from './erros';
import { entrar, sair, usuarioDoToken } from './servicos/auth';
import * as admin from './servicos/admin';
import * as estudo from './servicos/estudo';
import * as fantasmas from './servicos/fantasmas';
import { fase, mapa } from './servicos/mapa';
import { resumo, salvarPosicao } from './servicos/personagem';
import { um } from './db';
import * as provas from './servicos/provas';
import * as skills from './servicos/skills';
import * as chefes from './servicos/chefes';
import { painel } from './servicos/painel';
import * as caderno from './servicos/caderno';

const COOKIE = 'forja_sessao';

declare module 'fastify' {
  interface FastifyRequest {
    usuarioId: number;
  }
}

export interface OpcoesApp {
  db: Db;
  config: ConfigApp;
  agora?: () => Date;
  rng?: () => number;
  dado?: () => number;
  log?: boolean;
}

export async function criarApp(o: OpcoesApp): Promise<{ app: FastifyInstance; ctx: Contexto }> {
  const ctx: Contexto = {
    db: o.db,
    config: o.config,
    agora: o.agora ?? (() => new Date()),
    rng: o.rng ?? (() => randomInt(0, 2 ** 32) / 2 ** 32),
    dado: o.dado ?? (() => randomInt(CONFIG.dado.min, CONFIG.dado.max + 1)),
  };
  const app = Fastify({ logger: o.log ? { level: 'info' } : false, trustProxy: true, bodyLimit: 1024 * 1024 });
  await app.register(cookie);

  app.setErrorHandler((erro, _req, res) => {
    if (erro instanceof ErroApp) return res.status(erro.status).send({ erro: erro.codigo, mensagem: erro.message, ...erro.extra });
    if (erro instanceof z.ZodError) return res.status(400).send({ erro: 'entrada_invalida', mensagem: 'Dados inválidos.', detalhes: erro.issues });
    const status = (erro as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) app.log.error(erro);
    return res.status(status).send({ erro: 'erro', mensagem: status >= 500 ? 'Erro interno.' : (erro as Error).message });
  });

  app.addHook('onSend', async (_req, res, payload) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Referrer-Policy', 'same-origin');
    res.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none'");
    return payload;
  });

  // ---- públicas
  app.post('/api/login', async (req, res) => {
    const b = z.object({ login: z.string().min(1).max(64), senha: z.string().min(1).max(256) }).parse(req.body);
    const { token } = await entrar(ctx, b.login.trim().toLowerCase(), b.senha, req.ip);
    res.setCookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: o.config.producao, path: '/', maxAge: 30 * 86_400 });
    return { ok: true };
  });

  app.post('/api/logout', async (req, res) => {
    sair(ctx, req.cookies[COOKIE]);
    res.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  // ---- autenticadas
  await app.register(async (r) => {
    r.addHook('preHandler', async (req: FastifyRequest) => {
      const uid = usuarioDoToken(ctx, req.cookies[COOKIE]);
      if (!uid) throw new ErroApp(401, 'nao_autenticado', 'Entre para continuar.');
      req.usuarioId = uid;
    });

    const Id = z.object({ id: z.string().min(1).max(40) });
    const IdNum = z.object({ id: z.coerce.number().int().positive() });

    r.get('/api/eu', async (req) => ({
      personagem: resumo(ctx, req.usuarioId),
      luta: provas.emCurso(ctx, req.usuarioId),
      sessao: estudo.sessaoAberta(ctx, req.usuarioId)?.topico_id ?? null,
      fantasmasHoje: fantasmas.contarPendentes(ctx, req.usuarioId),
      papel: um<{ papel: string }>(ctx.db, 'SELECT papel FROM usuario WHERE id = :uid', { uid: req.usuarioId })?.papel ?? 'jogador',
      dev: o.config.producao ? undefined : { fatorTempo: o.config.fatorTempo },
    }));
    r.put('/api/posicao', async (req) => {
      salvarPosicao(ctx, req.usuarioId, z.object({ ato: z.string().max(4), modulo: z.string().max(12).nullable(), no: z.string().max(20).nullable() }).parse(req.body));
      return { ok: true };
    });

    r.get('/api/mapa', async (req) => ({ ...mapa(ctx, req.usuarioId), personagem: resumo(ctx, req.usuarioId) }));
    r.get('/api/modulos/:id', async (req) => fase(ctx, req.usuarioId, Id.parse(req.params).id));
    r.get('/api/topicos/:id', async (req) => estudo.detalheTopico(ctx, req.usuarioId, Id.parse(req.params).id));
    r.put('/api/topicos/:id/nota', async (req) =>
      estudo.salvarNota(ctx, req.usuarioId, Id.parse(req.params).id, z.object({ texto: z.string().max(5000) }).parse(req.body).texto),
    );
    r.post('/api/topicos/:id/evidencias', async (req) => {
      const b = z.object({ descricao: z.string().max(5000), link: z.string().max(500).nullish() }).parse(req.body);
      return estudo.adicionarEvidencia(ctx, req.usuarioId, Id.parse(req.params).id, b.descricao, b.link?.trim() || null);
    });

    r.post('/api/sessoes', async (req) => estudo.abrir(ctx, req.usuarioId, z.object({ topico_id: z.string().max(20) }).parse(req.body).topico_id));
    r.post('/api/sessoes/:id/pulso', async (req) =>
      estudo.pulso(ctx, req.usuarioId, IdNum.parse(req.params).id, z.object({ visivel: z.boolean() }).parse(req.body).visivel),
    );
    r.post('/api/sessoes/:id/checkin', async (req) => estudo.checkin(ctx, req.usuarioId, IdNum.parse(req.params).id));
    r.get('/api/caderno', async (req) => caderno.listar(ctx, req.usuarioId));
    r.get('/api/caderno/:id', async (req) => caderno.ler(ctx, req.usuarioId, IdNum.parse(req.params).id));
    r.post('/api/caderno', async (req) => {
      const b = z.object({ titulo: z.string().max(120), conteudo: caderno.Conteudo.default([]) }).parse(req.body);
      return caderno.criar(ctx, req.usuarioId, b.titulo, b.conteudo);
    });
    r.put('/api/caderno/:id', async (req) => {
      const b = z.object({ titulo: z.string().max(120).optional(), conteudo: caderno.Conteudo.optional() }).parse(req.body);
      return caderno.atualizar(ctx, req.usuarioId, IdNum.parse(req.params).id, b);
    });
    r.delete('/api/caderno/:id', async (req) => caderno.apagar(ctx, req.usuarioId, IdNum.parse(req.params).id));
    r.get('/api/topicos/:id/caderno', async (req) => caderno.doTopico(ctx, req.usuarioId, Id.parse(req.params).id));
    r.put('/api/topicos/:id/caderno', async (req) =>
      caderno.salvarDoTopico(ctx, req.usuarioId, Id.parse(req.params).id, z.object({ conteudo: caderno.Conteudo }).parse(req.body).conteudo),
    );

    r.post('/api/sessoes/:id/pausa', async (req) =>
      estudo.pausar(ctx, req.usuarioId, IdNum.parse(req.params).id, z.object({ pausar: z.boolean() }).parse(req.body).pausar),
    );
    r.post('/api/sessoes/:id/encerrar', async (req) => estudo.encerrar(ctx, req.usuarioId, IdNum.parse(req.params).id));

    r.post('/api/tentativas', async (req) => {
      const b = z.object({ tipo: z.enum(['combate', 'chefe', 'fantasma']), alvo_id: z.string().max(20) }).parse(req.body);
      return provas.iniciar(ctx, req.usuarioId, b.tipo, b.alvo_id);
    });
    r.get('/api/fantasmas', async (req) => fantasmas.listar(ctx, req.usuarioId));
    r.get('/api/tentativas/aberta', async (req) => ({ luta: provas.emCurso(ctx, req.usuarioId) }));
    r.post('/api/tentativas/:id/respostas', async (req) => {
      const b = z
        .object({
          ordem: z.number().int().min(0),
          resposta: z.union([
            z.number(), z.array(z.number().int()).max(10), z.boolean(), z.string().max(40),
            z.object({ texto: z.string().max(5000), rubrica: z.array(z.boolean()).max(4) }),
          ]),
          confianca: z.number().int().min(1).max(3).optional(),
        })
        .parse(req.body);
      return provas.responder(ctx, req.usuarioId, IdNum.parse(req.params).id, b.ordem, b.resposta, b.confianca);
    });
    // ---- admin (ferramentas de teste; só mexem na própria conta)
    await r.register(async (a) => {
      a.addHook('preHandler', async (req: FastifyRequest) => admin.exigirAdmin(ctx, req.usuarioId));
      const Topico = z.object({ topico_id: z.string().max(20) });
      a.post('/api/admin/estudo', async (req) => {
        const b = Topico.extend({ horas: z.number().positive().max(10_000) }).parse(req.body);
        return admin.adicionarEstudo(ctx, req.usuarioId, b.topico_id, b.horas);
      });
      a.post('/api/admin/vencer-topico', async (req) => admin.vencerTopico(ctx, req.usuarioId, Topico.parse(req.body).topico_id));
      a.post('/api/admin/vencer-modulo', async (req) => {
        const b = z.object({ modulo_id: z.string().max(12), chefe: z.boolean().default(true) }).parse(req.body);
        return admin.vencerModulo(ctx, req.usuarioId, b.modulo_id, b.chefe);
      });
      a.post('/api/admin/adiantar', async (req) => admin.adiantarDias(ctx, req.usuarioId, z.object({ dias: z.number().positive().max(400) }).parse(req.body).dias));
      a.post('/api/admin/xp', async (req) => admin.ganharXp(ctx, req.usuarioId, z.object({ xp: z.number().int().positive().max(10_000_000) }).parse(req.body).xp));
      a.post('/api/admin/adaptacao', async (req) => {
        const b = z.object({ alvo_id: z.string().max(20), nivel: z.number().int().min(0).max(5) }).parse(req.body);
        return admin.definirAdaptacao(ctx, req.usuarioId, b.alvo_id, b.nivel);
      });
      a.post('/api/admin/variante', async (req) => {
        const b = z.object({ modulo_id: z.string().max(12), variante: z.string().max(20) }).parse(req.body);
        return admin.forcarVariante(ctx, req.usuarioId, b.modulo_id, b.variante);
      });
      a.get('/api/admin/gabarito', async (req) => admin.gabaritoAtual(ctx, req.usuarioId));
      a.post('/api/admin/zerar', async (req) => admin.zerarProgresso(ctx, req.usuarioId));
    });

    r.get('/api/painel', async (req) => painel(ctx, req.usuarioId));
    r.get('/api/skills', async (req) => skills.listar(ctx, req.usuarioId));
    r.post('/api/skills/:id/evoluir', async (req) => skills.evoluir(ctx, req.usuarioId, Id.parse(req.params).id));
    r.post('/api/tentativas/:id/skill', async (req) => {
      const b = z.object({ skill: z.enum(['corte', 'escudo']), ordem: z.number().int().min(0) }).parse(req.body);
      return provas.usarSkill(ctx, req.usuarioId, IdNum.parse(req.params).id, b.skill, b.ordem);
    });
    r.post('/api/tentativas/:id/comecar', async (req) => {
      const b = z.object({ bancada: z.object({ descricao: z.string().max(5000), link: z.string().max(500).nullish() }).optional() }).parse(req.body ?? {});
      return provas.comecar(ctx, req.usuarioId, IdNum.parse(req.params).id, b.bancada ? { descricao: b.bancada.descricao, link: b.bancada.link?.trim() || null } : undefined);
    });
    r.get('/api/modulos/:id/variante', async (req) => ({ variante: chefes.varianteRevelada(ctx, req.usuarioId, Id.parse(req.params).id) }));
    r.post('/api/modulos/:id/olho', async (req) => {
      const id = Id.parse(req.params).id;
      return { variante: chefes.revelarVariante(ctx, req.usuarioId, provas.contextoDoChefe(ctx, req.usuarioId, id, 0)) };
    });
    r.post('/api/tentativas/:id/desistir', async (req) => provas.desistir(ctx, req.usuarioId, IdNum.parse(req.params).id));
  });

  // ---- front publicado (produção)
  if (existsSync(o.config.webDist)) {
    await app.register(fastifyStatic, {
      root: o.config.webDist,
      setHeaders: (res, caminho) => {
        if (/\.(html|js|css)$/.test(caminho)) res.header('Cache-Control', 'no-cache');
      },
    });
    app.setNotFoundHandler((req, res) => {
      if (req.url.startsWith('/api/')) return res.status(404).send({ erro: 'nao_encontrado', mensagem: 'Rota não encontrada.' });
      return res.sendFile('index.html');
    });
  }

  return { app, ctx };
}
