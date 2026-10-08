import { api, ErroApi } from '../api';
import { h } from '../ui';

export function telaLogin(aoEntrar: () => void): { el: HTMLElement } {
  const erro = h('div.aviso.erro.oculto', { role: 'alert' });
  const login = h('input', { type: 'text', name: 'login', autocomplete: 'username', required: true, autofocus: true });
  const senha = h('input', { type: 'password', name: 'senha', autocomplete: 'current-password', required: true });
  const olho = h('button.olho', {
    type: 'button', title: 'Mostrar senha', 'aria-label': 'Mostrar senha', 'aria-pressed': 'false',
    onclick: () => {
      const mostrar = senha.type === 'password';
      senha.type = mostrar ? 'text' : 'password';
      olho.textContent = mostrar ? '🙈' : '👁';
      olho.title = mostrar ? 'Esconder senha' : 'Mostrar senha';
      olho.setAttribute('aria-label', olho.title);
      olho.setAttribute('aria-pressed', String(mostrar));
      senha.focus();
    },
  }, '👁');
  const botao = h('button.btn.principal', { type: 'submit' }, 'Acender a forja');
  const form = h('form', {
    onsubmit: async (e: Event) => {
      e.preventDefault();
      botao.disabled = true;
      erro.classList.add('oculto');
      try {
        await api.post('login', { login: login.value, senha: senha.value });
        aoEntrar();
      } catch (x) {
        erro.textContent = x instanceof ErroApi ? x.message : 'Sem conexão com o servidor.';
        erro.classList.remove('oculto');
      } finally {
        botao.disabled = false;
      }
    },
  },
    h('h1', {}, 'FORJA M&H'),
    h('p', {}, '10 mil horas até engenheiro de IoT. Uma luta de cada vez.'),
    h('label', {}, 'Login', login),
    h('label', {}, 'Senha', h('span.campo-senha', {}, senha, olho)),
    erro,
    botao,
  );
  return { el: h('main.login', {}, form) };
}
