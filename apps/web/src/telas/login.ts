import { api, ErroApi } from '../api';
import { h } from '../ui';

export function telaLogin(aoEntrar: () => void): { el: HTMLElement } {
  const erro = h('div.aviso.erro.oculto', { role: 'alert' });
  const login = h('input', { type: 'text', name: 'login', autocomplete: 'username', required: true, autofocus: true });
  const senha = h('input', { type: 'password', name: 'senha', autocomplete: 'current-password', required: true });
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
    h('label', {}, 'Senha', senha),
    erro,
    botao,
  );
  return { el: h('main.login', {}, form) };
}
