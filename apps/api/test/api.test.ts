import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { criarApp } from '../src/app';
import { lerConfig } from '../src/config';
import { importarConteudo, type Conteudo, type QuestaoYaml } from '../src/conteudo';
import { abrirBanco, um, type Db } from '../src/db';
import { criarUsuario } from '../src/servicos/auth';

// Fixture: um ato, um módulo de 40 h com um tópico comum e um de elite.
function questoes(topico: string): QuestaoYaml[] {
  return Array.from({ length: 14 }, (_, i) => ({
    id: `Q-${topico}-${String(i + 1).padStart(3, '0')}`,
    objetivo: i % 2 ? 'O1' : 'O2',
    tipo: 'unica' as const,
    dificuldade: (i % 3) + 1,
    bloom: 'lembrar' as const,
    enunciado: `Pergunta ${i} de ${topico}`,
    alternativas: ['certa', 'errada 1', 'errada 2', 'errada 3'],
    resposta: 0,
    explicacao: 'Porque sim, com fonte.',
    fonte: 'Fixture',
    origem: 'humano' as const,
    revisao: 'revisada' as const,
  }));
}

const CONTEUDO: Conteudo = {
  atos: [{ id: 'A0', nome: 'Fundamentos', regiao: 'Vila', lema: 'x', horas: 40, ordem: 0 }],
  modulos: [
    {
      id: 'M0.1', ato: 'A0', nome: 'Termos', missao: null, horas: 40, trilha: 'base', ordem: 1, requer: [], tags_chefe: [], pasta: '',
      topicos: [
        { id: 'M0.1.T01', nome: 'Camadas', tipo: 'comum', peso: 1, depois_de: [], objetivos: [{ id: 'O1', texto: 'objetivo um aqui' }, { id: 'O2', texto: 'objetivo dois aqui' }] },
        { id: 'M0.1.T02', nome: 'Kit', tipo: 'elite', peso: 1, depois_de: [], objetivos: [{ id: 'O1', texto: 'objetivo um aqui' }, { id: 'O2', texto: 'objetivo dois aqui' }] },
      ],
      roteiros: new Map([['M0.1.T01', '# Roteiro']]),
      questoes: [...questoes('M0.1.T01'), ...questoes('M0.1.T02')],
    },
    {
      id: 'M0.2', ato: 'A0', nome: 'Depois', missao: null, horas: 10, trilha: 'base', ordem: 2, requer: ['M0.1'], tags_chefe: [], pasta: '',
      topicos: [{ id: 'M0.2.T01', nome: 'X', tipo: 'comum', peso: 1, objetivos: [] }],
      roteiros: new Map(), questoes: [],
    },
  ],
};

let db: Db;
let app: FastifyInstance;
let agora: Date;
let dado: number;
let cookie = '';
// Cada tópico de 20 h → mínimo = 12 h.
const MINIMO = 12 * 3600;

const andar = (seg: number) => (agora = new Date(agora.getTime() + seg * 1000));

async function chamar(method: 'GET' | 'POST' | 'PUT', url: string, body?: unknown) {
  const r = await app.inject({ method, url, payload: body as object, headers: { cookie } });
  return { status: r.statusCode, json: r.json() as any, raw: r.body };
}

// Estuda `seg` segundos com pulsos de 30 s e check-in a cada 25 min.
async function estudar(topico: string, seg: number) {
  const s = await chamar('POST', '/api/sessoes', { topico_id: topico });
  for (let t = 0; t < seg; t += 30) {
    andar(30);
    const p = await chamar('POST', `/api/sessoes/${s.json.id}/pulso`, { visivel: true });
    if (p.json.checkinNecessario) await chamar('POST', `/api/sessoes/${s.json.id}/checkin`);
  }
  await chamar('POST', `/api/sessoes/${s.json.id}/encerrar`);
}

function certaNaTela(tentativaId: number, ordem: number): number {
  const t = um<{ plano: string }>(db, 'SELECT plano FROM tentativa WHERE id = :id', { id: tentativaId })!;
  return JSON.parse(t.plano).questoes[ordem].perm.indexOf(0);
}

async function lutar(tipo: 'combate' | 'chefe' | 'fantasma', alvo: string, acertar: (i: number) => boolean) {
  const ini = await chamar('POST', '/api/tentativas', { tipo, alvo_id: alvo });
  expect(ini.status, JSON.stringify(ini.json)).toBe(200);
  expect(ini.raw).not.toContain('gabarito');
  expect(ini.raw).not.toContain('explicacao');
  let ultima: any;
  for (let i = 0; i < ini.json.total; i++) {
    const certa = certaNaTela(ini.json.tentativaId, i);
    ultima = (await chamar('POST', `/api/tentativas/${ini.json.tentativaId}/respostas`, { ordem: i, resposta: acertar(i) ? certa : (certa + 1) % 4 })).json;
    if (ultima.proxima) expect(JSON.stringify(ultima.proxima)).not.toContain('gabarito');
    if (ultima.fim) break;
  }
  return { ini: ini.json, ultima };
}

async function prepararParaAtacar(topico: string) {
  await estudar(topico, MINIMO);
  await chamar('PUT', `/api/topicos/${topico}/nota`, { texto: 'Esta é a minha nota pessoal explicando o tema com as minhas palavras, em várias frases curtas.' });
}

beforeEach(async () => {
  agora = new Date('2026-10-05T12:00:00Z');
  dado = 3;
  db = abrirBanco(':memory:');
  importarConteudo(db, CONTEUDO);
  const config = { ...lerConfig({}), aceitarRascunho: false, fatorTempo: 1, webDist: '/nao/existe', minQuestoesPorTopico: 12 };
  ({ app } = await criarApp({ db, config, agora: () => agora, dado: () => dado }));
  await criarUsuario({ db, config, agora: () => agora, rng: Math.random, dado: () => 0 }, 'matheus', 'senha-forte');
  const r = await app.inject({ method: 'POST', url: '/api/login', payload: { login: 'matheus', senha: 'senha-forte' } });
  cookie = String(r.headers['set-cookie']).split(';')[0]!;
});

describe('autenticação', () => {
  it('rotas exigem login; senha errada é recusada', async () => {
    const sem = await app.inject({ method: 'GET', url: '/api/mapa' });
    expect(sem.statusCode).toBe(401);
    const errada = await app.inject({ method: 'POST', url: '/api/login', payload: { login: 'matheus', senha: 'x' } });
    expect(errada.statusCode).toBe(401);
    expect((await chamar('GET', '/api/eu')).json.personagem.nivel).toBe(1);
  });
});

describe('mapa', () => {
  it('M0.1 disponível, M0.2 bloqueado', async () => {
    const m = (await chamar('GET', '/api/mapa')).json;
    expect(m.modulos.find((x: any) => x.id === 'M0.1').estado).toBe('disponivel');
    expect(m.modulos.find((x: any) => x.id === 'M0.2').estado).toBe('bloqueado');
  });
});

describe('cronômetro', () => {
  it('conta pulsos visíveis; aba oculta e lacunas não contam', async () => {
    const s = (await chamar('POST', '/api/sessoes', { topico_id: 'M0.1.T01' })).json;
    andar(30);
    await chamar('POST', `/api/sessoes/${s.id}/pulso`, { visivel: false }); // conta (anterior visível)
    andar(30);
    await chamar('POST', `/api/sessoes/${s.id}/pulso`, { visivel: true }); // não conta (anterior oculto)
    andar(300);
    await chamar('POST', `/api/sessoes/${s.id}/pulso`, { visivel: true }); // lacuna de 5 min: não conta
    andar(30);
    const fim = (await chamar('POST', `/api/sessoes/${s.id}/encerrar`)).json;
    expect(fim.segundosSessao).toBe(60);
  });

  it('check-in perdido descarta o trecho pendente', async () => {
    const s = (await chamar('POST', '/api/sessoes', { topico_id: 'M0.1.T01' })).json;
    for (let t = 0; t < 28 * 60; t += 30) {
      andar(30);
      await chamar('POST', `/api/sessoes/${s.id}/pulso`, { visivel: true });
    }
    const fim = (await chamar('POST', `/api/sessoes/${s.id}/encerrar`)).json;
    expect(fim.segundosSessao).toBeLessThan(2 * 60);
  });
});

describe('combate', () => {
  it('bloqueia antes do mínimo e sem nota', async () => {
    expect((await chamar('POST', '/api/tentativas', { tipo: 'combate', alvo_id: 'M0.1.T01' })).json.erro).toBe('estudo_insuficiente');
    await estudar('M0.1.T01', MINIMO);
    expect((await chamar('POST', '/api/tentativas', { tipo: 'combate', alvo_id: 'M0.1.T01' })).json.erro).toBe('sem_nota');
  });

  it('vitória: derrota o inimigo, dá XP, crítico com 3/3', async () => {
    await prepararParaAtacar('M0.1.T01');
    const { ultima } = await lutar('combate', 'M0.1.T01', () => true);
    expect(ultima.fim).toMatchObject({ resultado: 'vitoria', critico: true });
    expect(ultima.fim.ganho.xp).toBe(Math.round((100 + 10 * 20) * 1.5));
    const f = (await chamar('GET', '/api/modulos/M0.1')).json;
    expect(f.topicos[0].estado).toBe('derrotado');
  });

  it('erro = golpe com dado do servidor; vida zerada = derrota e inimigo aprende', async () => {
    await prepararParaAtacar('M0.1.T01');
    dado = 6; // poder 1, vida 6 → um golpe de 6 derruba
    const { ultima } = await lutar('combate', 'M0.1.T01', () => false);
    expect(ultima.golpe).toMatchObject({ dado: 6, dano: 6, vida: 0 });
    expect(ultima.fim).toMatchObject({ resultado: 'derrota', motivo: 'vida', adaptacaoNova: 1 }); // estudar dá XP: mais vida, aguenta mais de um golpe
    const t = (await chamar('GET', '/api/modulos/M0.1')).json.topicos[0];
    expect(t.estado).toBe('em_estudo');
    expect(t.exigidoSeg).toBe(MINIMO + 0.2 * MINIMO);
    expect(t.adaptacao).toBe(1);
    expect(t.poder).toBe(1.1);
  });

  it('0/3 com vida sobrando ainda é derrota (piso)', async () => {
    await prepararParaAtacar('M0.1.T01');
    dado = 0;
    const { ultima } = await lutar('combate', 'M0.1.T01', () => false);
    expect(ultima.fim).toMatchObject({ resultado: 'derrota', motivo: 'piso' });
  });

  it('elite exige evidência', async () => {
    await prepararParaAtacar('M0.1.T02');
    expect((await chamar('POST', '/api/tentativas', { tipo: 'combate', alvo_id: 'M0.1.T02' })).json.erro).toBe('sem_evidencia');
    await chamar('POST', '/api/topicos/M0.1.T02/evidencias', { descricao: 'Montei o kit e fotografei a bancada organizada com tudo etiquetado.', link: 'https://exemplo.com/foto' });
    expect((await chamar('POST', '/api/tentativas', { tipo: 'combate', alvo_id: 'M0.1.T02' })).status).toBe(200);
  });

  it('revanche: 25% do XP e uma por dia', async () => {
    await prepararParaAtacar('M0.1.T01');
    await lutar('combate', 'M0.1.T01', () => true);
    const { ultima } = await lutar('combate', 'M0.1.T01', (i) => i > 0);
    expect(ultima.fim).toMatchObject({ resultado: 'vitoria', revanche: true });
    expect(ultima.fim.ganho.xp).toBe(Math.round((100 + 10 * 20) * 0.25));
    expect((await chamar('POST', '/api/tentativas', { tipo: 'combate', alvo_id: 'M0.1.T01' })).json.erro).toBe('revanche_hoje');
  });
});

describe('chefe', () => {
  async function liberarChefe() {
    await prepararParaAtacar('M0.1.T01');
    await lutar('combate', 'M0.1.T01', () => true);
    await prepararParaAtacar('M0.1.T02');
    await chamar('POST', '/api/topicos/M0.1.T02/evidencias', { descricao: 'Montei o kit e fotografei a bancada organizada com tudo etiquetado.' });
    await lutar('combate', 'M0.1.T02', () => true);
  }

  it('bloqueado até derrotar todos; vence vivo com ≥ 60% e libera o próximo módulo', async () => {
    expect((await chamar('POST', '/api/tentativas', { tipo: 'chefe', alvo_id: 'M0.1' })).json.erro).toBe('chefe_bloqueado');
    await liberarChefe();
    dado = 0;
    const { ini, ultima } = await lutar('chefe', 'M0.1', (i) => i < 8); // 8/13 = 61,5%
    expect(ini.total).toBe(13);
    expect(ultima.fim).toMatchObject({ resultado: 'vitoria', acertos: 8 });
    const m = (await chamar('GET', '/api/mapa')).json;
    expect(m.modulos.find((x: any) => x.id === 'M0.1').estado).toBe('vencido');
    expect(m.modulos.find((x: any) => x.id === 'M0.2').estado).toBe('em_preparo');
  });

  it('abaixo do piso: 1ª derrota sem descanso; ★★ (2ª seguida) descansa 48 h', async () => {
    await liberarChefe();
    dado = 0;
    const curar = async () => {
      for (let i = 0; i < 20; i++) {
        const hoje = (await chamar('GET', '/api/fantasmas')).json.hoje;
        if (!hoje.length) break;
        await lutar('fantasma', hoje[0].topicoId, () => true);
      }
    };
    const a = await lutar('chefe', 'M0.1', (i) => i < 7); // 7/13 = 53,8%
    expect(a.ultima.fim).toMatchObject({ resultado: 'derrota', motivo: 'piso', adaptacaoNova: 1 });
    expect((await chamar('GET', '/api/modulos/M0.1')).json.chefe).toMatchObject({ cooldownAte: null, adaptacao: 1, perfuracao: 0.1 });
    await curar();
    const b = await lutar('chefe', 'M0.1', (i) => i < 7);
    expect(b.ultima.fim).toMatchObject({ resultado: 'derrota', adaptacaoNova: 2 });
    await curar();
    expect((await chamar('POST', '/api/tentativas', { tipo: 'chefe', alvo_id: 'M0.1' })).json.erro).toBe('chefe_cooldown');
    andar(48 * 3600 + 1);
    expect((await chamar('GET', '/api/modulos/M0.1')).json.chefe).toMatchObject({ estado: 'liberado', adaptacao: 2 });
  });

  it('prova retoma depois de fechar o navegador', async () => {
    await liberarChefe();
    const ini = (await chamar('POST', '/api/tentativas', { tipo: 'chefe', alvo_id: 'M0.1' })).json;
    await chamar('POST', `/api/tentativas/${ini.tentativaId}/respostas`, { ordem: 0, resposta: certaNaTela(ini.tentativaId, 0) });
    const aberta = (await chamar('GET', '/api/tentativas/aberta')).json.luta;
    expect(aberta.questao.ordem).toBe(1);
    expect(aberta.acertos).toBe(1);
  });
});

describe('fantasmas', () => {
  async function vencerT01() {
    await prepararParaAtacar('M0.1.T01');
    await lutar('combate', 'M0.1.T01', () => true);
  }

  it('vitória agenda o fantasma para amanhã; passar avança a agenda', async () => {
    await vencerT01();
    expect((await chamar('POST', '/api/tentativas', { tipo: 'fantasma', alvo_id: 'M0.1.T01' })).json.erro).toBe('sem_fantasma');
    andar(26 * 3600);
    const lista = (await chamar('GET', '/api/fantasmas')).json;
    expect(lista.hoje).toHaveLength(1);
    expect((await chamar('GET', '/api/modulos/M0.1')).json.topicos[0].fantasma).toBe(true);
    dado = 6;
    const { ini, ultima } = await lutar('fantasma', 'M0.1.T01', () => true);
    expect(ini.total).toBe(2);
    expect(ultima.golpe).toBeNull();
    expect(ultima.fim).toMatchObject({ resultado: 'vitoria', revisao: { passou: true, concluido: false } });
    expect(ultima.fim.ganho.xp).toBe(20);
    const prox = new Date(ultima.fim.revisao.proximaEm).getTime();
    expect(Math.round((prox - agora.getTime()) / 86_400_000)).toBeGreaterThanOrEqual(2);
  });

  it('errar o fantasma não dá dano e volta para a etapa 1 amanhã', async () => {
    await vencerT01();
    andar(26 * 3600);
    dado = 6;
    const { ultima } = await lutar('fantasma', 'M0.1.T01', () => false);
    expect(ultima.golpe).toBeNull();
    expect(ultima.fim).toMatchObject({ resultado: 'derrota', revisao: { passou: false } });
    const t = (await chamar('GET', '/api/modulos/M0.1')).json.topicos[0];
    expect(t.estado).toBe('derrotado');
  });

  it('derrota no chefe abre feridas; chefe só volta depois de curar', async () => {
    await vencerT01();
    await prepararParaAtacar('M0.1.T02');
    await chamar('POST', '/api/topicos/M0.1.T02/evidencias', { descricao: 'Montei o kit e fotografei a bancada organizada com tudo etiquetado.' });
    await lutar('combate', 'M0.1.T02', () => true);
    dado = 0;
    await lutar('chefe', 'M0.1', (i) => i < 5);
    expect((await chamar('GET', '/api/fantasmas')).json.hoje.length).toBeGreaterThanOrEqual(1);
    andar(48 * 3600 + 1);
    expect((await chamar('POST', '/api/tentativas', { tipo: 'chefe', alvo_id: 'M0.1' })).json.erro).toBe('feridas_abertas');
    for (const f of (await chamar('GET', '/api/fantasmas')).json.hoje) {
      while ((await chamar('GET', '/api/fantasmas')).json.hoje.some((x: any) => x.topicoId === f.topicoId)) {
        await lutar('fantasma', f.topicoId, () => true);
      }
    }
    expect((await chamar('POST', '/api/tentativas', { tipo: 'chefe', alvo_id: 'M0.1' })).status).toBe(200);
  });
});

describe('modo admin', () => {
  async function entrarComoAdmin() {
    await criarUsuario({ db, config: lerConfig({}), agora: () => agora, rng: Math.random, dado: () => 0 }, 'teste', 'senha-teste', 'admin');
    const r = await app.inject({ method: 'POST', url: '/api/login', payload: { login: 'teste', senha: 'senha-teste' } });
    cookie = String(r.headers['set-cookie']).split(';')[0]!;
  }

  it('conta comum não usa as ferramentas', async () => {
    const r = await chamar('POST', '/api/admin/xp', { xp: 100 });
    expect(r.status).toBe(403);
  });

  it('horas, Marco, vencer fase, adiantar dias, gabarito e zerar', async () => {
    await entrarComoAdmin();
    expect((await chamar('GET', '/api/eu')).json.papel).toBe('admin');
    const g = (await chamar('POST', '/api/admin/estudo', { topico_id: 'M0.1.T01', horas: 2001 })).json;
    expect(g.marcos).toBe(1);
    expect((await chamar('GET', '/api/eu')).json.personagem.faixa).toBe(2);

    await chamar('POST', '/api/admin/vencer-modulo', { modulo_id: 'M0.1', chefe: true });
    const m = (await chamar('GET', '/api/mapa')).json;
    expect(m.modulos.find((x: any) => x.id === 'M0.1').estado).toBe('vencido');

    expect((await chamar('GET', '/api/fantasmas')).json.hoje).toHaveLength(0);
    await chamar('POST', '/api/admin/adiantar', { dias: 2 });
    expect((await chamar('GET', '/api/fantasmas')).json.hoje.length).toBe(2);

    const ini = (await chamar('POST', '/api/tentativas', { tipo: 'fantasma', alvo_id: 'M0.1.T01' })).json;
    const gab = (await chamar('GET', '/api/admin/gabarito')).json;
    expect(gab.resposta).toBe(certaNaTela(ini.tentativaId, 0));

    await chamar('POST', `/api/tentativas/${ini.tentativaId}/desistir`);
    await chamar('POST', '/api/admin/zerar');
    const eu = (await chamar('GET', '/api/eu')).json;
    expect(eu.personagem).toMatchObject({ nivel: 1, horasTotais: 0 });
    expect((await chamar('GET', '/api/mapa')).json.modulos.find((x: any) => x.id === 'M0.1').estado).toBe('disponivel');
  });
});

describe('skills', () => {
  it('estudar dá 1 XP por minuto e pontos de skill', async () => {
    await estudar('M0.1.T01', 3600);
    const p = (await chamar('GET', '/api/eu')).json.personagem;
    expect(p.xpTotal).toBe(60);
    expect(p.energia).toBe(5);
  });

  it('evoluir respeita pontos e pré-requisitos; Vitalidade aumenta a vida', async () => {
    await estudar('M0.1.T01', MINIMO); // 720 XP → nível 4 → 6 pontos
    const s = (await chamar('GET', '/api/skills')).json;
    expect(s.pontos.livres).toBe(6);
    expect((await chamar('POST', '/api/skills/defesa/evoluir')).json.erro).toBe('nao_pode_evoluir');
    for (let i = 0; i < 3; i++) await chamar('POST', '/api/skills/vitalidade/evoluir');
    expect((await chamar('POST', '/api/skills/defesa/evoluir')).status).toBe(200);
    const eu = (await chamar('GET', '/api/eu')).json.personagem;
    expect(eu.vida).toBe(6 + 3 + 3);
    expect(eu.defesa).toBe(0.02);
    expect(eu.pontosLivres).toBe(2);
  });

  it('Corte esconde uma errada (nunca a certa); Escudo anula o dano; fantasma recusa skill', async () => {
    await prepararParaAtacar('M0.1.T01');
    await chamar('POST', '/api/skills/corte/evoluir');
    await chamar('POST', '/api/skills/escudo/evoluir');
    const ini = (await chamar('POST', '/api/tentativas', { tipo: 'combate', alvo_id: 'M0.1.T01' })).json;
    const corte = (await chamar('POST', `/api/tentativas/${ini.tentativaId}/skill`, { skill: 'corte', ordem: 0 })).json;
    expect(corte.ocultar).toHaveLength(1);
    expect(corte.ocultar[0]).not.toBe(certaNaTela(ini.tentativaId, 0));
    expect(corte.energia).toBe(3.5); // 5 + 0,5 da nota − 2
    await chamar('POST', `/api/tentativas/${ini.tentativaId}/skill`, { skill: 'escudo', ordem: 0 });
    dado = 6;
    const r = (await chamar('POST', `/api/tentativas/${ini.tentativaId}/respostas`, { ordem: 0, resposta: (certaNaTela(ini.tentativaId, 0) + 1) % 4 })).json;
    expect(r.golpe).toMatchObject({ escudo: true, dano: 0 });
    expect((await chamar('POST', `/api/tentativas/${ini.tentativaId}/skill`, { skill: 'escudo', ordem: 1 })).json.erro).toBe('escudo_esgotado'); // nv. 1 = 1 uso por luta
  });
});
