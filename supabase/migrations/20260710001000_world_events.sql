-- Lightweight realtime events for worlds.
-- Realtime should listen to this table, not to the heavy public.games JSON rows.

create table if not exists public.world_events (
  id bigserial primary key,
  world_id text not null,
  event_type text not null default 'WORLD_UPDATED',
  actor_user_id uuid null,
  world_day integer null,
  world_round integer null,
  phase text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists world_events_world_id_id_idx
  on public.world_events (world_id, id desc);

alter table public.world_events enable row level security;

drop policy if exists "world_events_select_world_members" on public.world_events;
create policy "world_events_select_world_members"
  on public.world_events
  for select
  using (
    exists (
      select 1
      from public.games g
      where g.world_id = world_events.world_id
        and g.user_id = auth.uid()
    )
  );

drop policy if exists "world_events_insert_world_members" on public.world_events;
create policy "world_events_insert_world_members"
  on public.world_events
  for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1
      from public.games g
      where g.world_id = world_events.world_id
        and g.user_id = auth.uid()
    )
  );

create or replace function public.emit_world_event_from_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  world_changed boolean := false;
  participant_changed boolean := false;
  next_event_type text;
  next_world_day integer;
  next_world_round integer;
begin
  if tg_op = 'UPDATE' then
    world_changed :=
      new.is_creator is true
      and (
        new.world_state is distinct from old.world_state
        or new.teams_data is distinct from old.teams_data
        or new.players_data is distinct from old.players_data
      );

    participant_changed :=
      new.user_team_id is distinct from old.user_team_id
      or new.user_manager_id is distinct from old.user_manager_id
      or new.is_public is distinct from old.is_public;

    if not world_changed and not participant_changed then
      return new;
    end if;
  else
    world_changed := new.is_creator is true;
    participant_changed := new.is_creator is not true;
  end if;

  next_event_type := case
    when world_changed then 'WORLD_UPDATED'
    else 'PARTICIPANT_UPDATED'
  end;

  next_world_day := nullif(new.world_state->>'currentDay', '')::integer;
  next_world_round := nullif(new.world_state->>'round', '')::integer;

  insert into public.world_events (
    world_id,
    event_type,
    actor_user_id,
    world_day,
    world_round,
    phase,
    payload
  )
  values (
    new.world_id,
    next_event_type,
    new.user_id,
    next_world_day,
    next_world_round,
    new.world_state->>'phase',
    jsonb_build_object(
      'isCreator', coalesce(new.is_creator, false),
      'userTeamId', new.user_team_id,
      'userManagerId', new.user_manager_id
    )
  );

  delete from public.world_events old_events
  where old_events.world_id = new.world_id
    and old_events.id not in (
      select kept.id
      from public.world_events kept
      where kept.world_id = new.world_id
      order by kept.id desc
      limit 120
    );

  return new;
end;
$$;

drop trigger if exists emit_world_event_after_game_change on public.games;
create trigger emit_world_event_after_game_change
after insert or update on public.games
for each row
execute function public.emit_world_event_from_game();

do $$
begin
  alter publication supabase_realtime add table public.world_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
