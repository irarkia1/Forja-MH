import {
  BANDEIRA, CADEADO, CAVEIRA, CORES_TRILHA, HEROI, REGIOES, TENDA, TROFEU,
  desenhar, guardiao, slime, slimeElite, tamanho, torre, type Regiao, type Sprite,
} from './sprites';

// Cena em linha: nós ligados por caminhos, com bifurcações. O boneco anda
// pelas setas (← → escolhe ir e voltar; ↑ ↓ escolhe o ramo) ou por clique.

export type TipoNo = 'acampamento' | 'modulo' | 'inimigo' | 'elite' | 'chefe';

export interface No {
  id: string;
  rotulo: string;
  tipo: TipoNo;
  estado: string; // bloqueado deixa o nó intransitável
  trilha: string;
  pais: string[];
  adaptacao?: number;
}

interface NoPos extends No {
  x: number;
  y: number;
  filhos: string[];
}

export interface OpcoesCena {
  nos: No[];
  regiao: string;
  inicio?: string | null;
  aoChegar: (no: No) => void;
  aoAtivar: (no: No) => void;
}

const ESC = 3;
const PASSO_X = 190;
const PASSO_Y = 120;
const VELOCIDADE = 420; // px/s

export class Cena {
  private ctx: CanvasRenderingContext2D;
  private nos = new Map<string, NoPos>();
  private atual: string;
  private ramo = 0;
  private historico: string[] = [];
  private caminho: { x: number; y: number }[] = [];
  private destino: string | null = null;
  private pos = { x: 0, y: 0 };
  private camX = 0;
  private andando = false;
  private quadro = 0;
  private t0 = performance.now();
  private raf = 0;
  private montanhas: number[] = [];
  private regiao: Regiao;
  private largura = 0;
  private altura = 0;
  private resize: ResizeObserver;
  private teclas = (e: KeyboardEvent) => this.aoTeclar(e);

  constructor(
    private canvas: HTMLCanvasElement,
    private o: OpcoesCena,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.regiao = REGIOES[o.regiao] ?? REGIOES.A0!;
    this.montar(o.nos);
    const inicio = o.inicio && this.nos.has(o.inicio) ? o.inicio : o.nos[0]!.id;
    this.atual = inicio;
    const n = this.nos.get(inicio)!;
    this.pos = { x: n.x, y: n.y };
    let semente = o.regiao.charCodeAt(1) * 9301;
    for (let i = 0; i < 64; i++) this.montanhas.push(((semente = (semente * 9301 + 49297) % 233280) / 233280) * 0.6 + 0.2);
    this.resize = new ResizeObserver(() => this.medir());
    this.resize.observe(canvas);
    this.medir();
    canvas.addEventListener('click', (e) => this.aoClicar(e));
    canvas.addEventListener('mousemove', (e) => {
      canvas.style.cursor = this.noEm(e) ? 'pointer' : 'default';
    });
    window.addEventListener('keydown', this.teclas);
    this.raf = requestAnimationFrame((t) => this.laco(t));
    queueMicrotask(() => o.aoChegar(this.nos.get(this.atual)!));
  }

  destruir(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.teclas);
    this.resize.disconnect();
  }

  noAtual(): No {
    return this.nos.get(this.atual)!;
  }

  // ---- Layout: profundidade = maior caminho desde a raiz; linhas por ordem.
  private montar(nos: No[]): void {
    const prof = new Map<string, number>();
    const porId = new Map(nos.map((n) => [n.id, n]));
    const calc = (id: string, pilha = new Set<string>()): number => {
      if (prof.has(id)) return prof.get(id)!;
      if (pilha.has(id)) return 0;
      pilha.add(id);
      const n = porId.get(id);
      const p = n && n.pais.length ? Math.max(...n.pais.filter((x) => porId.has(x)).map((x) => calc(x, pilha) + 1), 0) : 0;
      prof.set(id, p);
      return p;
    };
    nos.forEach((n) => calc(n.id));
    const colunas = new Map<number, No[]>();
    for (const n of nos) colunas.set(prof.get(n.id)!, [...(colunas.get(prof.get(n.id)!) ?? []), n]);
    const yDe = new Map<string, number>();
    for (const c of [...colunas.keys()].sort((a, b) => a - b)) {
      const lista = colunas.get(c)!.map((n, ordem) => {
        const ys = n.pais.map((p) => yDe.get(p)).filter((y): y is number => y !== undefined);
        return { n, ordem, centro: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0 };
      });
      lista.sort((a, b) => a.centro - b.centro || a.ordem - b.ordem);
      lista.forEach(({ n }, i) => {
        const y = (i - (lista.length - 1) / 2) * PASSO_Y;
        yDe.set(n.id, y);
        this.nos.set(n.id, { ...n, x: 110 + c * PASSO_X, y, filhos: [] });
      });
    }
    for (const n of this.nos.values()) for (const p of n.pais) this.nos.get(p)?.filhos.push(n.id);
    for (const n of this.nos.values()) n.filhos.sort((a, b) => this.nos.get(a)!.y - this.nos.get(b)!.y);
  }

  private medir(): void {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.largura = r.width;
    this.altura = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private transitavel(id: string): boolean {
    return this.nos.get(id)?.estado !== 'bloqueado';
  }

  private filhosLivres(id: string): string[] {
    return (this.nos.get(id)?.filhos ?? []).filter((f) => this.transitavel(f));
  }

  // ---- Movimento
  private aoTeclar(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || document.querySelector('.veu')) return;
    const filhos = this.filhosLivres(this.atual);
    switch (e.key) {
      case 'ArrowRight': {
        const alvo = filhos[this.ramo % Math.max(1, filhos.length)];
        if (alvo) this.irPara(alvo);
        break;
      }
      case 'ArrowLeft': {
        const n = this.nos.get(this.atual)!;
        const volta = this.historico.at(-1);
        const alvo = volta && n.pais.includes(volta) ? volta : n.pais.find((p) => this.transitavel(p));
        if (alvo) {
          if (alvo === volta) this.historico.pop();
          this.irPara(alvo, false);
        }
        break;
      }
      case 'ArrowUp':
      case 'ArrowDown':
        if (filhos.length > 1) this.ramo = (this.ramo + (e.key === 'ArrowUp' ? -1 : 1) + filhos.length) % filhos.length;
        break;
      case 'Enter':
      case ' ':
        if (!this.andando) this.o.aoAtivar(this.noAtual());
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  private irPara(id: string, guardar = true): void {
    if (this.andando) return;
    const de = this.atual;
    const rota = this.rota(de, id);
    if (!rota) return;
    if (guardar) this.historico.push(de);
    this.caminho = [];
    for (let i = 1; i < rota.length; i++) this.caminho.push(...this.segmento(rota[i - 1]!, rota[i]!));
    this.destino = id;
    this.andando = true;
    this.ramo = 0;
  }

  // Busca em largura no grafo não dirigido, só por nós transitáveis.
  private rota(de: string, para: string): string[] | null {
    const ant = new Map<string, string | null>([[de, null]]);
    const fila = [de];
    while (fila.length) {
      const id = fila.shift()!;
      if (id === para) break;
      const n = this.nos.get(id)!;
      for (const v of [...n.filhos, ...n.pais]) {
        if (!ant.has(v) && this.transitavel(v)) {
          ant.set(v, id);
          fila.push(v);
        }
      }
    }
    if (!ant.has(para)) return null;
    const r: string[] = [];
    for (let c: string | null = para; c; c = ant.get(c) ?? null) r.unshift(c);
    return r;
  }

  private segmento(a: string, b: string): { x: number; y: number }[] {
    const p = this.nos.get(a)!;
    const q = this.nos.get(b)!;
    if (p.y === q.y) return [{ x: q.x, y: q.y }];
    // Caminho em degrau: sai na horizontal, desce/sobe no meio, entra na horizontal.
    const meio = (p.x + q.x) / 2;
    return [{ x: meio, y: p.y }, { x: meio, y: q.y }, { x: q.x, y: q.y }];
  }

  private noEm(e: MouseEvent): NoPos | undefined {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left + this.camX;
    const y = e.clientY - r.top - this.altura / 2 + 20;
    return [...this.nos.values()].find((n) => Math.abs(n.x - x) < 44 && Math.abs(n.y - y) < 54);
  }

  private aoClicar(e: MouseEvent): void {
    const n = this.noEm(e);
    if (!n || this.andando) return;
    if (n.id === this.atual) return this.o.aoAtivar(n);
    if (!this.transitavel(n.id)) {
      this.o.aoChegar(n); // mostra o painel do bloqueado, sem andar
      return;
    }
    this.irPara(n.id);
  }

  // ---- Desenho
  private laco(t: number): void {
    const dt = Math.min(0.05, (t - this.t0) / 1000);
    this.t0 = t;
    this.atualizar(dt);
    this.pintar(t);
    this.raf = requestAnimationFrame((x) => this.laco(x));
  }

  private atualizar(dt: number): void {
    if (this.andando) {
      let resta = VELOCIDADE * dt;
      while (resta > 0 && this.caminho.length) {
        const alvo = this.caminho[0]!;
        const dx = alvo.x - this.pos.x;
        const dy = alvo.y - this.pos.y;
        const d = Math.hypot(dx, dy);
        if (d <= resta) {
          this.pos = { ...alvo };
          this.caminho.shift();
          resta -= d;
        } else {
          this.pos.x += (dx / d) * resta;
          this.pos.y += (dy / d) * resta;
          resta = 0;
        }
      }
      this.quadro += dt * 8;
      if (!this.caminho.length && this.destino) {
        this.andando = false;
        this.atual = this.destino;
        this.destino = null;
        this.o.aoChegar(this.noAtual());
      }
    }
    const xs = [...this.nos.values()].map((n) => n.x);
    const minX = Math.min(...xs) - 110;
    const maxX = Math.max(...xs) + 110;
    const alvoCam = maxX - minX <= this.largura ? minX - (this.largura - (maxX - minX)) / 2 : Math.max(minX, Math.min(maxX - this.largura, this.pos.x - this.largura / 2));
    this.camX += (alvoCam - this.camX) * Math.min(1, dt * 6);
  }

  private pintar(t: number): void {
    const g = this.ctx;
    const W = this.largura;
    const H = this.altura;
    const R = this.regiao;
    const ceu = g.createLinearGradient(0, 0, 0, H);
    ceu.addColorStop(0, R.ceu[0]);
    ceu.addColorStop(1, R.ceu[1]);
    g.fillStyle = ceu;
    g.fillRect(0, 0, W, H);
    // Montanhas em blocos, com paralaxe
    g.fillStyle = R.montanha;
    const bloco = 24;
    for (let i = -1; i < W / bloco + 2; i++) {
      const k = Math.floor(i + this.camX * 0.25 / bloco);
      const alt = this.montanhas[((k % 64) + 64) % 64]! * H * 0.35;
      g.fillRect(i * bloco - ((this.camX * 0.25) % bloco), H * 0.62 - alt, bloco + 1, alt + 2);
    }
    g.fillStyle = R.chao;
    g.fillRect(0, H * 0.62, W, H);
    g.fillStyle = R.chao2;
    for (let i = 0; i < W / 16 + 2; i++) if ((i + Math.floor(this.camX / 16)) % 3 === 0) g.fillRect(i * 16 - (this.camX % 16), H * 0.62, 8, 4);

    g.save();
    g.translate(-Math.round(this.camX), Math.round(H / 2 - 20));

    // Caminhos
    for (const n of this.nos.values()) {
      for (const f of n.filhos) {
        const q = this.nos.get(f)!;
        const livre = this.transitavel(f) && this.transitavel(n.id);
        const pts = [{ x: n.x, y: n.y }, ...this.segmento(n.id, f)];
        g.strokeStyle = livre ? '#e9d9b0' : 'rgba(200,200,200,0.35)';
        g.lineWidth = 6;
        g.setLineDash(livre ? [] : [8, 8]);
        g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y + 26) : g.moveTo(p.x, p.y + 26)));
        g.stroke();
        void q;
      }
    }
    g.setLineDash([]);

    // Seta do ramo escolhido
    const filhos = this.filhosLivres(this.atual);
    if (!this.andando && filhos.length > 1) {
      const alvo = this.nos.get(filhos[this.ramo % filhos.length]!)!;
      const a = this.noAtual() as NoPos;
      const piscar = 0.6 + 0.4 * Math.sin(t / 180);
      g.fillStyle = `rgba(245,165,36,${piscar})`;
      const ax = a.x + 60;
      const ay = alvo.y === a.y ? a.y + 26 : (a.y + alvo.y) / 2 + 26;
      g.beginPath();
      g.moveTo(ax, ay - 10);
      g.lineTo(ax + 16, ay);
      g.lineTo(ax, ay + 10);
      g.fill();
      g.font = '600 11px Inter, sans-serif';
      g.fillText('↑↓ ramo', ax - 8, ay - 16);
    }

    // Nós
    for (const n of this.nos.values()) this.pintarNo(n, t);

    // Herói
    const quadro = this.andando ? Math.floor(this.quadro) % 2 : 0;
    const heroi = HEROI[quadro]!;
    const tam = tamanho(heroi, ESC);
    const pulo = this.andando ? 0 : Math.round(Math.sin(t / 300) * 1.5);
    desenhar(g, heroi, this.pos.x - tam.w / 2 - 34, this.pos.y + 24 - tam.h + pulo, ESC);
    g.restore();
  }

  private pintarNo(n: NoPos, t: number): void {
    const g = this.ctx;
    const [cor, escura] = CORES_TRILHA[n.trilha] ?? CORES_TRILHA.base!;
    const bloqueado = n.estado === 'bloqueado';
    const atual = n.id === this.atual;
    // Plataforma
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(n.x, n.y + 30, 38, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = atual ? '#f5a524' : bloqueado ? '#4a4f5c' : '#b9a57a';
    g.beginPath();
    g.ellipse(n.x, n.y + 26, 34, 9, 0, 0, Math.PI * 2);
    g.fill();

    let s: Sprite;
    let escala = ESC;
    switch (n.tipo) {
      case 'acampamento': s = TENDA; break;
      case 'modulo': s = torre(bloqueado ? '#5f6678' : cor); break;
      case 'chefe': s = guardiao(bloqueado ? '#5f6678' : cor, escura); escala = 3; break;
      case 'elite': s = slimeElite(bloqueado ? '#5f6678' : cor, escura); break;
      default: s = slime(bloqueado ? '#5f6678' : cor, escura);
    }
    const tam = tamanho(s, escala);
    const derrotado = n.estado === 'derrotado';
    const flutua = n.tipo === 'inimigo' || n.tipo === 'elite' ? Math.round(Math.sin(t / 400 + n.x) * 2) : 0;
    desenhar(g, s, n.x - tam.w / 2, n.y + 24 - tam.h + flutua, escala, derrotado ? 0.35 : bloqueado ? 0.7 : 1);

    // Selos
    const topo = n.y + 24 - tam.h - 6;
    if (bloqueado) desenhar(g, CADEADO, n.x + tam.w / 2 - 8, topo, 2);
    if (derrotado) desenhar(g, CAVEIRA, n.x - 8, n.y - 6, 2);
    if (n.estado === 'vencido') desenhar(g, TROFEU, n.x + tam.w / 2 - 6, topo, 2);
    if (n.estado === 'em_andamento' || n.estado === 'em_estudo' || n.estado === 'pronto') desenhar(g, BANDEIRA, n.x + tam.w / 2 - 4, topo, 2);
    if (n.estado === 'em_preparo') {
      g.fillStyle = '#c9d1d9';
      g.font = '600 10px Inter, sans-serif';
      g.textAlign = 'center';
      g.fillText('em preparo', n.x, topo - 2);
    }
    if (n.adaptacao) {
      g.fillStyle = '#ff5c5c';
      g.font = '700 13px Inter, sans-serif';
      g.textAlign = 'center';
      g.fillText('★'.repeat(n.adaptacao), n.x, topo - 4);
    }
    if (n.estado === 'pronto') {
      g.fillStyle = `rgba(245,165,36,${0.5 + 0.5 * Math.sin(t / 200)})`;
      g.font = '700 12px Inter, sans-serif';
      g.textAlign = 'center';
      g.fillText('⚔ pronto', n.x, topo - (n.adaptacao ? 18 : 4));
    }

    // Rótulo
    g.textAlign = 'center';
    g.font = `${atual ? 700 : 500} 12px Inter, sans-serif`;
    const linhas = quebrar(g, n.rotulo, 160).slice(0, 3);
    linhas.forEach((l, i) => {
      const y = n.y + 52 + i * 15;
      g.fillStyle = 'rgba(0,0,0,0.55)';
      const w = g.measureText(l).width + 8;
      g.fillRect(n.x - w / 2, y - 11, w, 15);
      g.fillStyle = bloqueado ? '#9aa0ad' : atual ? '#ffd36e' : '#f1ece2';
      g.fillText(l, n.x, y);
    });
    g.textAlign = 'start';
  }
}

function quebrar(g: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (g.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  if (linhas.length > 3) linhas[2] = `${linhas[2]!.replace(/.{0,2}$/, '')}…`;
  return linhas;
}
