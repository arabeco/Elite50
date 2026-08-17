create index if not exists games_creator_world_idx
  on public.games (world_id)
  where is_creator is true;

create or replace function public.get_due_legacy_world_ids(
  p_now timestamptz default now()
)
returns table (world_id text)
language sql
stable
security definer
set search_path = public
as $$
  select g.world_id
  from public.games g
  where g.is_creator is true
    and (
      (
        coalesce(g.world_state->>'status', 'LOBBY') = 'LOBBY'
        and coalesce(nullif(g.world_state->>'currentDay', '')::integer, -1) = -1
        and nullif(g.world_state->>'startScheduledAt', '') is not null
        and (
          substring(g.world_state->>'startScheduledAt' from 1 for 4)::integer >= 2040
          or (g.world_state->>'startScheduledAt')::timestamptz <= p_now
        )
      )
      or
      (
        coalesce(nullif(g.world_state->>'currentDay', '')::integer, -1) >= 0
        and coalesce(g.world_state->>'status', 'LOBBY') <> 'FINISHED'
        and (
          coalesce(
            nullif(g.world_state->>'serverClockLastTickAt', '')::timestamptz,
            nullif(g.world_state->>'lastServerTickAt', '')::timestamptz,
            g.updated_at
          ) at time zone 'America/Sao_Paulo'
        )::date < (p_now at time zone 'America/Sao_Paulo')::date
      )
    );
$$;

revoke all on function public.get_due_legacy_world_ids(timestamptz) from public;
revoke all on function public.get_due_legacy_world_ids(timestamptz) from anon;
revoke all on function public.get_due_legacy_world_ids(timestamptz) from authenticated;
grant execute on function public.get_due_legacy_world_ids(timestamptz) to service_role;

comment on function public.get_due_legacy_world_ids(timestamptz) is
  'Returns only legacy world IDs that need kickoff or a civil-day tick, avoiding full games JSON scans every minute.';
