-- Prevent stale clients from replacing an active world's master row with an
-- older cached timeline. Normal player decisions may change the current and
-- future state, but the authoritative season clock can only move forward.

alter table public.games
  add column if not exists state_revision bigint not null default 1;

update public.games
set world_state = jsonb_set(world_state, '{stateRevision}', to_jsonb(state_revision), true)
where is_creator = true
  and not (world_state ? 'stateRevision');

create or replace function public.reject_legacy_world_clock_rollback()
returns trigger
language plpgsql
set search_path = public, auth
as $$
declare
  old_season integer;
  new_season integer;
  old_day integer;
  new_day integer;
  old_game_date timestamptz;
  new_game_date timestamptz;
  old_tick timestamptz;
  new_tick timestamptz;
  incoming_revision bigint;
begin
  if old.is_creator is not true then
    return new;
  end if;

  if new.is_creator is not true
     and auth.role() is distinct from 'service_role'
     and auth.role() is not null then
    raise exception 'MASTER_ROW_CANNOT_BE_DEMOTED' using errcode = 'P0001';
  end if;

  -- Edge Functions and SQL-editor maintenance may advance/repair without an
  -- expected revision, but every accepted write still creates a new revision.
  if auth.role() = 'service_role' or auth.role() is null then
    new.state_revision := old.state_revision + 1;
    new.world_state := jsonb_set(new.world_state, '{stateRevision}', to_jsonb(new.state_revision), true);
    return new;
  end if;

  incoming_revision := coalesce((new.world_state->>'stateRevision')::bigint, -1);
  if incoming_revision <> old.state_revision then
    raise exception 'STALE_WORLD_REVISION' using errcode = 'P0001';
  end if;

  old_season := coalesce((old.world_state->>'currentSeason')::integer, 0);
  new_season := coalesce((new.world_state->>'currentSeason')::integer, 0);
  old_day := coalesce((old.world_state->>'currentDay')::integer, -1);
  new_day := coalesce((new.world_state->>'currentDay')::integer, -1);

  if new_season < old_season
     or (new_season = old_season and new_day < old_day) then
    raise exception 'WORLD_CLOCK_ROLLBACK_REJECTED' using errcode = 'P0001';
  end if;

  old_game_date := nullif(old.world_state->>'currentDate', '')::timestamptz;
  new_game_date := nullif(new.world_state->>'currentDate', '')::timestamptz;
  if old_game_date is not null
     and (new_game_date is null or new_game_date < old_game_date) then
    raise exception 'WORLD_DATE_ROLLBACK_REJECTED' using errcode = 'P0001';
  end if;

  old_tick := coalesce(
    nullif(old.world_state->>'serverClockLastTickAt', '')::timestamptz,
    nullif(old.world_state->>'lastServerTickAt', '')::timestamptz
  );
  new_tick := coalesce(
    nullif(new.world_state->>'serverClockLastTickAt', '')::timestamptz,
    nullif(new.world_state->>'lastServerTickAt', '')::timestamptz
  );
  if old_tick is not null and (new_tick is null or new_tick < old_tick) then
    raise exception 'WORLD_TICK_ROLLBACK_REJECTED' using errcode = 'P0001';
  end if;

  new.state_revision := old.state_revision + 1;
  new.world_state := jsonb_set(new.world_state, '{stateRevision}', to_jsonb(new.state_revision), true);
  return new;
end;
$$;

drop trigger if exists reject_legacy_world_clock_rollback_before_update on public.games;
create trigger reject_legacy_world_clock_rollback_before_update
before update of world_state, is_creator on public.games
for each row
execute function public.reject_legacy_world_clock_rollback();
