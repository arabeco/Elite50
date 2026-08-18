-- Versiona a RLS que JA EXISTE em producao para public.games.
--
-- Contexto: 20260225_enable_multiplayer.sql descreve uma policy aberta
-- (`USING (true)`) que nao existe mais no banco. As policies reais e as funcoes de
-- apoio foram criadas direto em producao e nunca versionadas, entao o repo descrevia
-- um schema que nao correspondia a realidade. Este arquivo fecha esse drift.
--
-- Extraido de producao em 2026-08-18 via pg_policies + pg_get_functiondef.
-- E idempotente e nao altera comportamento: aplicar em um banco ja correto e no-op.

-- Funcoes de apoio -----------------------------------------------------------

-- Overload (text): usada pelas policies de public.games, cujo world_id e text.
create or replace function public.is_world_participant(p_world_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.games g
    where g.world_id = p_world_id
      and g.user_id = auth.uid()
  );
$function$;

-- Overload (uuid): usada pelas tabelas normalizadas world_*, cujo world_id e uuid.
-- Depende de public.is_world_creator(uuid), que ainda nao esta versionada.
create or replace function public.is_world_participant(p_world_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.is_world_creator(p_world_id)
  or exists (
    select 1
    from public.world_participants wp
    where wp.world_id = p_world_id
      and wp.user_id = auth.uid()
  );
$function$;

create or replace function public.is_public_world(p_world_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.games g
    where g.world_id = p_world_id
      and g.is_creator = true
      and g.is_public = true
  );
$function$;

-- Policies de public.games ---------------------------------------------------

alter table public.games enable row level security;

-- A policy antiga aberta, caso ainda exista em algum ambiente.
drop policy if exists "Leitura pública de jogos" on public.games;

drop policy if exists games_select_own on public.games;
create policy games_select_own
  on public.games for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists games_select_world_participants on public.games;
create policy games_select_world_participants
  on public.games for select to authenticated
  using (is_world_participant(world_id));

drop policy if exists games_select_public_world_participants on public.games;
create policy games_select_public_world_participants
  on public.games for select to authenticated
  using (is_public_world(world_id));

drop policy if exists games_select_public on public.games;
create policy games_select_public
  on public.games for select to authenticated
  using (is_public = true);

drop policy if exists games_insert_own on public.games;
create policy games_insert_own
  on public.games for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists games_update_own on public.games;
create policy games_update_own
  on public.games for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists games_delete_own on public.games;
create policy games_delete_own
  on public.games for delete to authenticated
  using (auth.uid() = user_id);

comment on function public.is_world_participant(text) is
  'RLS de public.games: true se o usuario atual tem alguma linha neste world_id.';
comment on function public.is_public_world(text) is
  'RLS de public.games: true se a linha mestre deste mundo esta marcada como publica.';
