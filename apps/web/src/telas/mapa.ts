import { api, ErroApi, type Fase, type Luta, type Mapa, type ModuloMapa, type TopicoFase } from '../api';
import { Cena, type No } from '../jogo/cena';
import { eu, recarregarEu } from '../estado';
import { barra, estrelas, h, num, pct, preencher, tempo, toast } from '../ui';

export interface Navegar {
  ir: (hash: string) => void;
  lutar: (luta: Luta) => void;
}

const NOME_ESTADO: Record<string, string> = {
  bloqueado: 'Bloqueado',
  em_preparo: 'Conteúdo em preparo',
  disponivel: 'Disponível',
  em_andamento: 'Em andamento',
  vencido: 'Vencido',
  em_estudo: 'Em estudo',
  pronto: 'Pronto para atacar',
  derrotado: 'Derrotado',
  liberado: 'Liberado',
};

const TRILHA: Record<string, string> = {
  base: 'Base', firmware: 'Firmware', hardware: 'Hardware', fabricacao: 'Fabricação',
  silicio: 'Silício', sensores: 'Sensores', produto: 'Produto', integrador: 'Integrador',
};

function salvarPosicao(ato: string, modulo: string | null, no: string | null): void {
  api.put('posicao', { ato, modulo, no }).catch(() => undefined);
}

function montarPalco(abas: HTMLElement | null, painel: HTMLElement) {
  const canvas = h('canvas', { 'aria-label': 'Mapa. Use as setas para andar e Enter para entrar.', tabindex: 0 });
  const cena = h('div.cena', {}, canvas, h('div.dica-teclas', {}, '← → andar · ↑ ↓ ramo · Enter entrar · ou clique'));
  return { el: h('div.palco', {}, h('div.area', {}, abas, cena), painel), canvas };
}

// ---------------------------------------------------------------------------
// Mapa do ato: as fases (módulos) numa linha com bifurcações.

export async function telaMundo(atoPedido: string | undefined, nav: Navegar) {
  const mapa = await api.get<Mapa>('mapa');
  const pos = mapa.personagem.posicao;
  const disponiveis = mapa.modulos.filter((m) => m.estado !== 'bloqueado');
  const atoId = atoPedido ?? pos?.ato ?? disponiveis[0]?.ato ?? 'A0';
  const ato = mapa.atos.find((a) => a.id === atoId) ?? mapa.atos[0]!;
  const modulos = mapa.modulos.filter((m) => m.ato === ato.id);
  const porId = new Map(mapa.modulos.map((m) => [m.id, m]));

  const abas = h('nav.abas', { 'aria-label': 'Atos' },
    mapa.atos.map((a) => {
      const aberto = mapa.modulos.some((m) => m.ato === a.id && m.estado !== 'bloqueado');
      return h('button.aba', {
        class: aberto ? '' : 'trancada', 'aria-selected': String(a.id === ato.id), title: a.nome,
        onclick: () => nav.ir(`#/mundo/${a.id}`),
      }, `${a.id} ${a.regiao}`);
    }),
  );
  const painel = h('aside.painel');
  const palco = montarPalco(abas, painel);

  const nos: No[] = [
    { id: 'acampamento', rotulo: 'Acampamento', tipo: 'acampamento', estado: 'disponivel', trilha: 'base', pais: [] },
    ...modulos.map((m) => {
      const internos = m.requer.flatMap((r) => r.split('|')).filter((r) => porId.get(r)?.ato === ato.id);
      return { id: m.id, rotulo: `${m.id} ${m.nome}`, tipo: 'modulo' as const, estado: m.estado, trilha: m.trilha, pais: internos.length ? internos : ['acampamento'] };
    }),
  ];

  const mostrar = (no: No) => {
    if (no.id === 'acampamento') return painelAcampamento(painel, ato.nome, ato.lema, mapa);
    const m = porId.get(no.id)!;
    painelModulo(painel, m, porId, () => nav.ir(`#/fase/${m.id}`));
  };
  const inicial = pos?.ato === ato.id && pos.modulo === null && pos.no ? pos.no : (modulos.find((m) => m.estado === 'em_andamento' || m.estado === 'disponivel')?.id ?? 'acampamento');
  const cena = new Cena(palco.canvas, {
    nos,
    regiao: ato.id,
    inicio: inicial,
    aoChegar: (no) => {
      mostrar(no);
      salvarPosicao(ato.id, null, no.id);
    },
    aoAtivar: (no) => {
      if (no.id === 'acampamento') return;
      const m = porId.get(no.id)!;
      if (m.estado === 'bloqueado') return toast('Fase bloqueada: vença os pré-requisitos primeiro.', 'erro');
      nav.ir(`#/fase/${m.id}`);
    },
  });
  palco.canvas.focus();
  return { el: palco.el, destruir: () => cena.destruir() };
}

function painelAcampamento(painel: HTMLElement, nomeAto: string, lema: string, mapa: Mapa) {
  const p = mapa.personagem;
  const vencidos = mapa.modulos.filter((m) => m.estado === 'vencido').length;
  preencher(painel, 
    h('h2', {}, '⛺ ACAMPAMENTO'),
    h('h3', {}, nomeAto),
    h('p.mudo', {}, lema),
    h('dl.ficha', {},
      h('dt', {}, 'Nível'), h('dd', {}, String(p.nivel)),
      h('dt', {}, 'Vida'), h('dd', {}, String(p.vida)),
      h('dt', {}, 'Horas válidas'), h('dd', {}, `${num(p.horasTotais)} de 10.000`),
      h('dt', {}, 'Esta semana'), h('dd', {}, `${num(p.horasSemana)} h de ${p.metaSemana} h`),
      h('dt', {}, 'Fases vencidas'), h('dd', {}, `${vencidos} de ${mapa.modulos.length}`),
      h('dt', {}, 'Pontos de skill'), h('dd', {}, `${p.pontosSkill} (árvore chega na F3)`),
    ),
    barra('xp', p.horasTotais / 10_000, 'Jornada'),
    h('p.mudo', { style: 'font-size:13px' }, `Jornada: ${pct(p.horasTotais / 10_000)} das 10 mil horas.`),
  );
}

function painelModulo(painel: HTMLElement, m: ModuloMapa, porId: Map<string, ModuloMapa>, entrar: () => void) {
  const requisitos = m.requer.map((r) =>
    r.split('|').map((id) => `${id} ${porId.get(id)?.nome ?? ''}${porId.get(id)?.estado === 'vencido' ? ' ✔' : ''}`).join(' ou '),
  );
  const pode = m.estado !== 'bloqueado';
  preencher(painel, 
    h('h2', {}, `FASE ${m.id}`),
    h('h3', {}, m.nome),
    h('dl.ficha', {},
      h('dt', {}, 'Situação'), h('dd', {}, NOME_ESTADO[m.estado] ?? m.estado),
      h('dt', {}, 'Horas'), h('dd', {}, `${m.horas} h`),
      h('dt', {}, 'Trilha'), h('dd', {}, TRILHA[m.trilha] ?? m.trilha),
    ),
    requisitos.length ? h('div', {}, h('div.mudo', { style: 'font-size:13px' }, 'Exige:'), h('ul', { style: 'margin:4px 0 0;padding-left:18px;font-size:14px' }, requisitos.map((r) => h('li', {}, r)))) : null,
    m.estado === 'em_preparo' ? h('div.aviso', {}, 'Os roteiros e as questões desta fase ainda estão sendo escritos (conteúdo just-in-time). Dá para ver os inimigos, mas não lutar.') : null,
    h('div.acoes', {}, h('button.btn.principal', { disabled: !pode, onclick: entrar }, 'Entrar na fase ', h('span.tecla', {}, 'Enter'))),
  );
}

// ---------------------------------------------------------------------------
// Linha da fase: inimigos até o chefe.

export async function telaFase(moduloId: string, nav: Navegar) {
  const f = await api.get<Fase>(`modulos/${moduloId}`);
  const painel = h('aside.painel');
  const cabecalho = h('nav.abas', {},
    h('button.aba', { onclick: () => nav.ir(`#/mundo/${f.modulo.ato}`) }, `← ${f.modulo.ato}`),
    h('span.pixel', { style: 'font-size:11px;align-self:center;color:var(--destaque)' }, `${f.modulo.id} ${f.modulo.nome}`),
    h('span.mudo', { style: 'font-size:13px;align-self:center' }, `${f.topicos.filter((t) => t.estado === 'derrotado').length}/${f.topicos.length} ☠`),
  );
  const palco = montarPalco(cabecalho, painel);
  const comFilhos = new Set(f.topicos.flatMap((t) => t.depoisDe));
  const nos: No[] = [
    { id: 'acampamento', rotulo: 'Voltar ao mapa', tipo: 'acampamento', estado: 'disponivel', trilha: 'base', pais: [] },
    ...f.topicos.map((t) => ({
      id: t.id, rotulo: t.nome, tipo: t.tipo === 'elite' ? ('elite' as const) : ('inimigo' as const), estado: t.estado,
      trilha: f.modulo.trilha, pais: t.depoisDe.length ? t.depoisDe : ['acampamento'], adaptacao: t.adaptacao,
    })),
    {
      id: 'chefe', rotulo: 'CHEFE — prova do módulo', tipo: 'chefe', estado: f.chefe.estado === 'bloqueado' ? 'bloqueado' : f.chefe.estado,
      trilha: f.modulo.trilha, pais: f.topicos.filter((t) => !comFilhos.has(t.id)).map((t) => t.id), adaptacao: f.chefe.adaptacao,
    },
  ];
  const pos = eu()?.personagem.posicao;
  const inicial = pos?.modulo === moduloId && pos.no ? pos.no : (f.topicos.find((t) => ['pronto', 'em_estudo', 'disponivel'].includes(t.estado))?.id ?? 'acampamento');

  const atacar = async (tipo: 'combate' | 'chefe', alvo: string) => {
    try {
      nav.lutar(await api.post<Luta>('tentativas', { tipo, alvo_id: alvo }));
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === 'prova_em_curso') {
        await recarregarEu();
        const l = eu()?.luta;
        if (l) return nav.lutar(l);
      }
      toast(e instanceof ErroApi ? e.message : 'Falha ao iniciar a luta.', 'erro');
    }
  };

  const mostrar = (no: No) => {
    if (no.id === 'acampamento') {
      preencher(painel, 
        h('h2', {}, `FASE ${f.modulo.id}`),
        h('h3', {}, f.modulo.nome),
        f.modulo.missao ? h('p', {}, h('em', {}, f.modulo.missao)) : null,
        h('dl.ficha', {}, h('dt', {}, 'Horas'), h('dd', {}, `${f.modulo.horas} h`), h('dt', {}, 'Inimigos'), h('dd', {}, String(f.topicos.length))),
        h('div.acoes', {}, h('button.btn', { onclick: () => nav.ir(`#/mundo/${f.modulo.ato}`) }, 'Voltar ao mapa do ato ', h('span.tecla', {}, 'Enter'))),
      );
      return;
    }
    if (no.id === 'chefe') return painelChefe(painel, f, () => atacar('chefe', f.modulo.id));
    const t = f.topicos.find((x) => x.id === no.id)!;
    painelInimigo(painel, t, f.modulo.estado === 'em_preparo', {
      estudar: () => nav.ir(`#/estudo/${t.id}`),
      atacar: () => atacar('combate', t.id),
    });
  };

  const cena = new Cena(palco.canvas, {
    nos,
    regiao: f.modulo.ato,
    inicio: inicial,
    aoChegar: (no) => {
      mostrar(no);
      salvarPosicao(f.modulo.ato, moduloId, no.id);
    },
    aoAtivar: (no) => {
      if (no.id === 'acampamento') return nav.ir(`#/mundo/${f.modulo.ato}`);
      if (no.id === 'chefe') {
        if (f.chefe.estado === 'bloqueado') return toast('Derrote todos os inimigos para liberar o chefe.', 'erro');
        return void atacar('chefe', f.modulo.id);
      }
      const t = f.topicos.find((x) => x.id === no.id)!;
      if (t.estado === 'bloqueado') return toast('Inimigo bloqueado: vença os anteriores.', 'erro');
      if (t.estado === 'pronto' || t.estado === 'derrotado') return void atacar('combate', t.id);
      nav.ir(`#/estudo/${t.id}`);
    },
  });
  palco.canvas.focus();
  return { el: palco.el, destruir: () => cena.destruir() };
}

function painelInimigo(painel: HTMLElement, t: TopicoFase, emPreparo: boolean, acoes: { estudar: () => void; atacar: () => void }) {
  const falta = Math.max(0, t.exigidoSeg - t.estudadoSeg);
  const derrotado = t.estado === 'derrotado';
  const bloqueado = t.estado === 'bloqueado';
  preencher(painel, 
    h('h2', {}, t.tipo === 'elite' ? '🛡 INIMIGO DE ELITE' : '👾 INIMIGO'),
    h('h3', {}, t.nome),
    t.adaptacao ? h('div.aviso.erro', {}, h('span.estrelas', {}, estrelas(t.adaptacao)), ` Adaptado: ele aprendeu com sua derrota. Poder +${t.adaptacao * 10}%, perfuração ${pct(t.perfuracao)}, e vai mirar os objetivos em que você errou.`) : null,
    h('dl.ficha', {},
      h('dt', {}, 'Situação'), h('dd', {}, NOME_ESTADO[t.estado] ?? t.estado),
      h('dt', {}, 'Horas do tópico'), h('dd', {}, `${num(t.horas)} h`),
      h('dt', {}, 'Tempo mínimo'), h('dd', {}, tempo(t.minimoSeg)),
      t.exigidoSeg > t.minimoSeg ? [h('dt', {}, 'Recuperação'), h('dd', {}, `exige ${tempo(t.exigidoSeg)}`)] : null,
      h('dt', {}, 'Estudado'), h('dd', {}, tempo(t.estudadoSeg)),
      h('dt', {}, 'Poder'), h('dd', {}, `${num(t.poder, 2)} (dano = dado 0–6 × poder)`),
      h('dt', {}, 'Placar'), h('dd', {}, `${t.vitorias} vitória(s) · ${t.derrotas} derrota(s)`),
    ),
    derrotado ? null : h('div', {}, h('div.mudo', { style: 'font-size:13px;margin-bottom:4px' }, falta ? `Guarda: faltam ${tempo(falta)} de estudo` : 'Guarda quebrada: pode atacar'), barra('guarda', falta / Math.max(1, t.exigidoSeg), 'Guarda do inimigo')),
    t.tipo === 'elite' && !derrotado ? h('div.aviso', {}, 'Elite: antes de atacar, anexe a evidência do laboratório na tela de estudo.') : null,
    emPreparo ? h('div.aviso', {}, 'Conteúdo deste tópico em preparo.') : null,
    h('div.acoes', {},
      !derrotado ? h('button.btn', { class: t.estado === 'pronto' ? '' : 'principal', disabled: bloqueado || emPreparo, onclick: acoes.estudar }, '📖 Estudar', t.estado === 'pronto' ? null : h('span.tecla', {}, 'Enter')) : null,
      !derrotado ? h('button.btn', { class: t.estado === 'pronto' ? 'principal' : '', disabled: t.estado !== 'pronto', onclick: acoes.atacar }, '⚔ Atacar', t.estado === 'pronto' ? h('span.tecla', {}, 'Enter') : null) : null,
      derrotado ? h('button.btn.principal', { onclick: acoes.atacar }, '↺ Revanche (25% do XP, 1 por dia)') : null,
      derrotado ? h('button.btn', { onclick: acoes.estudar }, '📖 Rever o roteiro') : null,
    ),
  );
}

function painelChefe(painel: HTMLElement, f: Fase, enfrentar: () => void) {
  const c = f.chefe;
  const vida = eu()?.personagem.vida ?? 6;
  preencher(painel, 
    h('h2', {}, '💀 CHEFE'),
    h('h3', {}, `Guardião de ${f.modulo.nome}`),
    c.adaptacao ? h('div.aviso.erro', {}, h('span.estrelas', {}, estrelas(c.adaptacao)), ` Ele lembra de você: poder +${c.adaptacao * 10}%, perfuração ${pct(c.perfuracao)} e mais questões nos seus pontos fracos.`) : null,
    h('dl.ficha', {},
      h('dt', {}, 'Situação'), h('dd', {}, NOME_ESTADO[c.estado] ?? c.estado),
      h('dt', {}, 'Questões'), h('dd', {}, String(c.questoes)),
      h('dt', {}, 'Vida de batalha'), h('dd', {}, `≈ ${num((vida * c.questoes) / 7)} (vida × N ÷ 7)`),
      h('dt', {}, 'Poder'), h('dd', {}, num(c.poder, 2)),
      h('dt', {}, 'Para vencer'), h('dd', {}, 'chegar vivo ao fim + ≥ 60% de acerto'),
    ),
    c.cooldownAte ? h('div.aviso.erro', {}, `Recuperando-se até ${new Date(c.cooldownAte).toLocaleString('pt-BR')}.`) : null,
    c.estado === 'bloqueado' ? h('div.aviso', {}, 'Derrote todos os inimigos da fase para liberar o chefe.') : null,
    h('div.acoes', {},
      h('button.btn.principal', { disabled: c.estado === 'bloqueado' || Boolean(c.cooldownAte), onclick: enfrentar }, c.estado === 'vencido' ? '↺ Revanche (50% do XP, a cada 7 dias)' : '⚔ Enfrentar o chefe'),
    ),
  );
}
