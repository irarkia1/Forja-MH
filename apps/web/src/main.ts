import './estilo.css';
import { ErroApi, type Fim, type Luta } from './api';
import { eu, recarregarEu } from './estado';
import { h, toast } from './ui';
import { hud } from './telas/hud';
import { telaLogin } from './telas/login';
import { telaEstudo } from './telas/estudo';
import { telaLuta } from './telas/luta';
import { telaFase, telaMundo, type Navegar } from './telas/mapa';

try {
  const tema = localStorage.getItem('forja-tema');
  if (tema) document.documentElement.dataset.theme = tema;
} catch { /* sem armazenamento */ }

const raiz = document.getElementById('app')!;
let telaAtual: { destruir?: () => void } | null = null;
let hudAtual: { el: HTMLElement; destruir: () => void } | null = null;
let lutando = false;

function trocar(conteudo: HTMLElement, tela: { destruir?: () => void }, comHud = true): void {
  telaAtual?.destruir?.();
  telaAtual = tela;
  if (comHud && !hudAtual) hudAtual = hud();
  if (!comHud && hudAtual) {
    hudAtual.destruir();
    hudAtual = null;
  }
  raiz.replaceChildren(...(comHud && hudAtual ? [hudAtual.el] : []), conteudo);
}

const nav: Navegar = {
  ir: (hash) => {
    if (location.hash === hash) void rotear();
    else location.hash = hash;
  },
  lutar: (luta) => abrirLuta(luta),
};

function abrirLuta(luta: Luta): void {
  lutando = true;
  const t = telaLuta(luta, (fim: Fim | null) => {
    lutando = false;
    const venceu = fim?.resultado === 'vitoria';
    const fica = venceu || fim?.revanche || luta.tipo === 'fantasma';
    if (!fica) toast(luta.tipo === 'chefe' ? 'O chefe venceu desta vez.' : 'Você foi expulso da fase.', 'erro');
    nav.ir(fica ? `#/fase/${luta.moduloId}` : `#/mundo/A${luta.moduloId[1]}`);
  });
  trocar(t.el, t);
}

async function rotear(): Promise<void> {
  if (lutando) return;
  const partes = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (!eu()) await recarregarEu();
    const luta = eu()?.luta;
    if (luta) return abrirLuta(luta);
    let tela: { el: HTMLElement; destruir?: () => void };
    switch (partes[0]) {
      case 'fase':
        tela = await telaFase(partes[1]!, nav);
        break;
      case 'estudo':
        tela = await telaEstudo(partes[1]!, nav);
        break;
      default:
        tela = await telaMundo(partes[1] || undefined, nav);
    }
    trocar(tela.el, tela);
    void recarregarEu();
  } catch (e) {
    if (e instanceof ErroApi && e.status === 401) {
      const t = telaLogin(() => {
        void recarregarEu().then(() => rotear());
      });
      return trocar(t.el, {}, false);
    }
    console.error(e);
    trocar(h('main.login', {}, h('div.aviso.erro', {}, e instanceof ErroApi ? e.message : 'Não consegui falar com o servidor. Ele está rodando?')), {});
  }
}

window.addEventListener('hashchange', () => void rotear());
void rotear();
