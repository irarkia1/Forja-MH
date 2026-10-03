import { api, ErroApi, type Fim, type Luta, type QuestaoTela, type Retorno } from '../api';
import { recarregarEu } from '../estado';
import { CORES_TRILHA, HEROI, desenhar, guardiao, slime, slimeElite, tamanho } from '../jogo/sprites';
import { barra, estrelas, h, markdown, modal, num, pct, preencher, toast } from '../ui';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

function retrato(sprite: Parameters<typeof desenhar>[1], escala: number, espelhar = false): HTMLCanvasElement {
  const t = tamanho(sprite, escala);
  const c = h('canvas', { width: t.w, height: t.h });
  const g = c.getContext('2d')!;
  if (espelhar) {
    g.translate(t.w, 0);
    g.scale(-1, 1);
  }
  desenhar(g, sprite, 0, 0, escala);
  return c;
}

// Luta: combate (3 questões) ou chefe (N). Erro = golpe com dado do servidor.
export function telaLuta(l: Luta, aoTerminarBruto: (fim: Fim | null, luta: Luta) => void) {
  const [cor, escura] = CORES_TRILHA[l.trilha] ?? CORES_TRILHA.base!;
  let terminou = false;
  const aoTerminar = (fim: Fim | null, luta: Luta) => {
    if (terminou) return;
    terminou = true;
    aoTerminarBruto(fim, luta);
  };
  const chefe = l.tipo === 'chefe';
  let vida = l.vida;
  let questao: QuestaoTela | null = l.questao;
  let acertos = l.acertos ?? 0;
  let ocupado = false;

  const vidaBarra = h('div');
  const pintarVida = () => vidaBarra.replaceChildren(barra('vida', vida / l.vidaMax, 'Sua vida'), h('div', { style: 'font:600 13px var(--fonte-mono)' }, `❤ ${num(vida)} / ${num(l.vidaMax)}`));
  pintarVida();
  const progressoInimigo = h('div');
  const pintarInimigo = (respondidas: number) =>
    progressoInimigo.replaceChildren(barra('', 1 - respondidas / l.total, 'Questões restantes'), h('div', { style: 'font:600 13px var(--fonte-mono)' }, `${l.total - respondidas} questões · ✔ ${acertos}`));
  pintarInimigo(questao.ordem);

  const heroi = h('div.lutador', {}, retrato(HEROI[0]!, 5), h('div.nome', {}, 'VOCÊ'), vidaBarra, h('div.mudo', { style: 'font-size:12px' }, `🛡 defesa ${pct(l.defesa)}${l.perfuracao ? ` (perfurada ${pct(l.perfuracao)})` : ''}`));
  const spriteInimigo = chefe ? guardiao(cor, escura) : l.elite ? slimeElite(cor, escura) : slime(cor, escura);
  const inimigo = h('div.lutador.inimigo', {},
    retrato(spriteInimigo, chefe ? 6 : 7, true),
    h('div.nome', {}, l.alvoNome),
    l.adaptacao ? h('span.estrelas', { title: 'Adaptação' }, estrelas(l.adaptacao)) : null,
    progressoInimigo,
    h('div.mudo', { style: 'font-size:12px' }, `poder ${num(l.poder, 2)}${l.revanche ? ' · revanche' : ''}`),
  );
  const dado = h('div.dado', { 'aria-live': 'polite', title: 'Dado do inimigo (0 a 6)' }, '?');
  const quadro = h('div.quadro');
  const el = h('section.tela', {},
    h('div.tela-topo', {},
      h('h1', {}, `${chefe ? '💀 CHEFE' : '⚔ COMBATE'} — ${l.alvoNome}`),
      h('button.btn.perigo', {
        onclick: async () => {
          const r = await modal('FUGIR?', 'Fugir no meio da luta conta como derrota.', [
            { texto: 'Continuar lutando', valor: 'nao' },
            { texto: 'Fugir', classe: 'perigo', valor: 'sim' },
          ]);
          if (r !== 'sim') return;
          try {
            const fim = await api.post<Fim>(`tentativas/${l.tentativaId}/desistir`);
            await recarregarEu();
            mostrarFim(fim);
          } catch (e) {
            toast(e instanceof ErroApi ? e.message : 'Falha.', 'erro');
          }
        },
      }, 'Fugir'),
    ),
    h('div.luta', {}, h('div.arena', {}, heroi, dado, inimigo), quadro),
  );

  // ---- Apresentação do chefe (antes da 1ª questão)
  function intro(): void {
    preencher(quadro, 
      h('div.questao.resultado', {},
        h('h2', {}, l.variante?.nome ?? 'CHEFE'),
        h('p', {}, l.variante?.regra ?? ''),
        l.adaptacao ? h('div.aviso.erro', { style: 'text-align:left' }, h('span.estrelas', {}, estrelas(l.adaptacao)), ` Ele aprendeu com você: poder +${l.adaptacao * 10}%, perfuração ${pct(l.perfuracao)} e mais questões nos seus pontos fracos.`) : null,
        h('div.numeros', {},
          h('div', {}, 'Questões', h('b', {}, String(l.total))),
          h('div', {}, 'Vida de batalha', h('b', {}, num(l.vidaMax))),
          h('div', {}, 'Piso', h('b', {}, pct(l.piso))),
          h('div', {}, 'Poder', h('b', {}, num(l.poder, 2))),
        ),
        h('p.mudo', { style: 'font-size:14px' }, 'A prova salva a cada resposta: pode fechar o navegador e voltar depois.'),
        h('button.btn.principal', { onclick: () => { teclas = null; pintarQuestao(); } }, 'Enfrentar ', h('span.tecla', {}, 'Enter')),
      ),
    );
  }

  // ---- Questão
  let escolha: number | number[] | boolean | string | null = null;
  function pintarQuestao(): void {
    if (!questao) return;
    const q = questao;
    escolha = q.tipo === 'multipla' ? [] : null;
    const confirmar = h('button.btn.principal', { disabled: true, onclick: () => void responder() }, 'Confirmar ', h('span.tecla', {}, 'Enter'));
    const habilitar = () => (confirmar.disabled = escolha === null || (Array.isArray(escolha) && escolha.length === 0) || escolha === '');
    let corpo: HTMLElement;
    if (q.tipo === 'unica' || q.tipo === 'multipla') {
      const botoes = (q.alternativas ?? []).map((alt, i) =>
        h('button.opcao', {
          'aria-pressed': 'false',
          'data-i': i,
          onclick: () => {
            if (q.tipo === 'unica') {
              escolha = i;
              botoes.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
            } else {
              const s = new Set(escolha as number[]);
              if (s.has(i)) s.delete(i);
              else s.add(i);
              escolha = [...s];
              botoes[i]!.setAttribute('aria-pressed', String(s.has(i)));
            }
            habilitar();
          },
        }, h('span.letra', {}, LETRAS[i] ?? String(i + 1)), h('span', { html: markdown(alt).replace(/^<p>|<\/p>\s*$/g, '') })),
      );
      corpo = h('div.opcoes', {}, q.tipo === 'multipla' ? h('div.mudo', { style: 'font-size:13px' }, 'Marque todas as corretas.') : null, botoes);
    } else if (q.tipo === 'vf') {
      const botoes = [true, false].map((v) =>
        h('button.opcao', {
          'aria-pressed': 'false',
          onclick: () => {
            escolha = v;
            botoes.forEach((b, j) => b.setAttribute('aria-pressed', String((j === 0) === v)));
            habilitar();
          },
        }, h('span.letra', {}, v ? 'V' : 'F'), v ? 'Verdadeiro' : 'Falso'),
      );
      corpo = h('div.opcoes', {}, botoes);
    } else {
      const input = h('input', { inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Resposta numérica', placeholder: '0' });
      input.addEventListener('input', () => {
        escolha = input.value.trim();
        habilitar();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !confirmar.disabled) void responder();
      });
      corpo = h('div.numerica', {}, input, h('b', {}, q.unidade ?? ''));
      queueMicrotask(() => input.focus());
    }
    preencher(quadro, 
      h('div.questao', {},
        h('div.cabeca', {},
          h('span', {}, `Questão ${q.ordem + 1} de ${q.total}`),
          h('span', {}, `dificuldade ${'◆'.repeat(q.dificuldade)}${'◇'.repeat(5 - q.dificuldade)}`),
          q.rascunho ? h('span.selo.rascunho', { title: 'Questão escrita por IA, ainda sem revisão humana' }, 'RASCUNHO') : null,
        ),
        h('div.enunciado', { html: markdown(q.enunciado) }),
        corpo,
        h('div.rodape-luta', {}, h('span.mudo', { style: 'font-size:13px' }, q.tipo === 'vf' ? 'Teclas: V / F' : q.tipo === 'numerica' ? 'Use vírgula ou ponto' : 'Teclas: 1–4 ou A–D'), confirmar),
      ),
    );
    teclas = (e: KeyboardEvent) => {
      if (document.querySelector('.veu') || e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (q.tipo === 'vf' && (k === 'v' || k === 'f')) (quadro.querySelectorAll('.opcao')[k === 'v' ? 0 : 1] as HTMLButtonElement).click();
      const idx = /^[1-6]$/.test(k) ? Number(k) - 1 : LETRAS.map((x) => x.toLowerCase()).indexOf(k);
      if ((q.tipo === 'unica' || q.tipo === 'multipla') && idx >= 0) (quadro.querySelectorAll('.opcao')[idx] as HTMLButtonElement | undefined)?.click();
      if (k === 'enter' && !confirmar.disabled) {
        e.preventDefault();
        void responder();
      }
    };
  }

  async function responder(): Promise<void> {
    if (ocupado || !questao || escolha === null) return;
    ocupado = true;
    const q = questao;
    let r: Retorno;
    try {
      r = await api.post<Retorno>(`tentativas/${l.tentativaId}/respostas`, { ordem: q.ordem, resposta: escolha });
    } catch (e) {
      ocupado = false;
      if (e instanceof ErroApi && e.codigo === 'ordem_errada') {
        toast('Essa questão já tinha sido respondida; recarregando a luta.', 'erro');
        return location.reload();
      }
      return toast(e instanceof ErroApi ? e.message : 'Falha ao enviar. Tente de novo.', 'erro');
    }
    acertos = r.acertos;
    teclas = null;
    // Marca certa/errada nas alternativas
    const opcoes = [...quadro.querySelectorAll<HTMLButtonElement>('.opcao')];
    opcoes.forEach((b) => (b.disabled = true));
    if (q.tipo === 'unica') {
      opcoes[r.gabarito as number]?.classList.add('certa');
      if (!r.correta) opcoes[escolha as number]?.classList.add('errada');
    } else if (q.tipo === 'multipla') {
      const certos = r.gabarito as number[];
      opcoes.forEach((b, i) => {
        if (certos.includes(i)) b.classList.add('certa');
        else if ((escolha as number[]).includes(i)) b.classList.add('errada');
      });
    } else if (q.tipo === 'vf') {
      opcoes[r.gabarito ? 0 : 1]?.classList.add('certa');
      if (!r.correta) opcoes[r.gabarito ? 1 : 0]?.classList.add('errada');
    }
    pintarInimigo(q.ordem + 1);

    const retorno = h('div.retorno', { class: r.correta ? '' : 'errou' },
      h('div.titulo', {}, r.correta ? '✔ ACERTOU — golpe no inimigo!' : '✘ ERROU — o inimigo contra-ataca'),
      q.tipo === 'numerica' && !r.correta ? h('div.conta', {}, `Resposta: ${num((r.gabarito as { valor: number }).valor, 4)} ${(r.gabarito as { unidade: string }).unidade}`) : null,
    );
    quadro.querySelector('.questao')!.append(retorno);
    if (r.golpe) await animarGolpe(r.golpe, retorno);
    else inimigo.classList.add('levou'), setTimeout(() => inimigo.classList.remove('levou'), 400);
    vida = r.vida;
    pintarVida();
    retorno.append(h('div', { html: markdown(r.explicacao), style: 'margin-top:8px' }), h('div.fonte', {}, `Fonte: ${r.fonte}`));
    const seguir = h('button.btn.principal', {
      autofocus: true,
      onclick: () => {
        if (r.fim) return mostrarFim(r.fim);
        questao = r.proxima;
        ocupado = false;
        pintarQuestao();
      },
    }, r.fim ? 'Ver resultado ' : 'Próxima ', h('span.tecla', {}, 'Enter'));
    retorno.append(h('div.rodape-luta', {}, h('span'), seguir));
    seguir.focus();
    if (r.fim) void recarregarEu();
  }

  async function animarGolpe(g: NonNullable<Retorno['golpe']>, onde: HTMLElement): Promise<void> {
    dado.classList.add('rolando');
    const fim = performance.now() + 750;
    await new Promise<void>((ok) => {
      const girar = () => {
        dado.textContent = String(Math.floor(Math.random() * 7));
        if (performance.now() < fim) setTimeout(girar, 70);
        else ok();
      };
      girar();
    });
    dado.classList.remove('rolando');
    dado.textContent = String(g.dado);
    heroi.classList.add('levou');
    setTimeout(() => heroi.classList.remove('levou'), 400);
    const defEf = l.defesa * (1 - l.perfuracao);
    onde.append(h('div.conta', {}, `🎲 ${g.dado} × poder ${num(l.poder, 2)}${defEf ? ` × (1 − ${pct(defEf)})` : ''} = ${num(g.dano)} de dano · ❤ ${num(g.vidaAntes)} → ${num(g.vida)}`));
  }

  function mostrarFim(fim: Fim): void {
    teclas = null;
    const vitoria = fim.resultado === 'vitoria';
    const motivo =
      fim.motivo === 'vida' ? 'Sua vida chegou a zero.' :
      fim.motivo === 'piso' ? (chefe ? 'Você chegou vivo, mas abaixo do piso de 60% de acerto.' : 'Nenhum acerto: o piso de conhecimento não deixa passar.') :
      fim.motivo === 'fuga' ? 'Você fugiu da luta.' : '';
    const linhas: (HTMLElement | null)[] = [];
    if (!vitoria && !fim.revanche) {
      linhas.push(h('p', {}, chefe ? 'O chefe se recupera por 48 h. Revise os temas em que errou.' : 'Você foi expulso da fase. Para lutar de novo contra este inimigo, estude mais 20% do tempo mínimo. Os inimigos que você já venceu continuam vencidos.'));
      linhas.push(h('div.aviso.erro', { style: 'text-align:left' }, h('span.estrelas', {}, estrelas(fim.adaptacaoNova)), ` Ele aprendeu com você: agora tem adaptação ${fim.adaptacaoNova} e vai mirar seus pontos fracos.`));
    }
    if (fim.ganho.marcos) linhas.push(h('div.aviso.ok', {}, `🏁 MARCO! Nova faixa de XP: você volta a subir rápido.`));
    if (fim.ganho.niveisGanhos > 0) linhas.push(h('div.aviso.ok', {}, `⬆ Subiu para o nível ${fim.ganho.nivel}! +${fim.ganho.niveisGanhos} de vida.`));
    preencher(quadro, 
      h('div.questao.resultado', { class: vitoria ? 'vitoria' : 'derrota' },
        h('h2', {}, vitoria ? (fim.critico ? 'GOLPE CRÍTICO!' : 'VITÓRIA!') : 'DERROTA'),
        motivo ? h('p', {}, motivo) : null,
        h('div.numeros', {},
          h('div', {}, 'Acertos', h('b', {}, `${fim.acertos}/${fim.total}`)),
          h('div', {}, 'XP', h('b', {}, `+${fim.ganho.xp}`)),
          fim.revanche ? h('div', {}, 'Revanche', h('b', {}, chefe ? '50%' : '25%')) : null,
        ),
        linhas,
        h('button.btn.principal', { autofocus: true, onclick: () => aoTerminar(fim, l) }, vitoria ? 'Voltar à fase ' : 'Voltar ao mapa ', h('span.tecla', {}, 'Enter')),
      ),
    );
    teclas = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        aoTerminar(fim, l);
      }
    };
  }

  let teclas: ((e: KeyboardEvent) => void) | null = null;
  const ouvir = (e: KeyboardEvent) => teclas?.(e);
  window.addEventListener('keydown', ouvir);

  if (chefe && questao.ordem === 0) {
    intro();
    teclas = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        teclas = null;
        pintarQuestao();
      }
    };
  } else pintarQuestao();

  return { el, destruir: () => window.removeEventListener('keydown', ouvir) };
}
