import { h } from './ui';
import { montarCaderno, type Caderno } from './telas/caderno';

// Gaveta lateral do caderno: abre por cima de qualquer tela sem trocar de rota,
// então a sessão de estudo continua aberta e o tempo continua contando.
// A largura é arrastável pela borda e fica guardada neste navegador.

const CHAVE = 'forja-gaveta-largura';
const MIN = 320;
const PADRAO = 440;

let gaveta: HTMLElement | null = null;
let caderno: Caderno | null = null;
let aberta = false;
let maximizada = false;
const ouvintes = new Set<(aberta: boolean) => void>();

function lerLargura(): number {
  try { return Number(localStorage.getItem(CHAVE)) || PADRAO; } catch { return PADRAO; }
}

function aplicarLargura(px: number): void {
  const max = Math.max(MIN, window.innerWidth - 120);
  const l = Math.round(Math.min(Math.max(px, MIN), max));
  document.documentElement.style.setProperty('--gaveta', `${l}px`);
}

function topicoDaRota(): string | undefined {
  const m = /^#\/estudo\/([^/]+)/.exec(location.hash);
  return m?.[1];
}

function criar(): HTMLElement {
  const alca = h('div.alca-gaveta', { role: 'separator', 'aria-orientation': 'vertical', 'aria-label': 'Arraste para mudar a largura', title: 'Arraste para alargar ou estreitar', tabindex: '0' });
  alca.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    alca.setPointerCapture(e.pointerId);
    document.body.classList.add('arrastando');
    const mover = (ev: PointerEvent) => aplicarLargura(window.innerWidth - ev.clientX);
    const soltar = () => {
      alca.removeEventListener('pointermove', mover);
      document.body.classList.remove('arrastando');
      const atual = gaveta!.getBoundingClientRect().width;
      try { localStorage.setItem(CHAVE, String(Math.round(atual))); } catch { /* sem armazenamento */ }
    };
    alca.addEventListener('pointermove', mover);
    alca.addEventListener('pointerup', soltar, { once: true });
    alca.addEventListener('pointercancel', soltar, { once: true });
  });
  alca.addEventListener('keydown', (e) => {
    const passo = e.key === 'ArrowLeft' ? 40 : e.key === 'ArrowRight' ? -40 : 0;
    if (!passo) return;
    e.preventDefault();
    aplicarLargura(gaveta!.getBoundingClientRect().width + passo);
    try { localStorage.setItem(CHAVE, String(Math.round(gaveta!.getBoundingClientRect().width))); } catch { /* sem armazenamento */ }
  });

  const botaoMax = h('button.btn.fantasma', {
    type: 'button', title: 'Aumentar / voltar ao tamanho', 'aria-label': 'Aumentar o caderno',
    onclick: () => {
      maximizada = !maximizada;
      document.body.classList.toggle('gaveta-max', maximizada);
      botaoMax.textContent = maximizada ? '⤡' : '⤢';
    },
  }, '⤢');
  const el = h('aside.gaveta', { 'aria-label': 'Caderno', role: 'complementary' },
    alca,
    h('div.cabeca-gaveta', {},
      h('h2', {}, '📓 Caderno'),
      h('span.mudo', { style: 'font-size:12px' }, '⏱ o tempo continua contando'),
      h('span.espaco'),
      botaoMax,
      h('button.btn.fantasma', { type: 'button', title: 'Fechar o caderno', 'aria-label': 'Fechar o caderno', onclick: () => void fecharCaderno() }, '✕'),
    ),
    h('div.corpo-gaveta', {}, h('p.mudo', {}, 'Abrindo…')),
  );
  document.body.append(el);
  return el;
}

export async function abrirCaderno(topicoId = topicoDaRota()): Promise<void> {
  aplicarLargura(lerLargura());
  gaveta ??= criar();
  aberta = true;
  document.body.classList.add('com-gaveta');
  ouvintes.forEach((f) => f(true));
  if (!caderno) {
    caderno = await montarCaderno({ naGaveta: true, topicoInicial: topicoId });
    gaveta.querySelector('.corpo-gaveta')!.replaceChildren(caderno.el);
  } else if (topicoId) {
    await caderno.abrirTopico(topicoId);
  }
}

export async function fecharCaderno(): Promise<void> {
  if (!aberta) return;
  aberta = false;
  document.body.classList.remove('com-gaveta', 'gaveta-max');
  maximizada = false;
  ouvintes.forEach((f) => f(false));
  await caderno?.descarregar();
}

export function alternarCaderno(): void {
  void (aberta ? fecharCaderno() : abrirCaderno());
}

export function cadernoAberto(): boolean {
  return aberta;
}

export function aoMudarGaveta(f: (aberta: boolean) => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

// Ao sair (logout/recarga), salva o que estiver pendente.
window.addEventListener('pagehide', () => void caderno?.descarregar());
window.addEventListener('resize', () => { if (aberta) aplicarLargura(lerLargura()); });
// Ao trocar para o estudo de outro tópico, a gaveta aberta acompanha.
window.addEventListener('hashchange', () => {
  const t = topicoDaRota();
  if (aberta && t) void caderno?.abrirTopico(t);
});
