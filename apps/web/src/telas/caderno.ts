import { api, ErroApi, type ConteudoCaderno, type CorCaderno, type ItemCaderno, type PaginaCaderno, type Trecho } from '../api';
import { h, preencher, toast } from '../ui';
import type { Navegar } from './mapa';

// Caderno: editor com marca-texto de 5 cores. O conteúdo vai ao servidor como
// parágrafos de trechos ({t, c, b}), nunca como HTML.

export const CORES: { id: CorCaderno; nome: string; rgb: string }[] = [
  { id: 'amarelo', nome: 'Amarelo', rgb: 'rgb(255, 224, 102)' },
  { id: 'vermelho', nome: 'Vermelho', rgb: 'rgb(229, 72, 77)' },
  { id: 'preto', nome: 'Preto', rgb: 'rgb(17, 17, 17)' },
  { id: 'branco', nome: 'Branco', rgb: 'rgb(255, 255, 255)' },
  { id: 'azul', nome: 'Azul', rgb: 'rgb(59, 130, 246)' },
];
const PELO_RGB = new Map(CORES.map((c) => [c.rgb, c.id]));
const IDS = new Set<string>(CORES.map((c) => c.id));
const BLOCO = /^(P|DIV|LI|H[1-6]|UL|OL|BLOCKQUOTE|PRE)$/;
const SALVAR_MS = 1200;

// ---- DOM ⇄ conteúdo ----------------------------------------------------------

export function serializar(raiz: HTMLElement): ConteudoCaderno {
  const pars: ConteudoCaderno = [];
  let atual: Trecho[] = [];
  const fechar = () => {
    const junto: Trecho[] = [];
    for (const t of atual) {
      const ult = junto[junto.length - 1];
      if (ult && ult.c === t.c && Boolean(ult.b) === Boolean(t.b)) ult.t += t.t;
      else junto.push({ ...t });
    }
    pars.push(junto);
    atual = [];
  };
  const andar = (n: Node, c: CorCaderno | undefined, b: boolean) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n as Text).data.replace(/ /g, ' ');
      if (t) atual.push({ t, ...(c ? { c } : {}), ...(b ? { b: true } : {}) });
      return;
    }
    if (!(n instanceof HTMLElement)) return;
    if (n.tagName === 'BR') return fechar();
    const bloco = BLOCO.test(n.tagName);
    if (bloco && atual.length) fechar();
    const cor = n.dataset.cor && IDS.has(n.dataset.cor) ? (n.dataset.cor as CorCaderno) : c;
    const negrito = b || n.tagName === 'B' || n.tagName === 'STRONG';
    for (const f of [...n.childNodes]) andar(f, cor, negrito);
    if (bloco && atual.length) fechar();
  };
  for (const f of [...raiz.childNodes]) andar(f, undefined, false);
  if (atual.length) fechar();
  while (pars.length && !pars[pars.length - 1]!.some((t) => t.t.trim())) pars.pop();
  return pars;
}

function trechoEl(t: Trecho): Node {
  let n: Node = document.createTextNode(t.t);
  if (t.b) n = h('b', {}, n);
  if (t.c) n = h('mark.mt', { 'data-cor': t.c }, n);
  return n;
}

export function renderizar(raiz: HTMLElement, conteudo: ConteudoCaderno): void {
  const pars = conteudo.length ? conteudo : [[]];
  raiz.replaceChildren(...pars.map((p) => (p.some((t) => t.t) ? h('p', {}, p.map(trechoEl)) : h('p', {}, h('br')))));
}

// Troca os <span style> que o navegador cria por <mark data-cor> e <b>.
function normalizar(raiz: HTMLElement): void {
  for (const el of [...raiz.querySelectorAll<HTMLElement>('[style], font')]) {
    const bg = el.style.backgroundColor;
    const fw = el.style.fontWeight;
    el.style.backgroundColor = '';
    el.style.fontWeight = '';
    el.style.color = '';
    let alvo: HTMLElement = el;
    if (bg) {
      const cor = PELO_RGB.get(bg);
      if (el.tagName === 'MARK') {
        if (cor) el.dataset.cor = cor;
        else delete el.dataset.cor;
      } else if (cor) {
        const m = h('mark.mt', { 'data-cor': cor });
        m.append(...el.childNodes);
        el.append(m);
        alvo = m;
      }
    }
    if (fw === 'bold' || Number(fw) >= 600) {
      const b = h('b');
      b.append(...alvo.childNodes);
      alvo.append(b);
    }
    if (!el.getAttribute('style')) el.removeAttribute('style');
  }
  for (const el of [...raiz.querySelectorAll<HTMLElement>('span, font, mark')]) {
    const vazioDeSentido = el.tagName === 'MARK' ? !el.dataset.cor : !el.attributes.length || el.tagName === 'FONT';
    if (vazioDeSentido) el.replaceWith(...el.childNodes);
  }
}

// ---- Editor --------------------------------------------------------------------

export interface Editor {
  el: HTMLElement;
  conteudo: () => ConteudoCaderno;
  definir: (c: ConteudoCaderno) => void;
  descarregar: () => Promise<void>;
  destruir: () => void;
}

export function criarEditor(inicial: ConteudoCaderno, salvar: (c: ConteudoCaderno) => Promise<void>, opcoes: { altura?: number; rotulo?: string } = {}): Editor {
  const folha = h('div.folha', {
    contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': opcoes.rotulo ?? 'Caderno', spellcheck: 'true',
    style: opcoes.altura ? `min-height:${opcoes.altura}px` : undefined,
  });
  renderizar(folha, inicial);
  const estado = h('span.mudo.estado-caderno', {}, '');
  let timer: ReturnType<typeof setTimeout> | null = null;
  let sujo = false;
  let salvando: Promise<void> = Promise.resolve();

  const gravar = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!sujo) return salvando;
    sujo = false;
    estado.textContent = 'Salvando…';
    salvando = salvar(serializar(folha))
      .then(() => { if (!sujo) estado.textContent = 'Salvo ✓'; })
      .catch((e) => {
        sujo = true;
        estado.textContent = '⚠ não salvou';
        toast(e instanceof ErroApi ? e.message : 'Falha ao salvar o caderno.', 'erro');
      });
    return salvando;
  };
  const mudou = () => {
    sujo = true;
    estado.textContent = 'Editando…';
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void gravar(), SALVAR_MS);
  };

  // Guarda a última seleção da folha para os botões funcionarem também pelo teclado.
  let ultima: Range | null = null;
  const dentro = () => {
    const s = getSelection();
    return Boolean(s && s.rangeCount && folha.contains(s.getRangeAt(0).commonAncestorContainer));
  };
  const lembrar = () => { if (dentro()) ultima = getSelection()!.getRangeAt(0).cloneRange(); };
  document.addEventListener('selectionchange', lembrar);
  const comando = (fn: () => void) => (e: Event) => {
    e.preventDefault();
    if (!dentro() && ultima) {
      folha.focus();
      const s = getSelection()!;
      s.removeAllRanges();
      s.addRange(ultima);
    }
    if (!dentro() || getSelection()!.isCollapsed) {
      toast('Selecione um trecho do caderno primeiro.', 'info', 2500);
      return;
    }
    fn();
    normalizar(folha);
    mudou();
  };
  const marcar = (rgb: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('hiliteColor', false, rgb);
    document.execCommand('styleWithCSS', false, 'false');
  };

  const segurar = (e: Event) => e.preventDefault(); // não tira o foco da folha
  const barra = h('div.barra-caderno', { role: 'toolbar', 'aria-label': 'Marca-texto' },
    ...CORES.map((c) => h('button.cor', {
      type: 'button', title: `Marcar de ${c.nome.toLowerCase()}`, 'aria-label': `Marcar de ${c.nome.toLowerCase()}`, 'data-cor': c.id,
      onmousedown: segurar, onclick: comando(() => marcar(c.rgb)),
    })),
    h('button.btn.fantasma', { type: 'button', title: 'Tirar a cor do trecho', onmousedown: segurar, onclick: comando(() => marcar('transparent')) }, 'Sem cor'),
    h('button.btn.fantasma', { type: 'button', title: 'Negrito (Ctrl+B)', onmousedown: segurar, onclick: comando(() => document.execCommand('bold')) }, h('b', {}, 'N')),
    h('span.espaco'),
    estado,
  );

  folha.addEventListener('input', mudou);
  folha.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
  });
  folha.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  folha.addEventListener('blur', () => void gravar());

  return {
    el: h('div.caderno-editor', {}, barra, folha),
    conteudo: () => serializar(folha),
    definir: (c) => { renderizar(folha, c); sujo = false; estado.textContent = ''; },
    descarregar: gravar,
    destruir: () => { document.removeEventListener('selectionchange', lembrar); void gravar(); },
  };
}

// ---- Tela do caderno -----------------------------------------------------------

export async function telaCaderno(idInicial: string | undefined, nav: Navegar) {
  let itens: ItemCaderno[] = [];
  let filtroCor: CorCaderno | null = null;
  let busca = '';
  let aberta: PaginaCaderno | null = null;
  let editor: Editor | null = null;

  const lista = h('div.lista-caderno');
  const area = h('div.pagina-caderno');
  const campoBusca = h('input', { type: 'text', placeholder: 'Buscar no caderno', 'aria-label': 'Buscar no caderno' });
  campoBusca.addEventListener('input', () => { busca = campoBusca.value.trim().toLowerCase(); pintarLista(); });
  const filtros = h('div.filtros-cor', { role: 'group', 'aria-label': 'Filtrar por cor' });

  async function recarregar(): Promise<void> {
    itens = (await api.get<{ paginas: ItemCaderno[] }>('caderno')).paginas;
    pintarFiltros();
    pintarLista();
  }

  function pintarFiltros(): void {
    preencher(filtros, ...CORES.map((c) => h('button.cor', {
      type: 'button', 'data-cor': c.id, 'aria-pressed': String(filtroCor === c.id), title: `Só marcações em ${c.nome.toLowerCase()}`,
      'aria-label': `Filtrar ${c.nome.toLowerCase()}`, class: filtroCor === c.id ? 'ativa' : undefined,
      onclick: () => { filtroCor = filtroCor === c.id ? null : c.id; pintarFiltros(); pintarLista(); },
    })), filtroCor ? h('button.btn.fantasma', { type: 'button', onclick: () => { filtroCor = null; pintarFiltros(); pintarLista(); } }, 'Todas') : null);
  }

  function pintarLista(): void {
    const vis = itens.filter((i) => (!filtroCor || i.cores.includes(filtroCor))
      && (!busca || `${i.titulo} ${i.resumo} ${i.marcas.map((m) => m.t).join(' ')}`.toLowerCase().includes(busca)));
    preencher(lista, vis.length ? vis.map((i) => h('button.item-caderno', {
      type: 'button', class: aberta?.id === i.id ? 'ativa' : undefined, onclick: () => void abrir(i.id),
    },
      h('div.titulo-item', {}, i.moduloId ? h('span.selo', {}, i.moduloId) : h('span.selo', {}, 'livre'), ' ', i.titulo),
      filtroCor
        ? h('div.marcas', {}, i.marcas.filter((m) => m.c === filtroCor).slice(0, 4).map((m) => h('mark.mt', { 'data-cor': m.c }, m.t)))
        : h('div.mudo.resumo', {}, i.resumo || '(vazia)'),
      h('div.cores-item', {}, i.cores.map((c) => h('span.ponto', { 'data-cor': c, title: c }))),
    )) : h('p.mudo', {}, itens.length ? 'Nada com esse filtro.' : 'Caderno vazio. Crie uma página ou anote na tela de estudo de um tópico.'));
  }

  async function fecharAberta(): Promise<void> {
    if (!editor) return;
    await editor.descarregar();
    editor.destruir();
  }

  async function abrir(id: number): Promise<void> {
    await fecharAberta();
    aberta = await api.get<PaginaCaderno>(`caderno/${id}`);
    history.replaceState(null, '', `#/caderno/${id}`);
    pintarPagina();
    pintarLista();
  }

  function pintarPagina(): void {
    const p = aberta;
    if (!p || p.id === null) {
      preencher(area, h('div.vazio-caderno', {}, h('p', {}, '📓 Escolha uma página ao lado ou crie uma nova.'),
        h('p.mudo', {}, 'Selecione um trecho e clique numa cor para marcar: amarelo, vermelho, preto, branco ou azul.')));
      editor = null;
      return;
    }
    const id = p.id;
    editor = criarEditor(p.conteudo, async (c) => {
      const r = await api.put<PaginaCaderno>(`caderno/${id}`, { conteudo: c });
      atualizarItem(r);
    }, { altura: 360, rotulo: `Página ${p.titulo}` });
    const titulo = p.topico
      ? h('h2', {}, p.titulo)
      : h('input.titulo-pagina', { type: 'text', value: p.titulo, 'aria-label': 'Título da página', maxlength: '120' });
    if (titulo instanceof HTMLInputElement) {
      titulo.addEventListener('change', async () => {
        const r = await api.put<PaginaCaderno>(`caderno/${id}`, { titulo: titulo.value });
        atualizarItem(r);
      });
    }
    preencher(area,
      h('div.cabeca-pagina', {}, titulo,
        p.topico ? h('button.btn', { type: 'button', onclick: () => nav.ir(`#/estudo/${p.topico!.id}`) }, '📖 Estudar o tópico') : null,
        !p.topico ? h('button.btn.fantasma', {
          type: 'button',
          onclick: async () => {
            if (!confirm(`Apagar a página "${p.titulo}"?`)) return;
            await api.del(`caderno/${id}`);
            aberta = null;
            editor = null;
            history.replaceState(null, '', '#/caderno');
            await recarregar();
            pintarPagina();
          },
        }, 'Apagar') : null,
      ),
      p.topico ? h('p.mudo', { style: 'margin:0 0 8px;font-size:13px' }, `${p.topico.moduloId} · ${p.topico.moduloNome}`) : null,
      editor.el,
    );
  }

  function atualizarItem(p: PaginaCaderno): void {
    if (aberta && aberta.id === p.id) aberta = { ...aberta, titulo: p.titulo, atualizadaEm: p.atualizadaEm };
    void recarregar();
  }

  const nova = h('button.btn.principal', {
    type: 'button',
    onclick: async () => {
      await fecharAberta();
      const p = await api.post<PaginaCaderno>('caderno', { titulo: 'Nova página', conteudo: [] });
      await recarregar();
      await abrir(p.id!);
      area.querySelector<HTMLInputElement>('.titulo-pagina')?.select();
    },
  }, '+ Nova página');

  await recarregar();
  const inicial = Number(idInicial);
  if (inicial > 0) await abrir(inicial).catch(() => pintarPagina());
  else pintarPagina();

  const el = h('section.tela', {},
    h('div.tela-topo', {}, h('button.btn.fantasma', { onclick: () => nav.ir('#/mundo') }, '← Mapa'), h('h1', {}, '📓 Caderno')),
    h('div.caderno', {},
      h('aside.lado-caderno', {}, nova, campoBusca, filtros, lista),
      area,
    ),
  );
  return { el, destruir: () => void fecharAberta() };
}
