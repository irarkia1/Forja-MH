# Segurança

Sistema de um usuário, mas exposto na internet. O que importa: **ninguém
entra**, **o progresso não se perde** e **o próprio usuário não consegue
trapacear sem querer**.

## Autenticação
- Senha com **scrypt** do próprio Node (`node:crypto`, N = 2¹⁵, r = 8), sem dependência nativa (D016).
- Cookie de sessão `HttpOnly; Secure; SameSite=Strict`, token aleatório de 32
  bytes; o banco guarda só o hash.
- Freio de login: 5 erros → espera crescente por IP e por login.
- Primeiro usuário criado por comando (`npm run criar-usuario`), sem tela de
  cadastro pública.

## Integridade do estudo (anti-trapaça)
| Ameaça | Defesa |
|---|---|
| Ver gabarito no DevTools | Gabarito nunca sai do servidor antes da resposta (D004) |
| Mexer no relógio do PC | Tempo calculado pelos pulsos recebidos, no relógio do servidor |
| Deixar a aba aberta e sair | Aba oculta não conta; check-in "ainda estudando?" a cada 25 min, 2 min para responder |
| Duas abas somando tempo | Uma sessão aberta por usuário; abrir outra fecha a anterior |
| Rerolar o chefe | Variante sorteada fica gravada até vencer (D008) |
| Repetir quiz até acertar por eliminação | Recuperação de 20% do tempo + questões novas do pool |

## Servidor
- Fastify atrás do Caddy; a API escuta só em `127.0.0.1`.
- Cabeçalhos: CSP restrita (`default-src 'self'`), `X-Content-Type-Options`,
  `Referrer-Policy`.
- Uploads: tipo verificado pelo conteúdo, nome gerado pelo servidor, fora da
  pasta pública, servidos por rota autenticada.
- Chave da Claude API só no servidor, em variável de ambiente; nunca no
  navegador nem no git.
- Banco e uploads com permissão `600`/`700` para o usuário do serviço.
