// Pixel art desenhada à mão: cada letra é uma cor da paleta; '.' é transparente.

export type Paleta = Record<string, string>;
export interface Sprite { linhas: string[]; paleta: Paleta }

const PELE = '#f1c27d';
const OLHO = '#1b1b1b';

export const HEROI: Sprite[] = [
  {
    paleta: { H: '#5a3b1a', S: PELE, E: OLHO, T: '#f5a524', B: '#3b2a1a', P: '#2f3e5c', K: '#1b1b1b', M: '#9aa4ad', W: '#7a4a21' },
    linhas: [
      '....HHHH....',
      '...HHHHHH...',
      '...SSSSSS...',
      '...SESSES...',
      '...SSSSSS...',
      '....SSSS....',
      '..TTTTTTTTMM',
      '.STTTTTTTSMM',
      '.STTTTTTTSW.',
      '.STBBBBBTSW.',
      '..TTTTTTT.W.',
      '..PPP.PPP...',
      '..PPP.PPP...',
      '..PPP.PPP...',
      '..KKK.KKK...',
      '.KKKK.KKKK..',
    ],
  },
  {
    paleta: { H: '#5a3b1a', S: PELE, E: OLHO, T: '#f5a524', B: '#3b2a1a', P: '#2f3e5c', K: '#1b1b1b', M: '#9aa4ad', W: '#7a4a21' },
    linhas: [
      '....HHHH....',
      '...HHHHHH...',
      '...SSSSSS...',
      '...SESSES...',
      '...SSSSSS...',
      '....SSSS....',
      '..TTTTTTTTMM',
      '.STTTTTTTSMM',
      '.STTTTTTTSW.',
      '.STBBBBBTSW.',
      '..TTTTTTT.W.',
      '..PPP..PPP..',
      '.PPP...PPP..',
      '.PPP....PPP.',
      '.KKK....KKK.',
      'KKKK....KKKK',
    ],
  },
];

export function slime(cor: string, escura: string): Sprite {
  return {
    paleta: { X: cor, L: escura, W: '#ffffff', E: OLHO, D: '#3a1020' },
    linhas: [
      '.....XXXX.....',
      '...XXXXXXXX...',
      '..XXXXXXXXXX..',
      '.XXXWWXXWWXXX.',
      '.XXXWEXXWEXXX.',
      'XXXXXXXXXXXXXX',
      'XXXXXDDDDXXXXX',
      'XXXXXXXXXXXXXX',
      '.XXXXXXXXXXXX.',
      '..LLLLLLLLLL..',
    ],
  };
}

export function slimeElite(cor: string, escura: string): Sprite {
  return {
    paleta: { X: cor, L: escura, W: '#ffffff', E: OLHO, D: '#3a1020', M: '#c9d1d9', N: '#7d8590' },
    linhas: [
      '......NN......',
      '....MMMMMM....',
      '...MMMMMMMM...',
      '..NNNNNNNNNN..',
      '.XXXWWXXWWXXX.',
      '.XXXWEXXWEXXX.',
      'XXXXXXXXXXXXXX',
      'XXXXXDDDDXXXXX',
      'XXXXXXXXXXXXXX',
      '.XXXXXXXXXXXX.',
      '..LLLLLLLLLL..',
    ],
  };
}

export function guardiao(cor: string, escura: string): Sprite {
  return {
    paleta: { X: cor, L: escura, H: '#e8e1d0', R: '#ff3b3b', D: '#1b0f14', W: '#ffffff' },
    linhas: [
      '..H..................H..',
      '..HH................HH..',
      '...HH..XXXXXXXXXX..HH...',
      '....HXXXXXXXXXXXXXXH....',
      '....XXXXXXXXXXXXXXXX....',
      '...XXXRRXXXXXXXXRRXXX...',
      '...XXXRRXXXXXXXXRRXXX...',
      '...XXXXXXXXXXXXXXXXXX...',
      '...XXXXDDDDDDDDDDXXXX...',
      '...XXXXDWDWDWDWDDXXXX...',
      '....XXXXXXXXXXXXXXXX....',
      '..LLXXXXXXXXXXXXXXXXLL..',
      '.LLLLXXXXXXXXXXXXXXLLLL.',
      '.LLL.XXXXXXXXXXXXXX.LLL.',
      '.LL..XXXXXXXXXXXXXX..LL.',
      'LLL..XXXXXXXXXXXXXX..LLL',
      '.....XXXXXX..XXXXXX.....',
      '.....XXXXX....XXXXX.....',
      '....LLLLLL....LLLLLL....',
      '....LLLLLL....LLLLLL....',
    ],
  };
}

export const TENDA: Sprite = {
  paleta: { F: '#e5484d', P: '#7a4a21', T: '#c9a46a', U: '#a8834a', D: '#2a1a0e', G: '#5b7d3a' },
  linhas: [
    '......PFF.....',
    '......PFFF....',
    '......P.......',
    '.....TTT......',
    '....TTUTT.....',
    '...TTTUTTT....',
    '..TTTTDTTTT...',
    '.TTTTDDDTTTT..',
    'TTTTDDDDDTTTT.',
    'TTTDDDDDDDTTT.',
    'GGGGGGGGGGGGGG',
  ],
};

export function torre(cor: string): Sprite {
  return {
    paleta: { X: cor, S: '#8b93a7', W: '#ffd36e', D: '#2a1a0e', Q: '#5f6678' },
    linhas: [
      '..X..X..X..X..',
      '..XXXXXXXXXX..',
      '..XXXXXXXXXX..',
      '...XSSSSSSX...',
      '...XSWWWWSX...',
      '...XSWWWWSX...',
      '...XSSSSSSX...',
      '...XSQSSQSX...',
      '...XSSDDSSX...',
      '...XSDDDDSX...',
      '..XXSDDDDSXX..',
      '.XXXXXXXXXXXX.',
    ],
  };
}

export const CADEADO: Sprite = {
  paleta: { K: '#c9d1d9', Y: '#d4a017', D: '#5a4300' },
  linhas: ['..KKKK..', '.K....K.', '.K....K.', 'YYYYYYYY', 'YYYDDYYY', 'YYYDDYYY', 'YYYYYYYY'],
};

export const CAVEIRA: Sprite = {
  paleta: { W: '#e8e1d0', K: '#1b1b1b' },
  linhas: ['.WWWWWW.', 'WWWWWWWW', 'WKKWWKKW', 'WKKWWKKW', 'WWWKKWWW', '.WWWWWW.', '..W.W.W.', '..WWWWW.'],
};

export const TROFEU: Sprite = {
  paleta: { Y: '#f5c542', W: '#8a6d1d' },
  linhas: ['YYYYYYYYYY', 'Y.YYYYYY.Y', 'Y.YYYYYY.Y', '.YYYYYYYY.', '..YYYYYY..', '....YY....', '....YY....', '...YYYY...', '..WWWWWW..'],
};

export const BANDEIRA: Sprite = {
  paleta: { P: '#c9d1d9', F: '#f5a524' },
  linhas: ['PFFFFF..', 'PFFFFFF.', 'PFFFFF..', 'P.......', 'P.......', 'P.......'],
};

const cache = new Map<string, HTMLCanvasElement>();

export function desenhar(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, escala: number, opacidade = 1): void {
  const chave = JSON.stringify([s.linhas, s.paleta, escala]);
  let c = cache.get(chave);
  if (!c) {
    const largura = Math.max(...s.linhas.map((l) => l.length));
    c = document.createElement('canvas');
    c.width = largura * escala;
    c.height = s.linhas.length * escala;
    const g = c.getContext('2d')!;
    s.linhas.forEach((linha, j) => {
      [...linha].forEach((ch, i) => {
        const cor = s.paleta[ch];
        if (!cor) return;
        g.fillStyle = cor;
        g.fillRect(i * escala, j * escala, escala, escala);
      });
    });
    cache.set(chave, c);
  }
  ctx.globalAlpha = opacidade;
  ctx.drawImage(c, Math.round(x), Math.round(y));
  ctx.globalAlpha = 1;
}

export function tamanho(s: Sprite, escala: number): { w: number; h: number } {
  return { w: Math.max(...s.linhas.map((l) => l.length)) * escala, h: s.linhas.length * escala };
}

export const CORES_TRILHA: Record<string, [string, string]> = {
  base: ['#9aa4ad', '#5f6678'],
  firmware: ['#4f8cff', '#2a4f99'],
  hardware: ['#ff8a3d', '#a8501b'],
  fabricacao: ['#3ecf8e', '#1d7a51'],
  silicio: ['#a970ff', '#5f35a3'],
  sensores: ['#3fd6e0', '#1d7f86'],
  produto: ['#f5c542', '#9a7a1c'],
  integrador: ['#ffd36e', '#b07d1d'],
};

export interface Regiao { ceu: [string, string]; montanha: string; chao: string; chao2: string }

export const REGIOES: Record<string, Regiao> = {
  A0: { ceu: ['#1d1420', '#5a2e1c'], montanha: '#2b1d1a', chao: '#3b2a1a', chao2: '#4a3622' },
  A1: { ceu: ['#0f1d1a', '#1f4d3a'], montanha: '#143026', chao: '#1e3b23', chao2: '#27502e' },
  A2: { ceu: ['#0f1a14', '#2c5a3c'], montanha: '#1b3a2a', chao: '#3a2f1c', chao2: '#8a5a2b' },
  A3: { ceu: ['#14161c', '#3a4150'], montanha: '#262b36', chao: '#3b404c', chao2: '#59606e' },
  A4: { ceu: ['#0c1630', '#2a4a7a'], montanha: '#14244a', chao: '#22324f', chao2: '#d8dde6' },
  A5: { ceu: ['#1a1410', '#5a3a1a'], montanha: '#2f2218', chao: '#3d2a1a', chao2: '#c2a23a' },
  A6: { ceu: ['#120c22', '#3c2a6a'], montanha: '#22164a', chao: '#2a2048', chao2: '#7a5ac8' },
  A7: { ceu: ['#04121a', '#0f3a48'], montanha: '#06222c', chao: '#071a20', chao2: '#1d7f86' },
};
