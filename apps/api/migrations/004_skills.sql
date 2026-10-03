-- Skills e energia (F3).
ALTER TABLE personagem ADD COLUMN energia REAL NOT NULL DEFAULT 5;

CREATE TABLE personagem_skill (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  skill_id TEXT NOT NULL, nivel INTEGER NOT NULL,
  PRIMARY KEY (usuario_id, skill_id)
);

-- Toda ajuda fica registrada (regra 6 das skills).
CREATE TABLE uso_skill (
  id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  skill_id TEXT NOT NULL, tentativa_id INTEGER NOT NULL REFERENCES tentativa(id),
  ordem INTEGER NOT NULL, em TEXT NOT NULL
);

-- O que aconteceu no golpe: esquiva, sorte, escudo.
ALTER TABLE golpe ADD COLUMN detalhe TEXT;
