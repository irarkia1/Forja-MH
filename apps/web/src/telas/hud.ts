import { api, type Personagem } from '../api';
import { aoMudarEu, eu, fatorTempo } from '../estado';
import { barra, h, num, preencher } from '../ui';

const ROMANO = ['I', 'II', 'III', 'IV', 'V'];

export function hud(): { el: HTMLElement; destruir: () => void } {
  const el = h('header.hud');
  let fantasmas = 0;
  const pintar = (p: Personagem) => {
    preencher(el, 
      h('a.logo', { href: '#/mundo', title: 'Mapa' }, 'FORJA M&H'),
      h('div.grupo', { title: `XP total: ${p.xpTotal.toLocaleString('pt-BR')}` },
        h('span.pixel', { style: 'font-size:11px' }, `Nv ${p.nivel}`),
        h('span.mudo', { title: p.titulo.proximo ? `Próximo título: ${p.titulo.proximo.nome} com ${p.titulo.proximo.horas.toLocaleString('pt-BR')} h` : 'Título máximo' }, p.titulo.nome),
        barra('xp', p.xpFaixa / p.xpProximo, 'Experiência'),
        h('span.mudo', {}, `${p.xpFaixa.toLocaleString('pt-BR')}/${p.xpProximo.toLocaleString('pt-BR')}`),
      ),
      h('div.grupo', { title: 'Vida máxima' }, '❤', h('b', {}, String(p.vida))),
      h('div.grupo', { title: 'Energia: gasta nas skills ativas; recarrega com fantasmas, notas e laboratório', style: 'color:var(--energia)' }, '⚡', h('b', {}, `${num(p.energia)}/${p.energiaMax}`)),
      fantasmas ? h('a.grupo', { href: '#/mundo', title: 'Fantasmas (revisões) para hoje', style: 'color:var(--energia);text-decoration:none' }, '👻', h('b', {}, String(fantasmas)), h('span.mudo', {}, 'revisões hoje')) : null,
      h('div.grupo', { title: 'Horas válidas nesta semana (segunda a domingo)' },
        '⏱', h('b', {}, `${num(p.horasSemana)}h`), h('span.mudo', {}, `/ ${p.metaSemana}h na semana`),
      ),
      h('div.grupo', { title: 'Faixa de XP e próximo Marco de horas' },
        h('span.selo', {}, `Faixa ${ROMANO[p.faixa - 1] ?? p.faixa}`),
        h('span.mudo', {}, p.proximoMarco ? `${num(p.horasTotais)} / ${p.proximoMarco.toLocaleString('pt-BR')} h` : `${num(p.horasTotais)} h`),
      ),
      h('div.espaco'),
      h('a.btn', { href: '#/painel', style: 'text-decoration:none' }, '📊 Painel'),
      h('a.btn', { href: '#/skills', style: 'text-decoration:none' + (p.pontosLivres > 0 ? ';border-color:var(--destaque);color:var(--destaque)' : '') }, '✨ Skills', p.pontosLivres > 0 ? h('span.selo', { style: 'color:var(--destaque);border-color:var(--destaque)' }, String(p.pontosLivres)) : null),
      eu()?.papel === 'admin' ? h('a.btn', { href: '#/admin', style: 'border-style:dashed;border-color:var(--energia);color:var(--energia);text-decoration:none' }, '🔧 Admin') : null,
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
  if (e) {
    fantasmas = e.fantasmasHoje;
    pintar(e.personagem);
  }
  const parar = aoMudarEu((x) => {
    fantasmas = x.fantasmasHoje;
    pintar(x.personagem);
  });
  return { el, destruir: parar };
}
