-- Reserve a legacy-world team atomically. The server derives the participant
-- snapshot from the creator row so the client cannot claim with forged data.

create unique index if not exists games_world_team_unique
  on public.games (world_id, user_team_id)
  where user_team_id is not null;

create or replace function public.claim_legacy_world_team(
  p_world_id text,
  p_team_id text,
  p_manager_name text default null,
  p_training_data jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_master public.games%rowtype;
  v_team jsonb;
  v_players jsonb;
  v_manager jsonb;
  v_status text;
  v_phase text;
  v_current_day integer;
  v_current_round integer;
  v_access jsonb;
  v_manager_name text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(trim(p_world_id), '') is null or p_team_id !~ '^t_' then
    raise exception 'team_not_available';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('elite-team-claim:' || p_world_id, 0));

  select g.*
    into v_master
  from public.games g
  where g.world_id = p_world_id
    and g.is_creator = true
  order by g.updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'world_not_found';
  end if;

  if exists (
    select 1
    from public.games g
    where g.world_id = p_world_id
      and g.user_team_id = p_team_id
      and g.user_id <> v_user_id
  ) then
    raise exception 'team_already_claimed';
  end if;

  v_status := coalesce(v_master.world_state->>'status', 'LOBBY');
  v_phase := v_master.world_state->>'phase';
  v_current_day := coalesce((v_master.world_state->>'currentDay')::integer, 0);
  v_current_round := coalesce((v_master.world_state->>'currentRound')::integer, 0);
  v_access := coalesce(v_master.world_state->'access', '{}'::jsonb);

  if coalesce((v_access->>'allowTakeover')::boolean, true) = false
    or coalesce((v_access->>'allowMidSeasonJoin')::boolean, true) = false
    or not (
      (v_status = 'LOBBY' and v_current_day <= 2)
      or v_phase = 'OFFSEASON'
      or (v_status = 'ACTIVE' and v_phase = 'REGULAR_SEASON' and v_current_round <= 2)
    ) then
    raise exception 'join_window_closed';
  end if;

  v_team := v_master.teams_data->p_team_id;
  if v_team is null then
    raise exception 'team_not_available';
  end if;

  select coalesce(jsonb_object_agg(player.key, player.value), '{}'::jsonb)
    into v_players
  from jsonb_each(coalesce(v_master.players_data, '{}'::jsonb)) player
  where player.key in (
    select jsonb_array_elements_text(coalesce(v_team->'squad', '[]'::jsonb))
  );

  v_manager_name := coalesce(nullif(trim(p_manager_name), ''), 'Manager Elite');
  v_manager := jsonb_build_object(
    'id', v_user_id::text,
    'name', v_manager_name,
    'district', v_team->>'district',
    'reputation', 50,
    'isNPC', false,
    'attributes', jsonb_build_object('evolution', 50, 'negotiation', 50, 'scout', 50),
    'career', jsonb_build_object(
      'titlesWon', 0,
      'totalLeagueTitles', 0,
      'totalCupTitles', 0,
      'hallOfFameEntries', 0,
      'consecutiveTitles', 0,
      'currentTeamId', p_team_id,
      'historyTeamIds', jsonb_build_array(p_team_id)
    ),
    'achievements', '[]'::jsonb
  );

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
  ) values (
    v_user_id,
    p_world_id,
    v_master.world_state,
    jsonb_build_object(p_team_id, v_team || jsonb_build_object('managerId', v_user_id::text)),
    v_players,
    jsonb_build_object(v_user_id::text, v_manager),
    p_team_id,
    v_user_id::text,
    '[]'::jsonb,
    '{}'::jsonb,
    coalesce(p_training_data, '{}'::jsonb),
    false,
    false,
    now()
  )
  on conflict (user_id, world_id) do update set
    world_state = excluded.world_state,
    teams_data = excluded.teams_data,
    players_data = excluded.players_data,
    managers_data = excluded.managers_data,
    user_team_id = excluded.user_team_id,
    user_manager_id = excluded.user_manager_id,
    training_data = excluded.training_data,
    is_creator = false,
    is_public = false,
    updated_at = excluded.updated_at;

  return p_world_id;
exception
  when unique_violation then
    raise exception 'team_already_claimed';
end;
$$;

revoke all on function public.claim_legacy_world_team(text, text, text, jsonb)
  from public, anon;
grant execute on function public.claim_legacy_world_team(text, text, text, jsonb)
  to authenticated;

create or replace function public.submit_legacy_draft_proposal(
  p_world_id text,
  p_player_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_member public.games%rowtype;
  v_master public.games%rowtype;
  v_proposals jsonb;
  v_priority integer;
  v_player_team_id text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('elite-draft:' || p_world_id, 0));

  select g.* into v_member
  from public.games g
  where g.world_id = p_world_id and g.user_id = v_user_id
  limit 1;

  if not found or v_member.user_team_id is null or v_member.user_manager_id is null then
    raise exception 'team_required';
  end if;

  select g.* into v_master
  from public.games g
  where g.world_id = p_world_id and g.is_creator = true
  order by g.updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'world_not_found';
  end if;

  if coalesce(v_master.world_state->>'status', 'LOBBY') <> 'LOBBY'
    or coalesce((v_master.world_state->>'currentDay')::integer, -1) not between 0 and 2 then
    raise exception 'draft_closed';
  end if;

  if not coalesce(v_master.players_data, '{}'::jsonb) ? p_player_id then
    raise exception 'player_not_available';
  end if;

  v_player_team_id := v_master.players_data->p_player_id->'contract'->>'teamId';
  if v_player_team_id = v_member.user_team_id or exists (
    select 1 from public.games g
    where g.world_id = p_world_id
      and g.user_team_id = v_player_team_id
      and g.user_id <> v_user_id
  ) then
    raise exception 'player_not_available';
  end if;

  v_proposals := coalesce(v_master.world_state->'draftProposals', '[]'::jsonb);
  if exists (
    select 1
    from jsonb_array_elements(v_proposals) proposal
    where proposal->>'managerId' = v_member.user_manager_id
      and proposal->>'playerId' = p_player_id
  ) then
    return true;
  end if;

  select count(*)::integer + 1 into v_priority
  from jsonb_array_elements(v_proposals) proposal
  where proposal->>'managerId' = v_member.user_manager_id;

  v_proposals := v_proposals || jsonb_build_array(jsonb_build_object(
    'playerId', p_player_id,
    'managerId', v_member.user_manager_id,
    'teamId', v_member.user_team_id,
    'priority', v_priority
  ));

  update public.games
  set world_state = jsonb_set(world_state, '{draftProposals}', v_proposals, true),
      updated_at = now()
  where user_id = v_master.user_id and world_id = p_world_id;

  return true;
end;
$$;

create or replace function public.cancel_legacy_draft_proposal(
  p_world_id text,
  p_player_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_manager_id text;
  v_master_user_id uuid;
  v_proposals jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('elite-draft:' || p_world_id, 0));

  select g.user_manager_id into v_manager_id
  from public.games g
  where g.world_id = p_world_id and g.user_id = v_user_id
  limit 1;

  if v_manager_id is null then
    raise exception 'team_required';
  end if;

  select g.user_id, coalesce(g.world_state->'draftProposals', '[]'::jsonb)
    into v_master_user_id, v_proposals
  from public.games g
  where g.world_id = p_world_id and g.is_creator = true
  order by g.updated_at desc
  limit 1
  for update;

  if v_master_user_id is null then
    raise exception 'world_not_found';
  end if;

  select coalesce(jsonb_agg(proposal), '[]'::jsonb) into v_proposals
  from jsonb_array_elements(v_proposals) proposal
  where not (
    proposal->>'managerId' = v_manager_id
    and proposal->>'playerId' = p_player_id
  );

  update public.games
  set world_state = jsonb_set(world_state, '{draftProposals}', v_proposals, true),
      updated_at = now()
  where user_id = v_master_user_id and world_id = p_world_id;

  return true;
end;
$$;

revoke all on function public.submit_legacy_draft_proposal(text, text) from public, anon;
revoke all on function public.cancel_legacy_draft_proposal(text, text) from public, anon;
grant execute on function public.submit_legacy_draft_proposal(text, text) to authenticated;
grant execute on function public.cancel_legacy_draft_proposal(text, text) to authenticated;
