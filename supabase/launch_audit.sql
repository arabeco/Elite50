-- Elite 2050 launch audit for a 20-person test.
-- Safe to run in Supabase SQL editor. It only reads data.

with expected_tables(table_name) as (
  values
    ('games'),
    ('notifications'),
    ('feedback_reports')
)
select
  'table_exists' as section,
  expected_tables.table_name as item,
  case when information_schema.tables.table_name is null then 'MISSING' else 'OK' end as status,
  coalesce(information_schema.tables.table_schema, '-') as details
from expected_tables
left join information_schema.tables
  on information_schema.tables.table_schema = 'public'
  and information_schema.tables.table_name = expected_tables.table_name
order by item;

select
  'row_count' as section,
  'games' as item,
  count(*)::text as status,
  'all save rows' as details
from public.games
union all
select
  'row_count',
  'creator_worlds',
  count(*)::text,
  'world master rows'
from public.games
where is_creator = true
union all
select
  'row_count',
  'joined_participants',
  count(*)::text,
  'non-creator rows'
from public.games
where is_creator = false
union all
select
  'row_count',
  'feedback_reports',
  case
    when to_regclass('public.feedback_reports') is null then 'MISSING'
    else (select count(*)::text from public.feedback_reports)
  end,
  'tester reports';

select
  'world' as section,
  world_id as item,
  count(*)::text as status,
  concat(
    'creators=', count(*) filter (where is_creator = true),
    ' participants=', count(*) filter (where is_creator = false),
    ' claimed_teams=', count(*) filter (where user_team_id is not null),
    ' last_update=', max(updated_at)
  ) as details
from public.games
group by world_id
order by max(updated_at) desc;

select
  'team_claim_conflict' as section,
  concat(world_id, ':', user_team_id) as item,
  count(*)::text as status,
  'should return zero rows' as details
from public.games
where user_team_id is not null
group by world_id, user_team_id
having count(*) > 1;

select
  'policies' as section,
  tablename as item,
  string_agg(policyname || ':' || cmd, ', ' order by policyname) as status,
  schemaname as details
from pg_policies
where schemaname = 'public'
  and tablename in ('games', 'notifications', 'feedback_reports')
group by schemaname, tablename
order by tablename;

select
  'latest_feedback' as section,
  coalesce(category, '-') as item,
  coalesce(current_tab, '-') as status,
  left(message, 120) as details
from public.feedback_reports
order by created_at desc
limit 10;
