-- Let any world participant process a due world tick once, then commit the
-- result into the creator/master row. This removes the requirement that the
-- world creator must be online at midnight.

create or replace function public.is_legacy_world_participant(p_world_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.games g
    where g.world_id = p_world_id
      and g.user_id = auth.uid()
  );
$$;

create or replace function public.claim_world_day_tick(
  p_world_id text,
  p_tick_key text,
  p_game_date timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock public.world_tick_locks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(p_world_id, '') = '' or coalesce(p_tick_key, '') = '' then
    raise exception 'INVALID_TICK';
  end if;

  if not public.is_legacy_world_participant(p_world_id) then
    raise exception 'WORLD_PARTICIPANT_REQUIRED';
  end if;

  select *
  into v_lock
  from public.world_tick_locks
  where world_id = p_world_id
    and tick_key = p_tick_key
  for update;

  if not found then
    insert into public.world_tick_locks (
      world_id,
      tick_key,
      game_date,
      claimed_by
    )
    values (
      p_world_id,
      p_tick_key,
      p_game_date,
      auth.uid()
    );
    return true;
  end if;

  if v_lock.status = 'FAILED'
    or (v_lock.status = 'CLAIMED' and v_lock.claimed_at < now() - interval '5 minutes') then
    update public.world_tick_locks
    set status = 'CLAIMED',
        game_date = p_game_date,
        claimed_by = auth.uid(),
        claimed_at = now(),
        completed_at = null,
        error = null,
        updated_at = now()
    where id = v_lock.id;
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.commit_world_tick_state(
  p_world_id text,
  p_tick_key text,
  p_world_state jsonb,
  p_teams_data jsonb,
  p_players_data jsonb,
  p_managers_data jsonb,
  p_notifications jsonb default '[]'::jsonb,
  p_last_headline jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_legacy_world_participant(p_world_id) then
    raise exception 'WORLD_PARTICIPANT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.world_tick_locks l
    where l.world_id = p_world_id
      and l.tick_key = p_tick_key
      and l.claimed_by = auth.uid()
      and l.status = 'CLAIMED'
  ) then
    raise exception 'TICK_NOT_CLAIMED';
  end if;

  update public.games
  set world_state = p_world_state,
      teams_data = p_teams_data,
      players_data = p_players_data,
      managers_data = p_managers_data,
      notifications = p_notifications,
      last_headline = p_last_headline,
      updated_at = now()
  where world_id = p_world_id
    and is_creator = true;

  return found;
end;
$$;

create or replace function public.complete_world_day_tick(
  p_world_id text,
  p_tick_key text,
  p_success boolean default true,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_legacy_world_participant(p_world_id) then
    raise exception 'WORLD_PARTICIPANT_REQUIRED';
  end if;

  update public.world_tick_locks
  set status = case when p_success then 'COMPLETED' else 'FAILED' end,
      completed_at = now(),
      error = left(p_error, 1000),
      updated_at = now()
  where world_id = p_world_id
    and tick_key = p_tick_key
    and claimed_by = auth.uid();

  return found;
end;
$$;

revoke all on function public.is_legacy_world_participant(text) from public;
grant execute on function public.is_legacy_world_participant(text) to authenticated;

revoke all on function public.claim_world_day_tick(text, text, timestamptz) from public;
grant execute on function public.claim_world_day_tick(text, text, timestamptz) to authenticated;

revoke all on function public.commit_world_tick_state(text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.commit_world_tick_state(text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

revoke all on function public.complete_world_day_tick(text, text, boolean, text) from public;
grant execute on function public.complete_world_day_tick(text, text, boolean, text) to authenticated;
