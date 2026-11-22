-- D045: a descoberta recalcula o score de um par quando um dos perfis mudou
-- depois do cálculo (match_scores.calculated_at). Os perfis não tinham data de
-- alteração. Linhas existentes recebem now(): os scores antigos são recalculados
-- uma vez, na primeira leitura.
ALTER TABLE startup_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE investor_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
