import { api } from '../api';
import { h, num, pct } from '../ui';
import type { Navegar } from './mapa';

interface Painel {
  horas: { total: number; meta: number; semana: number; metaSemana: number; media8: number; semanasBase: number; previsao: string | null; sequenciaDias: number };
  semanas: { inicio: string; horas: number }[];
  atos: { id: string; nome: string; horasPlanejadas: number; horasReais: number; modulos: number; vencidos: number; topicos: number; derrotados: number; consolidados: number; dominados: number }[];
  trilhas: { trilha: string; horas: number }[];
  qualidade: { combatePrimeira: number | null; combates: number; chefeVitorias: number | null; chefes: number; chefeAcerto: number | null; fantasmas: number; fantasmasVencidos: number | null; fantasmasAtrasados: number; ajudaChefe: number | null; metaAjuda: number };
  fracos: { id: string; texto: string; topico: string; topicoId: string; fraqueza: number; classe: string }[];
  reaisPlanejadas: { id: string; nome: string; horas: number; reais: number; razao: number | null }[];
}

const TRILHA: Record<string, string> = {
  base: 'Base', firmware: 'Firmware', hardware: 'Hardware', fabricacao: 'Fabricação', silicio: 'Silício', sensores: 'Sensores', produto: 'Produto', integrador: 'Integrador',
};
const SVG = 'http://www.w3.org/2000/svg';

function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, ...filhos: (Node | string)[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  el.append(...filhos);
  return el;
}

// Barra com ponta arredondada (4px) e base reta, crescendo da linha de base.
function coluna(x: number, y: number, w: number, hgt: number): SVGPathElement {
  const r = Math.min(4, w / 2, hgt);
  const d = hgt <= 0 ? '' : `M${x},${y + hgt} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + hgt} Z`;
  return s('path', { d, class: 'marca' });
}

function passoBonito(max: number): number {
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(Math.max(bruto, 0.1)));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? mag * 10;
}

function tabela(cab: string[], linhas: (string | number)[][]): HTMLElement {
  return h('details.ver-tabela', {}, h('summary', {}, 'Ver como tabela'),
    h('table', {}, h('thead', {}, h('tr', {}, cab.map((c) => h('th', {}, c)))),
      h('tbody', {}, linhas.map((l) => h('tr', {}, l.map((c) => h('td', {}, String(c))))))));
}

function desenharSemanas(caixa: HTMLElement, semanas: Painel['semanas'], meta: number): void {
  const W = Math.max(280, Math.round(caixa.clientWidth)), H = 240, esq = 36, dir = 8, topo = 22, base = 26;
  const max = Math.max(meta * 1.15, ...semanas.map((x) => x.horas), 1);
  const passo = passoBonito(max);
  const teto = Math.ceil(max / passo) * passo;
  const larg = (W - esq - dir) / semanas.length;
  const barra = Math.max(2, Math.min(24, larg - 2));
  const y = (v: number) => topo + (H - topo - base) * (1 - v / teto);
  const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Horas válidas por semana, últimas ${semanas.length} semanas` });
  for (let v = 0; v <= teto + 1e-9; v += passo) {
    svg.append(s('line', { x1: esq, x2: W - dir, y1: y(v), y2: y(v), class: 'grade' }), s('text', { x: esq - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'eixo' }, num(v)));
  }
  // Meta da semana: anotação de referência (não é uma série), rotulada à esquerda.
  svg.append(s('line', { x1: esq, x2: W - dir, y1: y(meta), y2: y(meta), class: 'meta' }), s('text', { x: esq + 4, y: y(meta) - 5, class: 'rotulo' }, `meta ${meta} h`));
  const dica = h('div.dica-grafico', { role: 'status' });
  const cadaRotulo = larg < 22 ? 8 : 4;
  semanas.forEach((sem, i) => {
    const x = esq + i * larg + (larg - barra) / 2;
    const rotulo = new Date(sem.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const g = s('g', { class: i === semanas.length - 1 ? 'atual' : '' });
    g.append(coluna(x, y(sem.horas), barra, y(0) - y(sem.horas)));
    // Alvo de hover maior que a marca: a faixa inteira da semana.
    const alvo = s('rect', { x: esq + i * larg, y: topo, width: larg, height: H - topo - base, class: 'alvo', tabindex: 0, 'aria-label': `Semana de ${rotulo}: ${num(sem.horas)} horas` });
    const mostrar = () => {
      dica.textContent = `Semana de ${rotulo}${i === semanas.length - 1 ? ' (atual)' : ''}: ${num(sem.horas)} h`;
      dica.style.left = `${Math.min(W - 80, Math.max(80, esq + i * larg + larg / 2))}px`;
      dica.style.top = `${y(sem.horas)}px`;
      dica.classList.add('visivel');
    };
    alvo.addEventListener('mouseenter', mostrar);
    alvo.addEventListener('focus', mostrar);
    alvo.addEventListener('mouseleave', () => dica.classList.remove('visivel'));
    alvo.addEventListener('blur', () => dica.classList.remove('visivel'));
    g.append(alvo);
    svg.append(g);
    const ultima = i === semanas.length - 1;
    if (ultima || (i % cadaRotulo === 1 && i < semanas.length - 2)) svg.append(s('text', { x: x + barra / 2, y: H - 8, 'text-anchor': ultima ? 'end' : 'middle', class: 'eixo' }, ultima ? 'atual' : rotulo));
  });
  const ultima = semanas.at(-1)!;
  if (ultima.horas > 0) svg.append(s('text', { x: esq + (semanas.length - 1) * larg + larg / 2, y: y(ultima.horas) - 6, 'text-anchor': 'middle', class: 'rotulo' }, num(ultima.horas)));
  caixa.replaceChildren(svg, dica);
}

// Desenha na largura real (texto não escala) e redesenha quando a largura muda.
function graficoSemanas(semanas: Painel['semanas'], meta: number): HTMLElement {
  const caixa = h('div.grafico');
  let largura = 0;
  new ResizeObserver(() => {
    if (Math.abs(caixa.clientWidth - largura) < 4) return;
    largura = caixa.clientWidth;
    desenharSemanas(caixa, semanas, meta);
  }).observe(caixa);
  return caixa;
}

function barrasHorizontais(itens: { nome: string; valor: number }[], unidade: string): HTMLElement {
  if (!itens.length) return h('p.mudo', {}, 'Ainda sem horas registradas.');
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return h('div.barras-h', {}, itens.map((i) =>
    h('div.linha-h', { title: `${i.nome}: ${num(i.valor)} ${unidade}` },
      h('span.nome-h', {}, i.nome),
      h('span.trilho-h', {}, h('span.marca-h', { style: `width:${Math.max(1, (i.valor / max) * 100)}%` })),
      h('span.valor-h', {}, `${num(i.valor)} ${unidade}`))));
}

function tile(rotulo: string, valor: string, extra?: string | Node): HTMLElement {
  return h('div.tile', {}, h('div.tile-rotulo', {}, rotulo), h('div.tile-valor', {}, valor), extra ? h('div.tile-extra', {}, extra) : null);
}

// Faixas saudáveis do BALANCEAMENTO.md: sempre ícone + texto, nunca só cor.
function faixa(v: number | null, min: number, max: number, n: number): Node {
  if (v === null || n < 5) return h('span.status.neutro', {}, '… poucos dados');
  if (v < min) return h('span.status.alerta', {}, `▼ abaixo de ${pct(min)}`);
  if (v > max) return h('span.status.alerta', {}, `▲ acima de ${pct(max)}`);
  return h('span.status.ok', {}, `✔ na faixa ${pct(min)}–${pct(max)}`);
}

export async function telaPainel(nav: Navegar) {
  const p = await api.get<Painel>('painel');
  const q = p.qualidade;
  const previsao = p.horas.previsao ? new Date(p.horas.previsao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—';
  const el = h('section.tela', {},
    h('div.tela-topo', {}, h('button.btn.fantasma', { onclick: () => nav.ir('#/mundo') }, '← Mapa'), h('h1', {}, '📊 PAINEL DE ACOMPANHAMENTO')),
    h('div.painel-corpo', {},
      h('section.heroi', {},
        h('div.tile-rotulo', {}, 'Horas válidas na jornada'),
        h('div.heroi-valor', {}, num(p.horas.total), h('span', {}, ` / ${p.horas.meta.toLocaleString('pt-BR')} h`)),
        h('div.medidor', { role: 'progressbar', 'aria-valuenow': Math.round((p.horas.total / p.horas.meta) * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 },
          h('i', { style: `width:${Math.max(0.3, (p.horas.total / p.horas.meta) * 100)}%` })),
        h('div.mudo', {}, `${pct(p.horas.total / p.horas.meta)} da jornada`),
      ),
      h('section.tiles', {},
        tile('Esta semana', `${num(p.horas.semana)} h`, `meta ${p.horas.metaSemana} h · ${pct(p.horas.semana / p.horas.metaSemana)}`),
        tile('Ritmo', `${num(p.horas.media8)} h/sem`, p.horas.semanasBase >= 8 ? 'média das últimas 8 semanas' : `média de ${p.horas.semanasBase} semana(s) — ainda curto`),
        tile('Previsão de término', previsao, p.horas.previsao ? 'no ritmo atual' : 'estude uma semana para estimar'),
        tile('Sequência', `${p.horas.sequenciaDias} dia(s)`, 'dias seguidos com 30 min ou mais'),
      ),
      h('section.cartao.largo', {},
        h('h4', {}, 'HORAS POR SEMANA'),
        graficoSemanas(p.semanas, p.horas.metaSemana),
        tabela(['Semana de', 'Horas'], p.semanas.map((x) => [new Date(x.inicio).toLocaleDateString('pt-BR'), num(x.horas)])),
      ),
      h('section.cartao', {},
        h('h4', {}, 'PROGRESSO POR ATO'),
        h('div', { style: 'display:grid;gap:12px' }, p.atos.map((a) =>
          h('div', {},
            h('div', { style: 'display:flex;justify-content:space-between;gap:8px;font-size:14px' }, h('b', {}, `${a.id} ${a.nome}`), h('span.mudo', {}, `${a.vencidos}/${a.modulos} fases`)),
            h('div.medidor.fino', { title: `Tópicos derrotados: ${a.derrotados} de ${a.topicos}` }, h('i', { style: `width:${(a.derrotados / Math.max(1, a.topicos)) * 100}%` })),
            h('div.mudo', { style: 'font-size:12px' }, `☠ ${a.derrotados} derrotados · 🥈 ${a.consolidados} consolidados · ⭐ ${a.dominados} dominados de ${a.topicos} tópicos · ${num(a.horasReais)} de ${a.horasPlanejadas} h`),
          ))),
      ),
      h('section.cartao', {},
        h('h4', {}, 'HORAS POR TRILHA'),
        barrasHorizontais(p.trilhas.map((t) => ({ nome: TRILHA[t.trilha] ?? t.trilha, valor: t.horas })), 'h'),
      ),
      h('section.cartao', {},
        h('h4', {}, 'QUALIDADE DO ESTUDO'),
        h('div.tiles.compactos', {},
          tile('Vitória no 1º combate', q.combatePrimeira === null ? '—' : pct(q.combatePrimeira), faixa(q.combatePrimeira, 0.7, 0.9, q.combates)),
          tile('Vitória em chefes', q.chefeVitorias === null ? '—' : pct(q.chefeVitorias), faixa(q.chefeVitorias, 0.5, 0.8, q.chefes)),
          tile('Fantasmas vencidos', q.fantasmasVencidos === null ? '—' : pct(q.fantasmasVencidos), faixa(q.fantasmasVencidos, 0.75, 0.9, q.fantasmas)),
          tile('Ajuda em chefes', q.ajudaChefe === null ? '—' : pct(q.ajudaChefe), q.ajudaChefe === null ? h('span.status.neutro', {}, '… sem chefes') : q.ajudaChefe <= 0.15 ? h('span.status.ok', {}, '✔ até 15%') : h('span.status.alerta', {}, '▲ acima de 15%')),
          tile('Fantasmas atrasados', String(q.fantasmasAtrasados), q.fantasmasAtrasados ? h('span.status.alerta', {}, '⚠ revise hoje') : h('span.status.ok', {}, '✔ em dia')),
        ),
      ),
      h('section.cartao', {},
        h('h4', {}, 'PONTOS FRACOS'),
        p.fracos.length
          ? h('ol', { style: 'margin:0;padding-left:20px;display:grid;gap:8px;font-size:14px' }, p.fracos.map((f) =>
              h('li', {},
                h('div', {}, f.texto),
                h('div.mudo', { style: 'font-size:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
                  `${f.topico} · erro ${pct(f.fraqueza)}`,
                  h('span.status', { class: f.classe === 'fraco' ? 'alerta' : f.classe === 'atencao' ? 'neutro' : 'ok' }, f.classe === 'fraco' ? '▼ fraco' : f.classe === 'atencao' ? '● atenção' : '✔ forte'),
                  h('a', { href: `#/estudo/${f.topicoId}` }, 'estudar →')))))
          : h('p.mudo', {}, 'Aparece depois de umas 3 respostas por objetivo.'),
      ),
      p.reaisPlanejadas.length
        ? h('section.cartao.largo', {},
            h('h4', {}, 'HORAS REAIS × PLANEJADAS (FASES VENCIDAS)'),
            h('table', {}, h('thead', {}, h('tr', {}, ['Fase', 'Planejado', 'Real', 'Real ÷ planejado'].map((c) => h('th', {}, c)))),
              h('tbody', {}, p.reaisPlanejadas.map((r) => h('tr', {}, h('td', {}, `${r.id} ${r.nome}`), h('td', {}, `${r.horas} h`), h('td', {}, `${num(r.reais)} h`), h('td', {}, r.razao === null ? '—' : `${num(r.razao, 2)}×`))))),
          )
        : null,
    ),
  );
  return { el };
}
