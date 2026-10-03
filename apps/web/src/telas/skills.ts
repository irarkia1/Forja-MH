import { api, ErroApi, type ArvoreSkills, type SkillTela } from '../api';
import { recarregarEu } from '../estado';
import { h, preencher, toast } from '../ui';
import type { Navegar } from './mapa';

const RAMOS: { id: SkillTela['ramo']; nome: string; desc: string; cor: string }[] = [
  { id: 'guerreiro', nome: '⚔ GUERREIRO', desc: 'Atributos de combate. Custo fixo por nível.', cor: '#ff8a3d' },
  { id: 'estudioso', nome: '📖 ESTUDIOSO', desc: 'Recompensam bons hábitos de estudo. Nível k custa k pontos.', cor: '#3ecf8e' },
  { id: 'estrategista', nome: '🧠 ESTRATEGISTA', desc: 'Ativas na luta: ajudam sem dar a resposta. Gastam energia.', cor: '#5cc8ff' },
  { id: 'explorador', nome: '🧭 EXPLORADOR', desc: 'Conhecimento do terreno. Chega com as variantes de chefe.', cor: '#a970ff' },
];

export async function telaSkills(nav: Navegar) {
  const corpo = h('div', { style: 'overflow-y:auto;padding:18px;display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));align-content:start' });
  const resumo = h('div.aviso', { style: 'grid-column:1/-1' });

  const pintar = (a: ArvoreSkills) => {
    preencher(resumo,
      h('b', {}, `${a.pontos.livres} ponto(s) livre(s)`), ` de ${a.pontos.total} (2 por nível) · ⚡ energia ${a.energia.atual}/${a.energia.max}. `,
      'Regras: nenhuma skill reduz o tempo de estudo, nenhuma mostra a resposta, e fantasmas não aceitam skills.',
    );
    preencher(corpo, resumo, ...RAMOS.map((r) =>
      h('section.cartao', { style: `border-top:4px solid ${r.cor}` },
        h('h4', { style: `color:${r.cor}` }, r.nome),
        h('p.mudo', { style: 'font-size:13px;margin:0 0 10px' }, r.desc),
        h('div', { style: 'display:grid;gap:10px' }, a.skills.filter((s) => s.ramo === r.id).map((s) => cartaoSkill(s, a))),
      )));
  };

  const cartaoSkill = (s: SkillTela, a: ArvoreSkills) => {
    const efeito = s.efeito.replace('{n}', String(Math.max(1, s.nivel)));
    const requisito = (s.requer ?? []).map((r) => `${a.skills.find((x) => x.id === r.skill)?.nome} nv. ${r.nivel}`).join(', ');
    return h('div', { style: `padding:10px;border-radius:6px;background:var(--fundo-2);border:1px solid var(--borda);${s.pronta ? '' : 'opacity:.55'}` },
      h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:baseline' },
        h('b', {}, s.nome),
        h('span.pixel', { style: 'font-size:10px;color:var(--destaque)' }, s.pronta ? `${s.nivel}/${s.nivelMax}` : 'EM BREVE'),
      ),
      h('div', { style: 'font-size:13px;margin:4px 0' }, efeito, s.energia ? h('span', { style: 'color:var(--energia)' }, ` · ${s.energia}⚡ por uso`) : null),
      requisito ? h('div.mudo', { style: 'font-size:12px' }, `Exige: ${requisito}`) : null,
      s.pronta && s.nivel < s.nivelMax
        ? h('button.btn', {
            class: s.podeEvoluir ? 'principal' : '',
            disabled: !s.podeEvoluir,
            style: 'margin-top:8px;width:100%',
            title: s.motivo ?? '',
            onclick: async () => {
              try {
                pintar(await api.post<ArvoreSkills>(`skills/${s.id}/evoluir`));
                toast(`✨ ${s.nome} nv. ${s.nivel + 1}`, 'ok');
                void recarregarEu();
              } catch (e) {
                toast(e instanceof ErroApi ? e.message : 'Falha.', 'erro');
              }
            },
          }, s.podeEvoluir ? `Evoluir (${s.custoProximo} pt)` : (s.motivo ?? ''))
        : null,
    );
  };

  pintar(await api.get<ArvoreSkills>('skills'));
  const el = h('section.tela', {},
    h('div.tela-topo', {}, h('button.btn.fantasma', { onclick: () => nav.ir('#/mundo') }, '← Mapa'), h('h1', {}, '✨ ÁRVORE DE SKILLS')),
    corpo,
  );
  return { el };
}
