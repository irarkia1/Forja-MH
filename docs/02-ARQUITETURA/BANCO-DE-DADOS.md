# Banco de dados

SQLite, modo WAL, `foreign_keys = ON`. Datas em ISO-8601 UTC (`TEXT`);
durações em **segundos** (`INTEGER`). Não é preciso acesso a nenhum banco
existente — o arquivo é criado na primeira execução.

## Dois mundos
- **Conteúdo** (espelho do YAML, reimportável): `ato`, `modulo`, `topico`,
  `prerequisito`, `questao`, `variante_chefe`, `skill`.
- **Progresso** (só existe aqui; é o que o backup protege): todo o resto.

## Conteúdo

```sql
ato(id TEXT PK,              -- 'A0'
    nome, ordem INT, horas INT)

modulo(id TEXT PK,           -- 'M1.4'
    ato_id → ato, nome, ordem INT, horas INT,
    trilha TEXT,              -- base|firmware|hardware|fabricacao|silicio|sensores|produto|integrador
    tags_chefe TEXT,          -- JSON: ['calculo','codigo','pratico']
    questoes_chefe INT,       -- 10..100
    situacao TEXT)            -- ativo|aposentado

topico(id TEXT PK,           -- 'M1.4.T03'
    modulo_id → modulo, nome, ordem INT,
    horas INT,                -- horas estimadas totais
    minimo_seg INT,           -- tempo mínimo do inimigo (60% das horas)
    tipo TEXT,                -- comum|elite
    roteiro_md TEXT, situacao TEXT)

prerequisito(de_id TEXT, para_id TEXT, PRIMARY KEY(de_id, para_id))
    -- módulo→módulo ou tópico→tópico

questao(id TEXT PK,          -- 'Q-M1.4.T03-017'
    topico_id → topico,
    objetivo_id TEXT,         -- objetivo de aprendizagem do roteiro (obrigatório)
    tipo TEXT,                -- unica|multipla|numerica|vf_justificada|ordenar|associar|achar_erro|dissertativa
    enunciado_md TEXT, dados JSON,   -- alternativas, imagem, unidade
    gabarito JSON,            -- NUNCA sai para o navegador antes de responder
    explicacao_md TEXT, fonte TEXT,
    dificuldade INT,          -- 1..5
    bloom TEXT,               -- lembrar|entender|aplicar|analisar|avaliar|criar
    origem TEXT,              -- humano|ia
    revisao TEXT,             -- rascunho|revisada|contestada|aposentada
    versao INT)

variante_chefe(id TEXT PK, nome, parametros JSON, tags_exigidas JSON, peso INT)
skill(id TEXT PK, nome, descricao, nivel_max INT, custo_energia INT, efeitos JSON)
```

## Progresso

```sql
usuario(id INTEGER PK, login UNIQUE, senha_hash, criado_em, fuso TEXT)
sessao_login(token_hash PK, usuario_id, expira_em)

personagem(usuario_id PK, xp INT, nivel INT, pontos_skill INT,
           energia INT, energia_max INT, titulo TEXT,
           posicao JSON,            -- onde o boneco está no mapa
           faixa INT, xp_faixa INT) -- curva por faixas (D014): barra zera no Marco
    -- vida e defesa NÃO são colunas: são derivadas de nível + skills
    -- (packages/regras), para nunca ficarem dessincronizadas

-- Cronômetro
sessao_estudo(id PK, usuario_id, topico_id, modo TEXT,  -- online|offline
              inicio, fim, segundos_validos INT, encerrada INT)
pulso(sessao_id, em TEXT, visivel INT)    -- apagado após consolidar a sessão

-- Estado de cada tópico/módulo
progresso_topico(usuario_id, topico_id, PK(usuario_id, topico_id),
    estado TEXT,      -- bloqueado|disponivel|em_estudo|derrotado|consolidado|dominado
    segundos_estudo INT, segundos_recuperacao_pendente INT,
    derrotado_em, vitorias INT, derrotas INT, ultima_ajuda_em)

progresso_modulo(usuario_id, modulo_id, PK(...),
    estado TEXT,      -- bloqueado|disponivel|em_andamento|chefe_liberado|vencido
    cooldown_ate TEXT, variante_atual TEXT, vencido_em)

-- Provas (inimigo, chefe, fantasma, pré-teste)
tentativa(id PK, usuario_id, tipo TEXT,   -- combate|chefe|fantasma|preteste
          alvo_id TEXT,                   -- topico_id ou modulo_id
          variante_id TEXT, plano JSON, estado JSON,
          revanche INT,                   -- 1 = alvo já vencido antes (D011)
          adaptacao INT, perfuracao REAL, -- congelados ao começar a tentativa
          poder REAL, vida_inicial REAL, vida_atual REAL, defesa REAL,
          inicio, fim, resultado TEXT,    -- vitoria|derrota|abandono|em_curso
          motivo TEXT,                    -- vida|piso|tempo (na derrota)
          acertos INT, total INT, xp_ganho INT)

-- Cada golpe sofrido (auditável: o dado é do servidor)
golpe(tentativa_id, ordem INT, dados JSON,      -- ex.: [4] ou [3,5]
      dano_bruto REAL, reducao REAL, dano REAL, -- após defesa/esquiva/escudo
      vida_depois REAL, skill_id TEXT, PK(tentativa_id, ordem))

resposta(tentativa_id, ordem INT, questao_id, questao_versao INT,
         resposta JSON, correta INT, confianca INT,  -- 1..3 (variante Oráculo)
         segundos INT, ajuda_skill_id TEXT, PK(tentativa_id, ordem))

-- Inimigos que aprendem (D015)
adaptacao(usuario_id, alvo_id TEXT,     -- topico_id ou modulo_id
          nivel INT,                    -- 0..5
          derrotas_seguidas INT, atualizado_em, PK(usuario_id, alvo_id))

desempenho(usuario_id, escopo TEXT,     -- topico|objetivo
           ref_id TEXT,
           erros_pond REAL, respostas_pond REAL,   -- com meia-vida de 30 dias
           fraqueza REAL, atualizado_em, PK(usuario_id, escopo, ref_id))
    -- recalculado a cada resposta; é o que alimenta o sorteio e o painel

-- Revisão espaçada
revisao(usuario_id, topico_id, etapa INT,  -- 1..5 → 1,3,7,21,60 dias
        vence_em TEXT, feita_em TEXT, resultado TEXT, sem_ajuda INT)

-- Skills
personagem_skill(usuario_id, skill_id, nivel INT, PK(...))
uso_skill(id PK, usuario_id, skill_id, tentativa_id, questao_id, em)

-- Laboratório
evidencia(id PK, usuario_id, topico_id, tipo TEXT,  -- foto|video|link|arquivo
          caminho_ou_url, descricao_md, criada_em)

-- Histórico e auditoria
evento(id PK, usuario_id, tipo TEXT, dados JSON, em)   -- XP, nível, conquista...
conquista(usuario_id, conquista_id, em, PK(...))
```

## Índices essenciais
- `revisao(usuario_id, vence_em) WHERE feita_em IS NULL` — fantasmas do dia.
- `resposta(questao_id)` — estatística de acerto por questão.
- `sessao_estudo(usuario_id, inicio)` — horas por semana no painel.

## Invariantes
- `segundos_validos` só é escrito pelo servidor, a partir de `pulso`.
- `tentativa` em curso por alvo: **no máximo uma** (índice único parcial).
- Revanche de inimigo: no máximo 1 por dia por tópico; de chefe, 1 a cada 7 dias.
- Questão com resposta registrada nunca é apagada; muda de `versao`, e a
  resposta guarda a versão que viu.

## Backup
`sqlite3 estudos.db ".backup data/backup/estudos-AAAA-MM-DD.db"` diário via
systemd timer; manter 30 diários + 12 mensais; uma cópia fora do VPS.
