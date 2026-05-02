-- Elite 2050 meta store minimal audit.
-- Safe to run first. It does not read from the target tables directly.

with expected_objects(kind, name) as (
  values
    ('table', 'profiles_meta'),
    ('table', 'circuit_definitions'),
    ('table', 'user_circuit_progress'),
    ('table', 'catalog_items'),
    ('table', 'user_inventory'),
    ('table', 'mobile_purchases'),
    ('function', 'ensure_user_meta'),
    ('function', 'purchase_catalog_item_with_balance'),
    ('function', 'grant_catalog_item'),
    ('function', 'grant_mobile_purchase'),
    ('function', 'grant_season_completion_rewards')
),
table_status as (
  select
    'table' as kind,
    eo.name,
    case when t.table_name is null then 'MISSING' else 'OK' end as status,
    coalesce(t.table_schema || '.' || t.table_name, '-') as details
  from expected_objects eo
  left join information_schema.tables t
    on t.table_schema = 'public'
    and t.table_name = eo.name
  where eo.kind = 'table'
),
function_status as (
  select
    'function' as kind,
    eo.name,
    case when p.proname is null then 'MISSING' else 'OK' end as status,
    coalesce(pg_get_function_identity_arguments(p.oid), '-') as details
  from expected_objects eo
  left join pg_proc p
    on p.proname = eo.name
  left join pg_namespace n
    on n.oid = p.pronamespace
  where eo.kind = 'function'
    and (n.nspname = 'public' or n.nspname is null)
)
select kind, name, status, details
from table_status
union all
select kind, name, status, details
from function_status
order by kind, name;
