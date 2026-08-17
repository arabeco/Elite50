-- Fecha a leitura irrestrita de public.games.
--
-- A policy antiga (20260225_enable_multiplayer.sql) era:
--
--   CREATE POLICY "Leitura pública de jogos" ON games
--   FOR SELECT TO authenticated USING (true);
--
-- Ou seja: qualquer conta autenticada podia dar `select *` em TODAS as linhas de
-- games, de todos os usuarios. Como cada linha carrega world_state + teams_data +
-- players_data (~1,5 MB por mundo) e a anon key esta no bundle do cliente, isso era
-- ao mesmo tempo:
--   1. um vazamento de dados (saves alheios legiveis por qualquer um);
--   2. um vetor aberto de esgotamento da cota de egress.
--
-- A policy nova mantem os tres acessos que o app realmente precisa:
--   a) o usuario le as proprias linhas;
--   b) participantes de um mesmo mundo leem as linhas daquele mundo
--      (necessario para loadGameState montar o estado compartilhado);
--   c) qualquer autenticado le a linha MESTRE de mundos marcados como publicos
--      (necessario para listPublicWorlds montar a vitrine da comunidade).
--
-- join_world_by_code continua funcionando independentemente desta policy porque
-- e `security definer`.

drop policy if exists "Leitura pública de jogos" on public.games;
drop policy if exists "games_select_world_members" on public.games;

create policy "games_select_world_members"
on public.games
for select
to authenticated
using (
  -- (a) minhas proprias linhas
  user_id = auth.uid()
  -- (b) linhas de mundos em que eu ja participo
  or exists (
    select 1
    from public.games mine
    where mine.world_id = games.world_id
      and mine.user_id = auth.uid()
  )
  -- (c) vitrine publica: apenas a linha mestre de mundos publicos
  or (games.is_public is true and games.is_creator is true)
);

alter table public.games enable row level security;

-- Suporte de indice para a subconsulta (b).
create index if not exists games_user_world_idx
  on public.games (user_id, world_id);

comment on policy "games_select_world_members" on public.games is
  'Substitui a policy aberta USING(true). Leitura restrita a: proprias linhas, mundos em que o usuario participa, e linha mestre de mundos publicos.';
