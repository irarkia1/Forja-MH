-- Pausa no estudo (não vale para provas): enquanto pausada, nada conta e o check-in não corre.
ALTER TABLE sessao_estudo ADD COLUMN pausada INTEGER NOT NULL DEFAULT 0;

-- Caderno: páginas livres ou ligadas a um tópico (uma por tópico).
-- conteudo = JSON [[{t, c?, b?}]] — parágrafos de trechos; c = cor do marca-texto.
CREATE TABLE caderno_pagina (
  id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  topico_id TEXT REFERENCES topico(id),
  titulo TEXT NOT NULL, conteudo TEXT NOT NULL DEFAULT '[]',
  criada_em TEXT NOT NULL, atualizada_em TEXT NOT NULL
);
CREATE INDEX caderno_usuario ON caderno_pagina(usuario_id, atualizada_em);
CREATE UNIQUE INDEX caderno_topico ON caderno_pagina(usuario_id, topico_id) WHERE topico_id IS NOT NULL;
