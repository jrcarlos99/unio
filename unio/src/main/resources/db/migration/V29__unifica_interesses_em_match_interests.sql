-- D058: uma única fonte de verdade para interesse e match.
--
-- match_interests (V23, do main) já existe no banco da nuvem e passa a guardar todos os
-- interesses: uma linha por quem demonstrou interesse (liked_by_user_id) num par
-- startup x investidor. O match mútuo é o par com as duas linhas ativas (status
-- diferente de REJECTED). A coluna status continua mantida (LIKED sem reciprocidade,
-- MATCHED com reciprocidade) para as rotas /api/matches do main.
--
-- Esta migration só copia e acerta status; nada é apagado.
-- 1) Copia os interesses de user_interests (V27, só existia na linha da Carol) para
--    match_interests. Só pares STARTUP x INVESTOR; repetidos são ignorados.
-- 2) Acerta o status das linhas que estiverem fora da regra (por exemplo, dois "curtir"
--    simultâneos que ficaram LIKED dos dois lados). Linhas REJECTED não mudam.
-- 3) Marca user_interests como obsoleta. A tabela fica (sem DROP); o código não a usa mais.

INSERT INTO match_interests (startup_id, investor_id, liked_by_user_id, status, created_at)
SELECT CASE WHEN uf.role = 'STARTUP' THEN ui.from_user_id ELSE ui.to_user_id END,
       CASE WHEN uf.role = 'INVESTOR' THEN ui.from_user_id ELSE ui.to_user_id END,
       ui.from_user_id,
       'LIKED',
       ui.created_at
FROM user_interests ui
JOIN users uf ON uf.id = ui.from_user_id
JOIN users ut ON ut.id = ui.to_user_id
WHERE (uf.role = 'STARTUP' AND ut.role = 'INVESTOR')
   OR (uf.role = 'INVESTOR' AND ut.role = 'STARTUP')
ON CONFLICT (startup_id, investor_id, liked_by_user_id) DO NOTHING;

WITH esperado AS (
    SELECT m.id,
           CASE WHEN EXISTS (
                    SELECT 1 FROM match_interests o
                    WHERE o.startup_id = m.startup_id
                      AND o.investor_id = m.investor_id
                      AND o.liked_by_user_id <> m.liked_by_user_id
                      AND o.liked_by_user_id IN (o.startup_id, o.investor_id)
                      AND o.status <> 'REJECTED')
                THEN 'MATCHED' ELSE 'LIKED' END AS status
    FROM match_interests m
    WHERE m.status <> 'REJECTED'
      AND m.liked_by_user_id IN (m.startup_id, m.investor_id)
)
UPDATE match_interests m
SET status = esperado.status
FROM esperado
WHERE m.id = esperado.id
  AND m.status <> esperado.status;

COMMENT ON TABLE user_interests IS
    'Obsoleta desde a V29 (D058): interesses e matches ficam em match_interests. Mantida sem uso, sem DROP.';
