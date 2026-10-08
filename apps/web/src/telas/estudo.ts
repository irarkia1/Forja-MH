import { api, ErroApi, type DetalheTopico, type Luta, type PaginaCaderno, type Sessao } from '../api';
import { criarEditor } from './caderno';
import { fatorTempo, recarregarEu } from '../estado';
import { barra, h, markdown, modal, relogio, tempo, toast } from '../ui';
import type { Navegar } from './mapa';

const PULSO_MS = 30_000;
const MIN_NOTA = 80;

// Tela de estudo: roteiro + cronômetro com pulso (a autoridade é o servidor).
export async function telaEstudo(topicoId: string, nav: Navegar) {
  const [t, pagina] = await Promise.all([
    api.get<DetalheTopico>(`topicos/${topicoId}`),
    api.get<PaginaCaderno>(`topicos/${topicoId}/caderno`),
  ]);
  const derrotado = t.estado === 'derrotado';
  let sessao: Sessao | null = null;
  let estudado = t.estudadoSeg;
  let sessaoSeg = 0;
  let ultimaBase = performance.now();
  let encerrado = false;
  let checkinAberto = false;
  let pausada = false;
  let notaSalva = Boolean(t.nota);
  let temEvidencia = t.evidencias.length > 0;

  const relogioEl = h('div.relogio', {}, relogio(estudado));
  const sessaoEl = h('div.mudo', { style: 'font-size:13px' });
  const statusEl = h('div.mudo', { style: 'font-size:13px' }, 'Abrindo sessão…');
  const guarda = h('div');
  const botaoPausa = h('button.btn', { type: 'button', disabled: true, onclick: () => void alternarPausa() }, '❚❚ Pausar');
  const atacar = h('button.btn.principal', { disabled: true, onclick: () => void atacarAgora() }, '⚔ Atacar');
  const motivo = h('div.mudo', { style: 'font-size:13px' });

  const nota = h('textarea', { placeholder: 'Com suas palavras: o que é, para que serve, onde as pessoas erram. 3 a 5 frases.', 'aria-label': 'Nota pessoal' }, t.nota ?? '');
  const contagem = h('span.mudo', { style: 'font-size:12px' });
  const salvarNota = h('button.btn', {
    onclick: async () => {
      try {
        const r = await api.put<{ ganho: { xp: number } | null }>(`topicos/${topicoId}/nota`, { texto: nota.value });
        notaSalva = true;
        toast(r.ganho ? `Nota salva. +${r.ganho.xp} XP` : 'Nota atualizada.', 'ok');
        void recarregarEu();
        atualizarAtaque();
      } catch (e) {
        toast(e instanceof ErroApi ? e.message : 'Falha ao salvar.', 'erro');
      }
    },
  }, 'Salvar nota');
  const contar = () => (contagem.textContent = `${nota.value.trim().length}/${MIN_NOTA} caracteres`);
  nota.addEventListener('input', contar);
  contar();

  const listaEv = h('ul', { style: 'padding-left:18px;margin:8px 0;font-size:14px' });
  const pintarEvidencias = (ev: DetalheTopico['evidencias']) =>
    listaEv.replaceChildren(...ev.map((e) => h('li', {}, e.descricao_md.slice(0, 120), e.link ? [' — ', h('a', { href: e.link, target: '_blank', rel: 'noopener' }, 'link')] : null)));
  pintarEvidencias(t.evidencias);
  const evDesc = h('textarea', { placeholder: 'O que você fez, o que mediu, o que deu diferente do esperado.', style: 'min-height:90px', 'aria-label': 'Descrição da evidência' });
  const evLink = h('input', { type: 'url', placeholder: 'https:// (foto, vídeo ou repositório) — opcional', 'aria-label': 'Link da evidência' });
  const cartaoEvidencia = t.tipo === 'elite'
    ? h('section.cartao', {},
        h('h4', {}, '🛡 EVIDÊNCIA DE LABORATÓRIO'),
        h('p.mudo', { style: 'font-size:13px;margin:0 0 8px' }, 'Inimigo de elite: só dá para atacar com o laboratório registrado.'),
        listaEv,
        evDesc, h('div', { style: 'height:8px' }), evLink, h('div', { style: 'height:8px' }),
        h('button.btn', {
          onclick: async () => {
            try {
              const r = await api.post<{ ganho: { xp: number } | null }>(`topicos/${topicoId}/evidencias`, { descricao: evDesc.value, link: evLink.value || null });
              temEvidencia = true;
              evDesc.value = '';
              evLink.value = '';
              const novo = await api.get<DetalheTopico>(`topicos/${topicoId}`);
              pintarEvidencias(novo.evidencias);
              toast(r.ganho ? `Evidência registrada. +${r.ganho.xp} XP` : 'Evidência registrada.', 'ok');
              void recarregarEu();
              atualizarAtaque();
            } catch (e) {
              toast(e instanceof ErroApi ? e.message : 'Falha ao registrar.', 'erro');
            }
          },
        }, 'Registrar evidência'),
      )
    : null;

  const caderno = criarEditor(pagina.conteudo, async (c) => {
    await api.put<PaginaCaderno>(`topicos/${topicoId}/caderno`, { conteudo: c });
  }, { altura: 140, rotulo: `Caderno de ${t.nome}` });

  // A guarda acompanha o mostrador (servidor + estimativa entre pulsos).
  function pintarGuarda(seg: number): void {
    const falta = Math.max(0, t.exigidoSeg - seg);
    guarda.replaceChildren(
      h('div.mudo', { style: 'font-size:13px;margin-bottom:4px' }, falta ? `Guarda do inimigo: faltam ${tempo(falta)}` : 'Guarda quebrada!'),
      barra('guarda', falta / Math.max(1, t.exigidoSeg), 'Guarda'),
    );
  }

  function atualizarAtaque(): void {
    const falta = Math.max(0, t.exigidoSeg - estudado);
    pintarGuarda(estudado);
    const motivos: string[] = [];
    if (falta > 0) motivos.push(`estudar mais ${tempo(falta)}`);
    if (!notaSalva) motivos.push('salvar a nota pessoal');
    if (t.tipo === 'elite' && !temEvidencia) motivos.push('registrar a evidência');
    atacar.disabled = derrotado || motivos.length > 0;
    motivo.textContent = derrotado ? 'Inimigo já derrotado: a revanche é pela linha da fase.' : motivos.length ? `Para atacar: ${motivos.join(', ')}.` : 'Tudo pronto. Boa luta.';
  }

  function aplicar(s: Sessao): void {
    sessao = s;
    pausada = s.pausada;
    botaoPausa.disabled = false;
    botaoPausa.textContent = pausada ? '▶ Retomar' : '❚❚ Pausar';
    botaoPausa.classList.toggle('principal', pausada);
    estudado = s.estudadoSeg;
    sessaoSeg = s.segundosSessao;
    ultimaBase = performance.now();
    if (s.perdeuCheckin) toast('Check-in perdido: o trecho desde o último check-in não contou.', 'erro', 7000);
    if (s.checkinNecessario && !checkinAberto) void pedirCheckin();
    atualizarAtaque();
  }

  async function pulso(): Promise<void> {
    if (!sessao || encerrado) return;
    try {
      aplicar(await api.post<Sessao>(`sessoes/${sessao.id}/pulso`, { visivel: document.visibilityState === 'visible' }));
      statusEl.textContent = pausada ? '❚❚ em pausa: o tempo não conta' : document.visibilityState === 'visible' ? '● contando (pulso a cada 30 s)' : '❚❚ pausado: aba oculta';
    } catch (e) {
      statusEl.textContent = e instanceof ErroApi ? e.message : '⚠ sem conexão: este trecho pode não contar';
      if (e instanceof ErroApi && e.codigo === 'sessao_encerrada') await abrir();
    }
  }

  async function pedirCheckin(): Promise<void> {
    if (!sessao) return;
    checkinAberto = true;
    const prazo = new Date(sessao.prazoCheckin).getTime();
    const corpo = h('p', {}, 'Ainda estudando? Confirme para o tempo contar.');
    const contador = h('p.mudo', { style: 'font-size:13px' });
    const tick = setInterval(() => (contador.textContent = `Prazo: ${tempo(Math.max(0, (prazo - Date.now()) / 1000))}`), 500);
    const r = await modal('⏳ CHECK-IN', h('div', {}, corpo, contador), [{ texto: 'Sim, estou estudando', classe: 'principal', valor: 'ok' }]);
    clearInterval(tick);
    checkinAberto = false;
    if (r === 'ok' && sessao && !encerrado) {
      try {
        aplicar(await api.post<Sessao>(`sessoes/${sessao.id}/checkin`));
        toast('Check-in feito.', 'ok');
      } catch { /* o próximo pulso tenta de novo */ }
    }
  }

  // Pausa só no estudo: guarda o que já valeu e para de contar até retomar.
  async function alternarPausa(): Promise<void> {
    if (!sessao || encerrado) return;
    botaoPausa.disabled = true;
    try {
      aplicar(await api.post<Sessao>(`sessoes/${sessao.id}/pausa`, { pausar: !pausada }));
      statusEl.textContent = pausada ? '❚❚ em pausa: o tempo não conta' : '● contando (pulso a cada 30 s)';
      toast(pausada ? 'Pausado. O tempo não conta até você retomar.' : 'Retomado. Voltou a contar.', 'info', 2500);
    } catch (e) {
      botaoPausa.disabled = false;
      toast(e instanceof ErroApi ? e.message : 'Falha ao pausar.', 'erro');
    }
  }

  async function abrir(): Promise<void> {
    try {
      aplicar(await api.post<Sessao>('sessoes', { topico_id: topicoId }));
      statusEl.textContent = '● contando (pulso a cada 30 s)';
    } catch (e) {
      statusEl.textContent = e instanceof ErroApi ? e.message : 'Falha ao abrir sessão.';
    }
  }

  async function encerrar(): Promise<void> {
    if (encerrado) return;
    encerrado = true;
    if (sessao) await api.post(`sessoes/${sessao.id}/encerrar`).catch(() => undefined);
    void recarregarEu();
  }

  async function atacarAgora(): Promise<void> {
    await encerrar();
    try {
      nav.lutar(await api.post<Luta>('tentativas', { tipo: 'combate', alvo_id: topicoId }));
    } catch (e) {
      encerrado = false;
      toast(e instanceof ErroApi ? e.message : 'Falha ao atacar.', 'erro');
      await abrir();
    }
  }

  const visibilidade = () => void pulso();
  document.addEventListener('visibilitychange', visibilidade);
  const saindo = () => { if (sessao && !encerrado) api.beacon(`sessoes/${sessao.id}/encerrar`); };
  window.addEventListener('pagehide', saindo);
  const intervalo = setInterval(() => void pulso(), PULSO_MS);
  // Mostrador local entre pulsos (o servidor corrige a cada pulso).
  const mostrador = setInterval(() => {
    const visivel = document.visibilityState === 'visible' && sessao && !encerrado && !pausada;
    const extra = visivel ? ((performance.now() - ultimaBase) / 1000) * fatorTempo : 0;
    relogioEl.textContent = relogio(estudado + Math.min(extra, 90 * fatorTempo));
    pintarGuarda(estudado + Math.min(extra, 90 * fatorTempo));
    relogioEl.classList.toggle('pausado', !visivel);
    sessaoEl.textContent = `Nesta sessão: ${tempo(sessaoSeg + Math.min(extra, 90 * fatorTempo))} · exigido ${tempo(t.exigidoSeg)}`;
  }, 1000);

  const objetivos = h('section.cartao', {}, h('h4', {}, 'AO FINAL VOCÊ CONSEGUE'), h('ul', { style: 'padding-left:18px;margin:0;font-size:14px' }, t.objetivos.map((o) => h('li', {}, o.texto))));
  const el = h('section.tela', {},
    h('div.tela-topo', {},
      h('button.btn.fantasma', { onclick: () => nav.ir(`#/fase/${t.modulo.id}`) }, '← Fase'),
      h('h1', {}, `${t.tipo === 'elite' ? '🛡' : '👾'} ${t.nome}`),
      t.adaptacao ? h('span.estrelas', { title: 'Adaptação' }, '★'.repeat(t.adaptacao)) : null,
    ),
    h('div.estudo', {},
      h('article.roteiro', { html: t.roteiro ? markdown(t.roteiro) : '<p class="mudo">Roteiro deste tópico ainda em preparo.</p>' }),
      h('aside.lateral', {},
        fatorTempo > 1
          ? h('div.aviso.erro', {}, h('b', {}, `Modo de teste: tempo ×${fatorTempo}.`), ` Cada segundo conta ${fatorTempo}. Para estudar de verdade, suba o servidor sem FORJA_FATOR_TEMPO.`)
          : null,
        h('section.cartao', {}, h('h4', {}, '⏱ TEMPO VÁLIDO NO TÓPICO'), relogioEl, sessaoEl,
          h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px' }, statusEl, botaoPausa),
          h('div', { style: 'height:10px' }), guarda),
        objetivos,
        h('section.cartao', {}, h('h4', {}, '✍ NOTA PESSOAL'), nota, h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px' }, contagem, salvarNota)),
        h('section.cartao', {},
          h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:8px' },
            h('h4', {}, '📓 CADERNO'), h('a', { href: '#/caderno', style: 'font-size:13px' }, 'abrir caderno')),
          h('p.mudo', { style: 'font-size:12px;margin:0 0 6px' }, 'Anote à vontade. Selecione um trecho e escolha a cor do marca-texto.'),
          caderno.el),
        cartaoEvidencia,
        h('section.cartao', {}, atacar, h('div', { style: 'height:8px' }), motivo),
      ),
    ),
  );
  atualizarAtaque();
  await abrir();

  return {
    el,
    destruir: () => {
      clearInterval(intervalo);
      clearInterval(mostrador);
      document.removeEventListener('visibilitychange', visibilidade);
      window.removeEventListener('pagehide', saindo);
      caderno.destruir();
      void encerrar();
    },
  };
}
