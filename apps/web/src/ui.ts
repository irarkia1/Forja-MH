import { marked } from 'marked';

type Filho = Node | string | null | undefined | false;

// h('div.classe#id', {atributos}, ...filhos)
export function h<K extends keyof HTMLElementTagNameMap>(
  seletor: K | `${K}.${string}` | `${K}#${string}`,
  attrs: Record<string, unknown> = {},
  ...filhos: (Filho | Filho[])[]
): HTMLElementTagNameMap[K] {
  const [base, ...resto] = seletor.split('.');
  const [tag, id] = base!.split('#') as [K, string | undefined];
  const el = document.createElement(tag);
  if (id) el.id = id;
  if (resto.length) el.className = resto.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'class') el.className += ` ${String(v)}`;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos.flat()) if (f) el.append(f);
  return el;
}

export function markdown(md: string): string {
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}

export function barra(classe: string, fracao: number, rotulo: string): HTMLDivElement {
  const b = h('div.barra', { class: classe, role: 'progressbar', 'aria-label': rotulo, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(fracao * 100) });
  const i = document.createElement('i');
  i.style.width = `${Math.max(0, Math.min(1, fracao)) * 100}%`;
  b.append(i);
  return b;
}

export function tempo(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh) return `${hh}h${String(mm).padStart(2, '0')}`;
  return mm ? `${mm} min` : `${ss} s`;
}

export function relogio(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export const num = (x: number, casas = 1) => x.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: 0 });
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const estrelas = (n: number) => '★'.repeat(n);

let toasts: HTMLDivElement | undefined;
export function toast(msg: string, tipo: 'info' | 'erro' | 'ok' = 'info', ms = 4200): void {
  if (!toasts) document.body.append((toasts = h('div.toasts', { 'aria-live': 'polite' })));
  const t = h('div.toast', { class: tipo === 'info' ? '' : tipo }, msg);
  toasts.append(t);
  setTimeout(() => t.remove(), ms);
}

export function modal(titulo: string, corpo: Node | string, botoes: { texto: string; classe?: string; valor: string }[]): Promise<string> {
  return new Promise((resolve) => {
    const veu = h('div.veu', { role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });
    const fechar = (v: string) => {
      veu.remove();
      document.removeEventListener('keydown', esc, true);
      resolve(v);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fechar('cancelar');
      }
    };
    document.addEventListener('keydown', esc, true);
    const acoes = botoes.map((b) => h('button.btn', { class: b.classe, onclick: () => fechar(b.valor) }, b.texto));
    veu.append(h('div.modal', {}, h('h3', {}, titulo), typeof corpo === 'string' ? h('p', {}, corpo) : corpo, h('div.acoes', {}, acoes)));
    document.body.append(veu);
    acoes.at(-1)?.focus();
  });
}

// replaceChildren que aceita null/false (filhos condicionais).
export function preencher(el: Element, ...filhos: (Filho | Filho[])[]): void {
  el.replaceChildren(...filhos.flat().filter((f): f is Node | string => Boolean(f)));
}
