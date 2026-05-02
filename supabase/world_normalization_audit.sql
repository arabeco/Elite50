-- Elite 2050 world normalization audit.
-- Safe to run in Supabase SQL Editor. It only reads schema/data counts.

with expected_tables(table_name) as (
  values
    ('worlds'),
    ('world_participants'),
    ('world_managers'),
    ('world_teams'),
    ('world_players'),
    ('world_matches'),
    ('world_standings'),
    ('world_news'),
    ('world_user_state'),
    ('world_snapshots')
)
select
  'table_exists' as section,
  expected_tables.table_name as item,
  case when t.table_name is null then 'MISSING' else 'OK' end as status,
  coalesce(t.table_schema || '.' || t.table_name, '-') as details
from expected_tables
left join information_schema.tables t
  on t.table_schema = 'public'
  and t.table_name = expected_tables.table_name
order by item;

select
  'rls' as section,
  c.relname as item,
  case when c.relrowsecurity then 'ENABLED' else 'DISABLED' end as status,
  case when c.relforcerowsecurity then 'FORCED' else 'not forced' end as details
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'worlds',
    'world_participants',
    'world_managers',
    'world_teams',
    'world_players',
    'world_matches',
    'world_standings',
    'world_news',
    'world_user_state',
    'world_snapshots'
  )
order by c.relname;

select
  'policies' as section,
  tablename as item,
  string_agg(policyname || ':' || cmd, ', ' order by policyname) as status,
  schemaname as details
from pg_policies
where schemaname = 'public'
  and tablename in (
    'worlds',
    'world_participants',
    'world_managers',
    'world_teams',
    'world_players',
    'world_matches',
    'world_standings',
    'world_news',
    'world_user_state',
    'world_snapshots'
  )
group by schemaname, tablename
order by tablename;

select
  'function_exists' as section,
  expected.function_name as item,
  case when p.proname is null then 'MISSING' else 'OK' end as status,
  coalesce(pg_get_function_identity_arguments(p.oid), '-') as details
from (
  values
    ('touch_updated_at'),
    ('is_world_creator'),
    ('is_world_participant'),
    ('is_world_readable')
) as expected(function_name)
left join pg_proc p
  on p.proname = expected.function_name
left join pg_namespace n
  on n.oid = p.pronamespace
  and n.nspname = 'public'
order by item;

select
  'index_count' as section,
  tablename as item,
  count(*)::text as status,
  string_agg(indexname, ', ' order by indexname) as details
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'worlds',
    'world_participants',
    'world_managers',
    'world_teams',
    'world_players',
    'world_matches',
    'world_standings',
    'world_news',
    'world_user_state',
    'world_snapshots'
  )
group by tablename
order by tablename;

select
  'row_count' as section,
  'worlds' as item,
  count(*)::text as status,
  'normalized worlds' as details
from public.worlds
union all
select 'row_count', 'world_participants', count(*)::text, 'participants' from public.world_participants
union all
select 'row_count', 'world_managers', count(*)::text, 'managers' from public.world_managers
union all
select 'row_count', 'world_teams', count(*)::text, 'teams' from public.world_teams
union all
select 'row_count', 'world_players', count(*)::text, 'players' from public.world_players
union all
select 'row_count', 'world_matches', count(*)::text, 'matches' from public.world_matches
union all
select 'row_count', 'world_standings', count(*)::text, 'standings rows' from public.world_standings
union all
select 'row_count', 'world_news', count(*)::text, 'news rows' from public.world_news
union all
select 'row_count', 'world_user_state', count(*)::text, 'per-user state rows' from public.world_user_state
union all
select 'row_count', 'world_snapshots', count(*)::text, 'debug snapshots' from public.world_snapshots;

select
  'legacy_games' as section,
  world_id as item,
  count(*)::text as status,
  concat(
    'creator_rows=',
    count(*) filter (where is_creator = true),
    ' participant_rows=',
    count(*) filter (where is_creator = false),
    ' public_rows=',
    count(*) filter (where is_public = true),
    ' updated=',
    max(updated_at)
  ) as details
from public.games
group by world_id
order by max(updated_at) desc
limit 20;

select
  'normalized_world_summary' as section,
  w.id::text as item,
  concat(
    coalesce(w.legacy_world_id, '-'),
    ' | ',
    w.status,
    '/',
    w.phase,
    ' | day=',
    w.current_day,
    ' round=',
    w.current_round
  ) as status,
  concat(
    'teams=',
    (select count(*) from public.world_teams wt where wt.world_id = w.id),
    ' players=',
    (select count(*) from public.world_players wp where wp.world_id = w.id),
    ' matches=',
    (select count(*) from public.world_matches wm where wm.world_id = w.id),
    ' standings=',
    (select count(*) from public.world_standings ws where ws.world_id = w.id)
  ) as details
from public.worlds w
order by w.updated_at desc
limit 20;

