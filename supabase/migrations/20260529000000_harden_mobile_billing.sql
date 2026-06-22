alter table public.mobile_purchases
  add column if not exists product_id text;

drop policy if exists "mobile_purchases_insert_own" on public.mobile_purchases;
drop policy if exists "mobile_purchases_update_own" on public.mobile_purchases;

create unique index if not exists mobile_purchases_purchase_token_key
  on public.mobile_purchases(purchase_token)
  where purchase_token is not null;

drop function if exists public.grant_mobile_purchase(text, text, text, text, text, text, timestamptz, jsonb);

create or replace function public.grant_mobile_purchase(
  p_user_id uuid,
  p_product_code text,
  p_product_id text,
  p_purchase_token text default null,
  p_order_id text default null,
  p_platform text default 'android',
  p_package_name text default null,
  p_purchase_state text default null,
  p_expires_at timestamptz default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.mobile_purchases%rowtype;
  v_active_circuit_id text;
  v_gold integer := 0;
  v_fragments integer := 0;
  v_premium boolean := false;
  v_premium_until timestamptz;
  v_purchase_id uuid;
begin
  if p_user_id is null then
    raise exception 'USER_REQUIRED';
  end if;

  if nullif(trim(coalesce(p_purchase_token, '')), '') is null then
    raise exception 'TOKEN_REQUIRED';
  end if;

  if nullif(trim(coalesce(p_product_code, '')), '') is null then
    raise exception 'PRODUCT_CODE_REQUIRED';
  end if;

  if nullif(trim(coalesce(p_product_id, '')), '') is null then
    raise exception 'PRODUCT_ID_REQUIRED';
  end if;

  select *
    into v_existing
  from public.mobile_purchases
  where purchase_token = p_purchase_token
  for update;

  if found then
    if v_existing.user_id <> p_user_id then
      raise exception 'TOKEN_ALREADY_USED';
    end if;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'purchaseId', v_existing.id,
      'productCode', v_existing.product_code
    );
  end if;

  select id
    into v_active_circuit_id
  from public.circuit_definitions
  where is_active = true
  order by starts_at desc
  limit 1;

  insert into public.profiles_meta (
    user_id,
    current_circuit_id,
    gold_balance,
    fragment_balance
  )
  values (
    p_user_id,
    v_active_circuit_id,
    80,
    0
  )
  on conflict (user_id) do update
  set current_circuit_id = coalesce(public.profiles_meta.current_circuit_id, excluded.current_circuit_id),
      updated_at = now();

  if v_active_circuit_id is not null then
    insert into public.user_circuit_progress (
      user_id,
      circuit_id
    )
    values (
      p_user_id,
      v_active_circuit_id
    )
    on conflict (user_id, circuit_id) do nothing;
  end if;

  if p_product_code = 'passe_circuito_neon_01' and p_product_id = 'passe_circuito_neon_01' then
    v_premium := true;
    v_premium_until := coalesce(p_expires_at, now() + interval '90 days');
  elsif p_product_code = 'elite2050_gold_100' and p_product_id = 'elite2050_gold_100' then
    v_gold := 100;
  elsif p_product_code = 'elite2050_gold_300' and p_product_id = 'elite2050_gold_300' then
    v_gold := 300;
  elsif p_product_code = 'elite2050_gold_700' and p_product_id = 'elite2050_gold_700' then
    v_gold := 700;
  else
    return jsonb_build_object('ok', false, 'reason', 'PRODUCT_MISMATCH', 'productCode', p_product_code);
  end if;

  insert into public.mobile_purchases (
    user_id,
    provider,
    product_code,
    product_id,
    purchase_token,
    order_id,
    package_name,
    platform,
    status,
    purchase_state,
    acknowledged,
    consumed,
    purchased_at,
    expires_at,
    raw_payload
  )
  values (
    p_user_id,
    'google_play',
    p_product_code,
    p_product_id,
    p_purchase_token,
    p_order_id,
    p_package_name,
    p_platform,
    'GRANTED',
    p_purchase_state,
    true,
    not v_premium,
    now(),
    v_premium_until,
    p_raw_payload
  )
  returning id into v_purchase_id;

  update public.profiles_meta
  set gold_balance = gold_balance + v_gold,
      fragment_balance = fragment_balance + v_fragments,
      premium_active = case when v_premium then true else premium_active end,
      premium_source = case when v_premium then 'google_play' else premium_source end,
      premium_until = case when v_premium then greatest(coalesce(premium_until, now()), v_premium_until) else premium_until end,
      current_circuit_id = coalesce(current_circuit_id, v_active_circuit_id),
      updated_at = now()
  where user_id = p_user_id;

  if v_premium and v_active_circuit_id is not null then
    insert into public.user_circuit_progress (
      user_id,
      circuit_id,
      premium_unlocked
    )
    values (
      p_user_id,
      v_active_circuit_id,
      true
    )
    on conflict (user_id, circuit_id) do update
    set premium_unlocked = true,
        updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'purchaseId', v_purchase_id,
    'productCode', p_product_code,
    'premium', v_premium,
    'premiumUntil', v_premium_until,
    'gold', v_gold,
    'fragments', v_fragments
  );
end;
$$;

revoke all on function public.grant_mobile_purchase(uuid, text, text, text, text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;

grant execute on function public.grant_mobile_purchase(uuid, text, text, text, text, text, text, text, timestamptz, jsonb)
  to service_role;
