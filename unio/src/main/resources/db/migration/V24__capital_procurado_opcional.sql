-- D029: capital procurado passa a ser opcional (startup que não busca investimento).
-- V19 a V22 estão reservadas pela branch feat/p2-comunicacao-lgpd-qualidade.
ALTER TABLE startup_profiles ALTER COLUMN capital_procurado DROP NOT NULL;
