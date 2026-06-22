-- Idempotent world day ticks for creator-driven simulations.
-- The simulation engine still runs in the app, but each world/day must be
-- claimed once in Supabase before manual advancement can apply outcomes.

create extension if not exists pgcrypto;

create table if not exists public.world_tick_locks (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  tick_key text not null,
  game_date timestamptz,
  status text not null default 'CLAIMED'
    check (status in ('CLAIMED', 'COMPLETED', 'FAILED')),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (world_id, tick_key)
);

create index if not exists world_tick_locks_world_id_idx
  on public.world_tick_locks(world_id);

alter table public.world_tick_locks enable row level security;

drop policy if exists "world tick locks readable by participants" on public.world_tick_locks;
create policy "world tick locks readable by participants"
on public.world_tick_locks
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.world_id = world_tick_locks.world_id
      and g.user_id = auth.uid()
  )
);

create or replace function public.is_legacy_world_creator(p_world_id text)
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
      and g.is_creator = true
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

  if not public.is_legacy_world_creator(p_world_id) then
    raise exception 'WORLD_CREATOR_REQUIRED';
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

  if not public.is_legacy_world_creator(p_world_id) then
    raise exception 'WORLD_CREATOR_REQUIRED';
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

revoke all on function public.is_legacy_world_creator(text) from public;
grant execute on function public.is_legacy_world_creator(text) to authenticated;

revoke all on function public.claim_world_day_tick(text, text, timestamptz) from public;
grant execute on function public.claim_world_day_tick(text, text, timestamptz) to authenticated;

revoke all on function public.complete_world_day_tick(text, text, boolean, text) from public;
grant execute on function public.complete_world_day_tick(text, text, boolean, text) to authenticated;
