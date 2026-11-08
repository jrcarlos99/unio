-- T13 — Exclusão de dados (RNF03 / LGPD)
-- A conta excluída é anonimizada (e-mail, documento e senha substituídos) e marcada aqui,
-- para preservar a integridade de mensagens, reuniões e avaliações do outro participante.
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
