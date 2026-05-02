-- Elite 2050 meta store audit.
-- Safe to run in Supabase SQL Editor. It only reads schema/data counts.

with expected_tables(table_name) as (
  values
    ('profiles_meta'),
    ('circuit_definitions'),
    ('user_circuit_progress'),
    ('catalog_items'),
    ('user_inventory'),
    ('mobile_purchases')
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
  'columns' as section,
  table_name as item,
  string_agg(column_name || ':' || data_type, ', ' order by ordinal_position) as status,
  'public.' || table_name as details
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles_meta',
    'circuit_definitions',
    'user_circuit_progress',
    'catalog_items',
    'user_inventory',
    'mobile_purchases'
  )
group by table_name
order by table_name;

select
  'rls' as section,
  c.relname as item,
  case when c.relrowsecurity then 'ENABLED' else 'DISABLED' end as status,
  case when c.relforcerowsecurity then 'FORCED' else 'not forced' end as details
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles_meta',
    'circuit_definitions',
    'user_circuit_progress',
    'catalog_items',
    'user_inventory',
    'mobile_purchases'
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
    'profiles_meta',
    'circuit_definitions',
    'user_circuit_progress',
    'catalog_items',
    'user_inventory',
    'mobile_purchases'
  )
group by schemaname, tablename
order by tablename;

with expected_functions(function_name) as (
  values
    ('ensure_user_meta'),
    ('purchase_catalog_item_with_balance'),
    ('grant_catalog_item'),
    ('grant_mobile_purchase'),
    ('grant_season_completion_rewards')
)
select
  'function_exists' as section,
  expected_functions.function_name as item,
  case when p.proname is null then 'MISSING' else 'OK' end as status,
  coalesce(pg_get_function_identity_arguments(p.oid), '-') as details
from expected_functions
left join pg_proc p
  on p.proname = expected_functions.function_name
left join pg_namespace n
  on n.oid = p.pronamespace
  and n.nspname = 'public'
order by item;

select
  'catalog_count' as section,
  category as item,
  count(*)::text as status,
  string_agg(id, ', ' order by id) as details
from public.catalog_items
group by category
order by category;

select
  'catalog_flags' as section,
  id as item,
  concat(
    category,
    ' / ',
    rarity,
    ' / ',
    currency,
    ' ',
    price,
    case when premium_only then ' / premium' else ' / free' end
  ) as status,
  image_path as details
from public.catalog_items
order by category, price, id;

select
  'active_circuit' as section,
  id as item,
  case when is_active then 'ACTIVE' else 'INACTIVE' end as status,
  concat(name, ' | ', starts_at, ' -> ', ends_at, ' | target=', target_seasons) as details
from public.circuit_definitions
order by is_active desc, starts_at desc;

select
  'row_count' as section,
  'profiles_meta' as item,
  count(*)::text as status,
  'users with meta profile' as details
from public.profiles_meta
union all
select
  'row_count',
  'user_circuit_progress',
  count(*)::text,
  'circuit progress rows'
from public.user_circuit_progress
union all
select
  'row_count',
  'user_inventory',
  count(*)::text,
  'owned catalog items'
from public.user_inventory
union all
select
  'row_count',
  'mobile_purchases',
  count(*)::text,
  'registered mobile purchases'
from public.mobile_purchases;

select
  'latest_profiles' as section,
  user_id::text as item,
  concat(
    'premium=', premium_active,
    ' gold=', gold_balance,
    ' fragments=', fragment_balance,
    ' circuit=', coalesce(current_circuit_id, '-')
  ) as status,
  updated_at::text as details
from public.profiles_meta
order by updated_at desc
limit 10;

select
  'latest_inventory' as section,
  user_id::text as item,
  item_id as status,
  concat('source=', source, ' equipped=', is_equipped, ' at=', created_at) as details
from public.user_inventory
order by created_at desc
limit 20;

select
  'latest_mobile_purchases' as section,
  user_id::text as item,
  product_code as status,
  concat('status=', status, ' order=', coalesce(order_id, '-'), ' expires=', coalesce(expires_at::text, '-')) as details
from public.mobile_purchases
order by created_at desc
limit 20;
