import { api, type Personagem } from '../api';
import { aoMudarEu, eu, fatorTempo } from '../estado';
import { barra, h, num, preencher } from '../ui';

const ROMANO = ['I', 'II', 'III', 'IV', 'V'];

export function hud(): { el: HTMLElement; destruir: () => void } {
  const el = h('header.hud');
  const pintar = (p: Personagem) => {
    preencher(el, 
      h('a.logo', { href: '#/mundo', title: 'Mapa' }, 'FORJA M&H'),
      h('div.grupo', { title: `XP total: ${p.xpTotal.toLocaleString('pt-BR')}` },
        h('span.pixel', { style: 'font-size:11px' }, `Nv ${p.nivel}`),
        barra('xp', p.xpFaixa / p.xpProximo, 'Experiência'),
        h('span.mudo', {}, `${p.xpFaixa.toLocaleString('pt-BR')}/${p.xpProximo.toLocaleString('pt-BR')}`),
      ),
      h('div.grupo', { title: 'Vida máxima (6 + nível − 1)' }, '❤', h('b', {}, String(p.vida))),
      h('div.grupo', { title: 'Horas válidas nos últimos 7 dias' },
        '⏱', h('b', {}, `${num(p.horasSemana)}h`), h('span.mudo', {}, `/ ${p.metaSemana}h na semana`),
      ),
      h('div.grupo', { title: 'Faixa de XP e próximo Marco de horas' },
        h('span.selo', {}, `Faixa ${ROMANO[p.faixa - 1] ?? p.faixa}`),
        h('span.mudo', {}, p.proximoMarco ? `${num(p.horasTotais)} / ${p.proximoMarco.toLocaleString('pt-BR')} h` : `${num(p.horasTotais)} h`),
      ),
      h('div.espaco'),
      fatorTempo > 1 ? h('span.selo.dev', { title: 'Modo de desenvolvimento: cada segundo conta mais' }, `DEV ×${fatorTempo}`) : null,
      h('button.btn.fantasma', {
        title: 'Tema claro/escuro',
        onclick: () => {
          const r = document.documentElement;
          r.dataset.theme = r.dataset.theme === 'light' ? 'dark' : 'light';
          try { localStorage.setItem('forja-tema', r.dataset.theme); } catch { /* sem armazenamento */ }
        },
      }, 'Tema'),
      h('button.btn.fantasma', { onclick: async () => { await api.post('logout'); location.hash = ''; location.reload(); } }, 'Sair'),
    );
  };
  const e = eu();
  if (e) pintar(e.personagem);
  const parar = aoMudarEu((x) => pintar(x.personagem));
  return { el, destruir: parar };
}
