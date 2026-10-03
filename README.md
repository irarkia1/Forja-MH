# Forja M&H

RPG de estudo para a jornada de 10 mil horas até engenheiro de IoT.
A documentação completa está em [docs/](docs/README.md); comece pelo
[CEREBRO.md](docs/CEREBRO.md).

## Rodar local

Requer Node ≥ 22.13 (o projeto usa `nvm use` → 22.23.3).

```bash
nvm use
npm install
npm run build        # gera o front em apps/web/dist
npm run dev:api      # API + front em http://127.0.0.1:8090
```

Na primeira vez, fora de produção, é criado o usuário **matheus / forja1234**.
Troque a senha:

```bash
npm run criar-usuario -- matheus
```

Para mexer no front com recarga automática, rode também `npm run dev:web` e
abra http://127.0.0.1:5173 (o Vite repassa `/api` para a porta 8090).
`npm run dev` sobe os dois juntos.

### Testar sem esperar horas
`FORJA_FATOR_TEMPO=600 npm run dev:api` faz cada segundo de estudo contar 600
(um pulso de 30 s = 5 h). Só funciona fora de produção, e a tela mostra o selo
`DEV ×600`. Use um banco separado para não sujar o seu progresso:
`FORJA_DB=data/teste.db`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm test` | Testes das regras e da API (Vitest) |
| `npm run tipos` | Checagem de tipos |
| `npm run validar-conteudo` | Valida `conteudo/` (schema, IDs, objetivos, horas) |
| `npm run importar-conteudo` | Importa `conteudo/` para o banco (a API também importa ao subir) |
| `npm run verificar` | Tudo acima |
| `npm start` | Produção (`NODE_ENV=production`, só questões revisadas) |

## Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` / `HOST` | 8090 / 127.0.0.1 | Onde a API escuta |
| `FORJA_DB` | `data/estudos.db` | Arquivo do banco |
| `FORJA_FATOR_TEMPO` | 1 | Acelera o tempo (só dev) |
| `FORJA_ACEITAR_RASCUNHO` | 1 em dev, 0 em produção | Questões `rascunho` entram nas provas |
| `FORJA_MIN_QUESTOES` | 12 | Questões por tópico para a fase ficar jogável |

## Estrutura

```
conteudo/         currículo e questões em YAML (versionado)
packages/regras/  regras puras: XP, vida, dado, adaptação, sorteio
apps/api/         Fastify + SQLite (node:sqlite)
apps/web/         Vite + TypeScript + Canvas 2D
ferramentas/      validar, importar, criar usuário
docs/             planejamento completo
```
