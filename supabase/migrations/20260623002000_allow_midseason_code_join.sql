-- Allow code joins after kickoff when the world permits midseason takeover.
-- The new participant enters as an observer, then can claim/request a free NPC club.

create or replace function public.join_world_by_code(p_join_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_join_code, '')));
  v_master public.games%rowtype;
  v_world jsonb;
  v_access jsonb;
  v_status text;
  v_phase text;
  v_current_day integer;
  v_current_round integer;
  v_lobby_join_open boolean;
  v_midseason_join_open boolean;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_code = '' then
    raise exception 'INVALID_JOIN_CODE';
  end if;

  select *
    into v_master
  from public.games
  where coalesce(is_creator, true) = true
    and upper(coalesce(world_state->'access'->>'joinCode', '')) = v_code
  order by updated_at desc
  limit 1;

  if not found then
    raise exception 'INVALID_JOIN_CODE';
  end if;

  v_world := coalesce(v_master.world_state, '{}'::jsonb);
  v_access := coalesce(v_world->'access', '{}'::jsonb);
  v_status := coalesce(v_world->>'status', 'LOBBY');
  v_phase := coalesce(v_world->>'phase', 'OFFSEASON');
  v_current_day := coalesce(nullif(v_world->>'currentDay', '')::integer, -1);
  v_current_round := coalesce(nullif(v_world->>'currentRound', '')::integer, 0);

  v_lobby_join_open :=
    v_status = 'LOBBY'
    and v_current_day <= 2;

  v_midseason_join_open :=
    coalesce((v_access->>'allowMidSeasonJoin')::boolean, true) is true
    and coalesce((v_access->>'allowTakeover')::boolean, true) is true
    and (
      v_phase = 'OFFSEASON'
      or (
        v_status = 'ACTIVE'
        and v_phase = 'REGULAR_SEASON'
        and v_current_round <= 4
      )
    );

  if coalesce((v_access->>'allowObservers')::boolean, true) is not true
    or (not v_lobby_join_open and not v_midseason_join_open) then
    raise exception 'JOIN_WINDOW_CLOSED';
  end if;

  if exists (
    select 1
    from public.games g
    where g.user_id = v_user_id
      and g.world_id = v_master.world_id
  ) then
    return v_master.world_id;
  end if;

  insert into public.games (
    user_id,
    world_id,
    world_state,
    teams_data,
    players_data,
    managers_data,
    user_team_id,
    user_manager_id,
    notifications,
    last_headline,
    training_data,
    is_creator,
    is_public,
    updated_at
  )
  values (
    v_user_id,
    v_master.world_id,
    v_master.world_state,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    null,
    null,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    false,
    now()
  );

  return v_master.world_id;
end;
$$;
