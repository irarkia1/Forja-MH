-- Fantasmas: revisão espaçada (docs/04-SISTEMA-DE-ENSINO/ESTUDO-E-REVISAO.md)
CREATE TABLE revisao (
  id INTEGER PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  topico_id TEXT NOT NULL REFERENCES topico(id),
  tipo TEXT NOT NULL,                       -- agenda (1/3/7/21/60) | ferida (derrota no chefe)
  etapa INTEGER NOT NULL,                   -- 1..5 (ferida: 0)
  vence_em TEXT NOT NULL,                   -- início do dia, no fuso do usuário
  feita_em TEXT, resultado TEXT,            -- vitoria|derrota
  tentativa_id INTEGER REFERENCES tentativa(id)
);
CREATE INDEX revisao_pendente ON revisao(usuario_id, vence_em) WHERE feita_em IS NULL;

ALTER TABLE progresso_topico ADD COLUMN consolidado_em TEXT;
ALTER TABLE progresso_topico ADD COLUMN dominado_em TEXT;
