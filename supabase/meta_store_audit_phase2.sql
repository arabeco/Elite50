-- Elite 2050 meta store audit phase 2.
-- Safe to run after meta_store_audit_minimal.sql returns OK for all tables.

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

select
  'catalog_count' as section,
  category as item,
  count(*)::text as status,
  concat(
    'premium=',
    count(*) filter (where premium_only = true),
    ' free=',
    count(*) filter (where premium_only = false),
    ' active=',
    count(*) filter (where is_active = true)
  ) as details
from public.catalog_items
group by category
order by category;

select
  'catalog_items' as section,
  id as item,
  concat(
    category,
    ' | ',
    rarity,
    ' | ',
    currency,
    ' ',
    price,
    case when premium_only then ' | premium' else ' | livre' end,
    case when is_active then ' | ativo' else ' | inativo' end
  ) as status,
  image_path as details
from public.catalog_items
order by category, premium_only, price, id;

select
  'active_circuit' as section,
  id as item,
  case when is_active then 'ACTIVE' else 'INACTIVE' end as status,
  concat(
    name,
    ' | ',
    starts_at,
    ' -> ',
    ends_at,
    ' | target_seasons=',
    target_seasons,
    ' | product=',
    premium_product_code
  ) as details
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
    'premium=',
    premium_active,
    ' source=',
    coalesce(premium_source, '-'),
    ' until=',
    coalesce(premium_until::text, '-'),
    ' gold=',
    gold_balance,
    ' fragments=',
    fragment_balance,
    ' circuit=',
    coalesce(current_circuit_id, '-')
  ) as status,
  updated_at::text as details
from public.profiles_meta
order by updated_at desc
limit 20;

select
  'latest_progress' as section,
  user_id::text as item,
  circuit_id as status,
  concat(
    'premium_unlocked=',
    premium_unlocked,
    ' seasons=',
    season_runs_completed,
    ' reports=',
    season_reports_opened,
    ' claims=',
    jsonb_array_length(reward_claims)
  ) as details
from public.user_circuit_progress
order by updated_at desc
limit 20;

select
  'latest_inventory' as section,
  user_id::text as item,
  item_id as status,
  concat(
    'source=',
    source,
    ' ref=',
    coalesce(source_ref, '-'),
    ' equipped=',
    is_equipped,
    ' at=',
    created_at
  ) as details
from public.user_inventory
order by created_at desc
limit 30;

select
  'latest_mobile_purchases' as section,
  user_id::text as item,
  product_code as status,
  concat(
    'status=',
    status,
    ' order=',
    coalesce(order_id, '-'),
    ' token=',
    case when purchase_token is null then '-' else left(purchase_token, 8) || '...' end,
    ' expires=',
    coalesce(expires_at::text, '-')
  ) as details
from public.mobile_purchases
order by created_at desc
limit 30;

select
  'function_signature' as section,
  p.proname as item,
  pg_get_function_identity_arguments(p.oid) as status,
  case when p.prosecdef then 'security definer' else 'security invoker' end as details
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'ensure_user_meta',
    'purchase_catalog_item_with_balance',
    'grant_catalog_item',
    'grant_mobile_purchase',
    'grant_season_completion_rewards'
  )
order by p.proname, pg_get_function_identity_arguments(p.oid);
