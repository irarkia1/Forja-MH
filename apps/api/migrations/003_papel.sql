-- Papel do usuário: jogador (padrão) ou admin (ferramentas de teste).
ALTER TABLE usuario ADD COLUMN papel TEXT NOT NULL DEFAULT 'jogador';
