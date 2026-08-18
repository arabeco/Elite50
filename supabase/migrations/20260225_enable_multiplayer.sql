-- SUPERSEDIDA por 20260818001000_document_live_games_rls.sql.
--
-- A policy aberta abaixo (USING (true)) NAO existe mais em producao: foi substituida
-- por policies por participante/mundo publico criadas direto no banco. Este arquivo
-- fica no historico apenas para manter a sequencia de migrations reproduzivel — em um
-- rebuild do zero, a migration de 2026-08-18 derruba esta policy logo em seguida.
-- Nao use este arquivo como referencia do estado atual da RLS.


-- Enable public read for games to allow finding other worlds
-- This policy allows any authenticated user to SELECT any game row.
-- This is necessary for "Multiplayer" features where users can find/join/view other worlds.

DROP POLICY IF EXISTS "Leitura pública de jogos" ON games;

CREATE POLICY "Leitura pública de jogos"
ON games
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
