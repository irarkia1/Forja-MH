-- Forja M&H — schema inicial (docs/02-ARQUITETURA/BANCO-DE-DADOS.md).
-- Datas em ISO-8601 UTC; durações em segundos.

-- Conteúdo (espelho do YAML; reimportável) ---------------------------------
CREATE TABLE ato (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, regiao TEXT NOT NULL, lema TEXT NOT NULL,
  horas INTEGER NOT NULL, ordem INTEGER NOT NULL
);

CREATE TABLE modulo (
  id TEXT PRIMARY KEY, ato_id TEXT NOT NULL REFERENCES ato(id),
  nome TEXT NOT NULL, missao TEXT, horas INTEGER NOT NULL, trilha TEXT NOT NULL,
  ordem INTEGER NOT NULL, requer TEXT NOT NULL,        -- JSON: ["M0.2", "M1.4|M1.6"]
  tags_chefe TEXT NOT NULL,                            -- JSON
  horas_antes INTEGER NOT NULL,                        -- horas do currículo antes desta fase
  questoes_chefe INTEGER NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'ativo'
);

CREATE TABLE topico (
  id TEXT PRIMARY KEY, modulo_id TEXT NOT NULL REFERENCES modulo(id),
  nome TEXT NOT NULL, ordem INTEGER NOT NULL, tipo TEXT NOT NULL,   -- comum|elite
  horas REAL NOT NULL, minimo_seg INTEGER NOT NULL,
  depois_de TEXT,                                      -- JSON ou NULL (= anterior)
  objetivos TEXT NOT NULL,                             -- JSON [{id, texto}]
  roteiro_md TEXT,
  situacao TEXT NOT NULL DEFAULT 'ativo'
);

CREATE TABLE questao (
  id TEXT PRIMARY KEY, topico_id TEXT NOT NULL REFERENCES topico(id),
  objetivo_id TEXT NOT NULL, tipo TEXT NOT NULL,
  enunciado_md TEXT NOT NULL, dados TEXT NOT NULL,     -- JSON: alternativas, unidade
  gabarito TEXT NOT NULL,                              -- JSON; nunca sai antes da resposta (D004)
  explicacao_md TEXT NOT NULL, fonte TEXT NOT NULL,
  dificuldade INTEGER NOT NULL, bloom TEXT NOT NULL,
  origem TEXT NOT NULL, revisao TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1, hash TEXT NOT NULL
);
CREATE INDEX questao_topico ON questao(topico_id);

-- Jogador ---------------------------------------------------------------
CREATE TABLE usuario (
  id INTEGER PRIMARY KEY, login TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL, fuso TEXT NOT NULL DEFAULT 'America/Sao_Paulo'
);

CREATE TABLE sessao_login (
  token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  expira_em TEXT NOT NULL
);

CREATE TABLE personagem (
  usuario_id INTEGER PRIMARY KEY REFERENCES usuario(id),
  nivel INTEGER NOT NULL DEFAULT 1, faixa INTEGER NOT NULL DEFAULT 0,
  niveis_na_faixa INTEGER NOT NULL DEFAULT 0, xp_faixa INTEGER NOT NULL DEFAULT 0,
  xp_total INTEGER NOT NULL DEFAULT 0,
  posicao TEXT                                         -- JSON {ato, modulo, no}
);

-- Cronômetro --------------------------------------------------------------
CREATE TABLE sessao_estudo (
  id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  topico_id TEXT NOT NULL REFERENCES topico(id),
  inicio TEXT NOT NULL, fim TEXT,
  ultimo_pulso TEXT NOT NULL, ultimo_visivel INTEGER NOT NULL DEFAULT 1,
  ultimo_checkin TEXT NOT NULL,
  pendente_seg INTEGER NOT NULL DEFAULT 0,             -- válidos desde o último check-in
  segundos_validos INTEGER NOT NULL DEFAULT 0,         -- só o servidor escreve
  checkins_perdidos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX sessao_estudo_usuario ON sessao_estudo(usuario_id, inicio);
CREATE UNIQUE INDEX sessao_estudo_aberta ON sessao_estudo(usuario_id) WHERE fim IS NULL;

-- Progresso -------------------------------------------------------------
CREATE TABLE progresso_topico (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  topico_id TEXT NOT NULL REFERENCES topico(id),
  segundos_estudo INTEGER NOT NULL DEFAULT 0,
  recuperacao_seg INTEGER NOT NULL DEFAULT 0,          -- estudo exigido após derrota
  nota TEXT, nota_em TEXT,
  derrotado_em TEXT,
  vitorias INTEGER NOT NULL DEFAULT 0, derrotas INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, topico_id)
);

CREATE TABLE progresso_modulo (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  modulo_id TEXT NOT NULL REFERENCES modulo(id),
  vencido_em TEXT, cooldown_ate TEXT, melhor_acerto REAL,
  PRIMARY KEY (usuario_id, modulo_id)
);

CREATE TABLE evidencia (
  id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  topico_id TEXT NOT NULL REFERENCES topico(id),
  descricao_md TEXT NOT NULL, link TEXT, criada_em TEXT NOT NULL
);

-- Provas ----------------------------------------------------------------
CREATE TABLE tentativa (
  id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  tipo TEXT NOT NULL,                                  -- combate|chefe
  alvo_id TEXT NOT NULL,                               -- topico_id ou modulo_id
  revanche INTEGER NOT NULL DEFAULT 0,
  variante_id TEXT,
  plano TEXT NOT NULL,                                 -- JSON (inclui gabarito interno — nunca sai)
  estado TEXT NOT NULL,                                -- JSON {vida, proxima, acertos}
  inicio TEXT NOT NULL, fim TEXT,
  resultado TEXT NOT NULL DEFAULT 'em_curso',          -- vitoria|derrota|abandono|em_curso
  motivo TEXT, acertos INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  xp_ganho INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX tentativa_em_curso ON tentativa(usuario_id) WHERE resultado = 'em_curso';
CREATE INDEX tentativa_alvo ON tentativa(usuario_id, alvo_id, inicio);

CREATE TABLE resposta (
  tentativa_id INTEGER NOT NULL REFERENCES tentativa(id),
  ordem INTEGER NOT NULL, questao_id TEXT NOT NULL, questao_versao INTEGER NOT NULL,
  resposta TEXT NOT NULL, correta INTEGER NOT NULL, em TEXT NOT NULL,
  PRIMARY KEY (tentativa_id, ordem)
);
CREATE INDEX resposta_questao ON resposta(questao_id);

CREATE TABLE golpe (
  tentativa_id INTEGER NOT NULL REFERENCES tentativa(id),
  ordem INTEGER NOT NULL, dado INTEGER NOT NULL, poder REAL NOT NULL,
  defesa REAL NOT NULL, perfuracao REAL NOT NULL, dano REAL NOT NULL, vida_depois REAL NOT NULL,
  PRIMARY KEY (tentativa_id, ordem)
);

-- Inimigos que aprendem (D015) -----------------------------------------
CREATE TABLE adaptacao (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  alvo_id TEXT NOT NULL, nivel INTEGER NOT NULL, atualizado_em TEXT NOT NULL,
  PRIMARY KEY (usuario_id, alvo_id)
);

CREATE TABLE desempenho (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  escopo TEXT NOT NULL,                                -- topico|objetivo
  ref_id TEXT NOT NULL,
  erros_pond REAL NOT NULL, respostas_pond REAL NOT NULL, atualizado_em TEXT NOT NULL,
  PRIMARY KEY (usuario_id, escopo, ref_id)
);

CREATE TABLE evento (
  id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  tipo TEXT NOT NULL, dados TEXT NOT NULL, em TEXT NOT NULL
);
