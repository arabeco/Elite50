-- Elite 2050 full schema audit.
-- Run in Supabase SQL editor. Output is CSV-like:
-- area,objeto,tipo,status,detalhe

create or replace function pg_temp.elite2050_count_rows(p_table text)
returns text
language plpgsql
as $$
declare
  v_count bigint;
begin
  if to_regclass('public.' || p_table) is null then
    return 'FALTANDO';
  end if;

  execute format('select count(*) from public.%I', p_table) into v_count;
  return v_count::text;
exception when others then
  return 'ERRO: ' || sqlerrm;
end;
$$;

create or replace function pg_temp.elite2050_row_exists(p_table text, p_column text, p_value text)
returns boolean
language plpgsql
as $$
declare
  v_exists boolean;
begin
  if to_regclass('public.' || p_table) is null then
    return false;
  end if;

  execute format('select exists (select 1 from public.%I where %I = $1)', p_table, p_column)
    into v_exists
    using p_value;
  return coalesce(v_exists, false);
exception when others then
  return false;
end;
$$;

with expected_tables(area, table_name, required_for) as (
  values
    ('core_legacy', 'games', 'save/load, mundos, realtime'),
    ('core_legacy', 'notifications', 'notificacoes de usuario'),
    ('core_legacy', 'players', 'schema legado de jogadores'),
    ('core_legacy', 'teams', 'schema legado de times'),
    ('core_legacy', 'managers', 'schema legado de managers'),
    ('core_legacy', 'transfers', 'transferencias legadas'),
    ('core_legacy', 'leagues', 'ligas legadas'),
    ('core_legacy', 'seasons', 'temporadas legadas'),
    ('core_legacy', 'global_game_state', 'estado global legado'),
    ('core_legacy', 'matches', 'partidas legadas'),
    ('feedback', 'feedback_reports', 'modal de feedback'),
    ('premium_meta', 'profiles_meta', 'premium, ouro, fragmentos'),
    ('premium_meta', 'circuit_definitions', 'passe/circuito global'),
    ('premium_meta', 'user_circuit_progress', 'progresso por usuario'),
    ('premium_meta', 'catalog_items', 'catalogo remoto loja'),
    ('premium_meta', 'user_inventory', 'inventario global'),
    ('premium_meta', 'mobile_purchases', 'compras Google/App Store'),
    ('world_normalized', 'worlds', 'mundo normalizado'),
    ('world_normalized', 'world_participants', 'participantes do mundo'),
    ('world_normalized', 'world_managers', 'managers por mundo'),
    ('world_normalized', 'world_teams', 'times por mundo'),
    ('world_normalized', 'world_players', 'jogadores por mundo'),
    ('world_normalized', 'world_matches', 'partidas por mundo'),
    ('world_normalized', 'world_standings', 'tabelas por mundo'),
    ('world_normalized', 'world_news', 'noticias por mundo'),
    ('world_normalized', 'world_user_state', 'estado por usuario/mundo'),
    ('world_normalized', 'world_snapshots', 'snapshots do criador')
),
expected_columns(table_name, column_name) as (
  values
    ('games','user_id'),('games','world_id'),('games','world_state'),('games','teams_data'),
    ('games','players_data'),('games','managers_data'),('games','user_team_id'),('games','user_manager_id'),
    ('games','notifications'),('games','last_headline'),('games','training_data'),('games','updated_at'),
    ('games','is_creator'),('games','is_public'),
    ('feedback_reports','user_id'),('feedback_reports','world_id'),('feedback_reports','current_tab'),('feedback_reports','message'),
    ('profiles_meta','user_id'),('profiles_meta','premium_active'),('profiles_meta','premium_source'),('profiles_meta','premium_until'),
    ('profiles_meta','current_circuit_id'),('profiles_meta','gold_balance'),('profiles_meta','fragment_balance'),
    ('circuit_definitions','id'),('circuit_definitions','premium_product_code'),('circuit_definitions','is_active'),
    ('catalog_items','id'),('catalog_items','category'),('catalog_items','currency'),('catalog_items','price'),('catalog_items','premium_only'),('catalog_items','is_active'),
    ('user_inventory','user_id'),('user_inventory','item_id'),('user_inventory','is_equipped'),('user_inventory','equipped_context'),
    ('mobile_purchases','user_id'),('mobile_purchases','product_code'),('mobile_purchases','purchase_token'),('mobile_purchases','status'),
    ('worlds','id'),('worlds','creator_user_id'),('worlds','is_public'),('worlds','join_code'),('worlds','updated_at'),
    ('world_participants','world_id'),('world_participants','user_id'),('world_participants','team_id'),('world_participants','is_creator'),
    ('world_user_state','world_id'),('world_user_state','user_id'),('world_user_state','store_overlay')
),
expected_functions(function_name, identity_args, required_for) as (
  values
    ('ensure_user_meta', '', 'criar perfil meta'),
    ('purchase_catalog_item_with_balance', 'p_item_id text', 'comprar item com saldo'),
    ('grant_catalog_item', 'p_item_id text, p_source text, p_source_ref text', 'grant manual/recompensa'),
    ('grant_mobile_purchase', 'p_product_code text, p_purchase_token text, p_order_id text, p_platform text, p_package_name text, p_purchase_state text, p_expires_at timestamp with time zone, p_raw_payload jsonb', 'registrar compra nativa'),
    ('grant_season_completion_rewards', 'p_season integer, p_gold integer, p_fragments integer, p_reason jsonb', 'recompensa de temporada'),
    ('join_world_by_code', 'p_join_code text', 'entrar por codigo no app'),
    ('touch_updated_at', '', 'triggers updated_at mundo'),
    ('is_world_creator', 'p_world_id uuid', 'RLS mundo criador'),
    ('is_world_participant', 'p_world_id uuid', 'RLS participante'),
    ('is_world_readable', 'p_world_id uuid', 'RLS leitura mundo')
),
table_status as (
  select
    area,
    table_name as objeto,
    'tabela' as tipo,
    case when to_regclass('public.' || table_name) is null then 'FALTANDO' else 'OK' end as status,
    required_for || ' | rows=' || pg_temp.elite2050_count_rows(table_name) as detalhe
  from expected_tables
),
rls_status as (
  select
    et.area,
    et.table_name as objeto,
    'rls' as tipo,
    case
      when c.oid is null then 'FALTANDO'
      when c.relrowsecurity then 'OK'
      else 'FALTANDO'
    end as status,
    case
      when c.oid is null then 'tabela ausente'
      when c.relrowsecurity then 'RLS enabled'
      else 'RLS disabled'
    end as detalhe
  from expected_tables et
  left join pg_class c on c.oid = to_regclass('public.' || et.table_name)
),
policy_status as (
  select
    et.area,
    et.table_name as objeto,
    'policies' as tipo,
    case
      when to_regclass('public.' || et.table_name) is null then 'FALTANDO'
      when count(p.policyname) > 0 then 'OK'
      else 'FALTANDO'
    end as status,
    coalesce(string_agg(p.policyname || ':' || p.cmd, ' | ' order by p.policyname), 'sem policies') as detalhe
  from expected_tables et
  left join pg_policies p on p.schemaname = 'public' and p.tablename = et.table_name
  group by et.area, et.table_name
),
column_status as (
  select
    'colunas' as area,
    ec.table_name as objeto,
    'coluna' as tipo,
    case
      when to_regclass('public.' || ec.table_name) is null then 'FALTANDO'
      when c.column_name is null then 'FALTANDO'
      else 'OK'
    end as status,
    ec.column_name as detalhe
  from expected_columns ec
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name = ec.table_name
   and c.column_name = ec.column_name
),
function_status as (
  select
    'rpc_funcoes' as area,
    ef.function_name as objeto,
    'funcao' as tipo,
    case when p.oid is null then 'FALTANDO' else 'OK' end as status,
    ef.required_for || ' | args=' || coalesce(pg_get_function_identity_arguments(p.oid), ef.identity_args) as detalhe
  from expected_functions ef
  left join pg_proc p
    on p.pronamespace = 'public'::regnamespace
   and p.proname = ef.function_name
),
catalog_status as (
  select
    'loja_catalogo' as area,
    x.id as objeto,
    'catalog_item' as tipo,
    case when pg_temp.elite2050_row_exists('catalog_items', 'id', x.id) then 'OK' else 'FALTANDO' end as status,
    x.detail as detalhe
  from (
    values
      ('boot_01','chuteira base esperada'),
      ('boot_02','chuteira comum esperada'),
      ('boot_03','chuteira comum esperada'),
      ('boot_04','chuteira comum esperada'),
      ('boot_05','chuteira comum esperada'),
      ('boot_06','chuteira comum esperada'),
      ('boot_07','chuteira comum esperada'),
      ('boot_08','chuteira comum esperada'),
      ('boot_09','chuteira comum esperada'),
      ('boot_10','chuteira comum esperada'),
      ('boot_11','chuteira comum esperada'),
      ('boot_12','chuteira comum esperada'),
      ('boot_13','chuteira comum esperada'),
      ('boot_14','chuteira comum esperada'),
      ('boot_21','chuteira incomum esperada'),
      ('boot_23','chuteira incomum esperada'),
      ('boot_24','chuteira incomum esperada'),
      ('boot_25','chuteira incomum esperada'),
      ('boot_26','chuteira incomum esperada'),
      ('boot_27','chuteira incomum esperada'),
      ('boot_31','chuteira rara esperada'),
      ('boot_32','chuteira rara esperada'),
      ('boot_33','chuteira rara esperada'),
      ('boot_34','chuteira rara esperada'),
      ('boot_35','chuteira rara esperada'),
      ('boot_36','chuteira rara esperada'),
      ('boot_41','chuteira epica esperada'),
      ('boot_42','chuteira epica esperada'),
      ('boot_43','chuteira lendaria esperada'),
      ('boot_44','chuteira lendaria esperada'),
      ('accessory_founder_whistle','item manager'),
      ('accessory_scout_lens','item manager'),
      ('badge_elite_original_s1','trofeu/badge premium'),
      ('logo_quantum_vault','logo premium remoto'),
      ('kit_circuit_chrome','kit premium/remoto')
  ) as x(id, detail)
),
product_status as (
  select
    'compras_produtos' as area,
    x.product_code as objeto,
    'produto_nativo' as tipo,
    case
      when to_regclass('public.mobile_purchases') is null then 'FALTANDO'
      when exists (
        select 1
        from pg_proc p
        where p.pronamespace = 'public'::regnamespace
          and p.proname = 'grant_mobile_purchase'
      ) then 'OK'
      else 'FALTANDO'
    end as status,
    x.detail as detalhe
  from (
    values
      ('elite2050_gold_100','Google Play/App Store consumable'),
      ('elite2050_gold_300','Google Play/App Store consumable'),
      ('elite2050_gold_700','Google Play/App Store consumable'),
      ('passe_circuito_neon_01','Passe do Circuito / entitlement 90 dias')
  ) as x(product_code, detail)
)
select area,objeto,tipo,status,detalhe from table_status
union all select area,objeto,tipo,status,detalhe from rls_status
union all select area,objeto,tipo,status,detalhe from policy_status
union all select area,objeto,tipo,status,detalhe from column_status
union all select area,objeto,tipo,status,detalhe from function_status
union all select area,objeto,tipo,status,detalhe from catalog_status
union all select area,objeto,tipo,status,detalhe from product_status
order by
  case status when 'FALTANDO' then 0 when 'ERRO' then 1 else 2 end,
  area,
  objeto,
  tipo;
