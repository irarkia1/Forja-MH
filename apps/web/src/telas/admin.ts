import { api, ErroApi } from '../api';
import { eu, recarregarEu } from '../estado';
import { h, modal, toast } from '../ui';
import type { Navegar } from './mapa';

export const ehAdmin = () => eu()?.papel === 'admin';

// Executa uma ferramenta, avisa e recarrega a tela atual.
export async function ferramenta(caminho: string, corpo: unknown, msg: string, recarregar = true): Promise<boolean> {
  try {
    await api.post(`admin/${caminho}`, corpo);
    toast(`🔧 ${msg}`, 'ok');
    await recarregarEu();
    if (recarregar) window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  } catch (e) {
    toast(e instanceof ErroApi ? e.message : 'Falha.', 'erro');
    return false;
  }
}

export function botaoAdmin(texto: string, acao: () => unknown): HTMLButtonElement {
  return h('button.btn', { style: 'border-style:dashed;border-color:var(--energia);color:var(--energia)', onclick: acao }, `🔧 ${texto}`);
}

export async function telaAdmin(nav: Navegar) {
  const campo = (rotulo: string, input: HTMLInputElement) => h('label', { style: 'display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--texto-2)' }, rotulo, input);
  const topico = h('input', { type: 'text', value: 'M0.1.T01', placeholder: 'M0.1.T01' });
  const topicoVencer = h('input', { type: 'text', value: 'M0.1.T01', placeholder: 'M0.1.T01' });
  const horas = h('input', { type: 'text', inputmode: 'decimal', value: '3' });
  const modulo = h('input', { type: 'text', value: 'M0.1', placeholder: 'M0.1' });
  const dias = h('input', { type: 'text', inputmode: 'decimal', value: '1' });
  const xp = h('input', { type: 'text', inputmode: 'numeric', value: '1000' });
  const alvo = h('input', { type: 'text', value: 'M0.1.T01', placeholder: 'tópico ou módulo' });
  const nivel = h('input', { type: 'text', inputmode: 'numeric', value: '3' });
  const n = (i: HTMLInputElement) => Number(i.value.replace(',', '.'));
  const cartao = (titulo: string, desc: string, ...filhos: (Node | null)[]) =>
    h('section.cartao', {}, h('h4', {}, titulo), h('p.mudo', { style: 'font-size:13px;margin:0 0 10px' }, desc), h('div', { style: 'display:grid;gap:10px' }, ...filhos));

  const el = h('section.tela', {},
    h('div.tela-topo', {}, h('button.btn.fantasma', { onclick: () => nav.ir('#/mundo') }, '← Mapa'), h('h1', {}, '🔧 MODO ADMIN — ferramentas de teste')),
    h('div', { style: 'overflow-y:auto;padding:18px;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));align-content:start' },
      h('div.aviso', { style: 'grid-column:1/-1' }, 'Tudo aqui mexe só nesta conta. Use a conta teste para experimentar; seu progresso real fica na conta matheus.'),
      cartao('HORAS DE ESTUDO', 'Soma horas válidas num tópico (pula o cronômetro). Com 2.000 h você testa o Marco.',
        campo('Tópico', topico), campo('Horas', horas),
        h('button.btn.principal', { onclick: () => ferramenta('estudo', { topico_id: topico.value.trim(), horas: n(horas) }, `+${horas.value} h em ${topico.value}`, false) }, 'Adicionar horas')),
      cartao('VENCER', 'Marca inimigo ou fase inteira como vencidos (agenda os fantasmas).',
        campo('Tópico', topicoVencer),
        h('button.btn', { onclick: () => ferramenta('vencer-topico', { topico_id: topicoVencer.value.trim() }, `${topicoVencer.value} vencido`, false) }, 'Vencer tópico'),
        campo('Módulo', modulo),
        h('button.btn', { onclick: () => ferramenta('vencer-modulo', { modulo_id: modulo.value.trim(), chefe: false }, `inimigos de ${modulo.value} vencidos (chefe liberado)`, false) }, 'Vencer inimigos (chefe liberado)'),
        h('button.btn', { onclick: () => ferramenta('vencer-modulo', { modulo_id: modulo.value.trim(), chefe: true }, `${modulo.value} vencido com chefe`, false) }, 'Vencer fase inteira')),
      cartao('VIAGEM NO TEMPO', 'Adianta N dias: fantasmas vencem, descanso do chefe acaba, revanches liberam.',
        campo('Dias', dias),
        h('button.btn.principal', { onclick: () => ferramenta('adiantar', { dias: n(dias) }, `+${dias.value} dia(s)`, false) }, 'Adiantar'),
        h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, ...[1, 3, 7, 21, 60].map((d) => h('button.btn', { onclick: () => ferramenta('adiantar', { dias: d }, `+${d} dia(s)`, false) }, `+${d}d`)))),
      cartao('XP E ADAPTAÇÃO', 'Dá XP (ver o nível subir) ou define as estrelas ★ de um inimigo/chefe.',
        campo('XP', xp),
        h('button.btn', { onclick: () => ferramenta('xp', { xp: Math.round(n(xp)) }, `+${xp.value} XP`, false) }, 'Dar XP'),
        campo('Alvo (tópico ou módulo)', alvo), campo('Nível 0–5', nivel),
        h('button.btn', { onclick: () => ferramenta('adaptacao', { alvo_id: alvo.value.trim(), nivel: Math.round(n(nivel)) }, `${alvo.value} com adaptação ${nivel.value}`, false) }, 'Definir adaptação')),
      cartao('ZERAR', 'Apaga todo o progresso desta conta (horas, vitórias, fantasmas, XP).',
        h('button.btn.perigo', {
          onclick: async () => {
            const r = await modal('ZERAR PROGRESSO?', 'Apaga tudo desta conta. Não tem volta.', [{ texto: 'Cancelar', valor: 'nao' }, { texto: 'Zerar', classe: 'perigo', valor: 'sim' }]);
            if (r === 'sim') await ferramenta('zerar', {}, 'progresso zerado', false);
          },
        }, 'Zerar progresso')),
    ),
  );
  return { el };
}
