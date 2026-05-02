create unique index if not exists user_inventory_user_id_item_id_key
  on public.user_inventory(user_id, item_id);

create unique index if not exists mobile_purchases_purchase_token_key
  on public.mobile_purchases(purchase_token)
  where purchase_token is not null;

create or replace function public.ensure_user_meta()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_active_circuit_id text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
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
    v_user_id,
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
      v_user_id,
      v_active_circuit_id
    )
    on conflict (user_id, circuit_id) do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'userId', v_user_id,
    'circuitId', v_active_circuit_id
  );
end;
$$;

create or replace function public.purchase_catalog_item_with_balance(
  p_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_item public.catalog_items%rowtype;
  v_profile public.profiles_meta%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.ensure_user_meta();

  select *
    into v_item
  from public.catalog_items
  where id = p_item_id
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'ITEM_NOT_FOUND');
  end if;

  select *
    into v_profile
  from public.profiles_meta
  where user_id = v_user_id
  for update;

  if exists (
    select 1
    from public.user_inventory
    where user_id = v_user_id
      and item_id = p_item_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_OWNED', 'itemId', p_item_id);
  end if;

  if v_item.premium_only and not coalesce(v_profile.premium_active, false) then
    return jsonb_build_object('ok', false, 'reason', 'PREMIUM_REQUIRED', 'itemId', p_item_id);
  end if;

  if v_item.currency = 'GOLD' and v_profile.gold_balance < v_item.price then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_GOLD', 'itemId', p_item_id);
  end if;

  if v_item.currency = 'FRAGMENT' and v_profile.fragment_balance < v_item.price then
    return jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_FRAGMENT', 'itemId', p_item_id);
  end if;

  if v_item.currency = 'GOLD' then
    update public.profiles_meta
    set gold_balance = gold_balance - v_item.price,
        updated_at = now()
    where user_id = v_user_id;
  elsif v_item.currency = 'FRAGMENT' then
    update public.profiles_meta
    set fragment_balance = fragment_balance - v_item.price,
        updated_at = now()
    where user_id = v_user_id;
  else
    return jsonb_build_object('ok', false, 'reason', 'INVALID_CURRENCY', 'itemId', p_item_id);
  end if;

  insert into public.user_inventory (
    user_id,
    item_id,
    source,
    source_ref
  )
  values (
    v_user_id,
    p_item_id,
    'STORE',
    v_item.currency || ':' || v_item.price::text
  )
  on conflict (user_id, item_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'itemId', p_item_id,
    'currency', v_item.currency,
    'price', v_item.price
  );
end;
$$;

create or replace function public.grant_catalog_item(
  p_item_id text,
  p_source text default 'GRANT',
  p_source_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.ensure_user_meta();

  if not exists (select 1 from public.catalog_items where id = p_item_id and is_active = true) then
    return jsonb_build_object('ok', false, 'reason', 'ITEM_NOT_FOUND', 'itemId', p_item_id);
  end if;

  insert into public.user_inventory (
    user_id,
    item_id,
    source,
    source_ref
  )
  values (
    v_user_id,
    p_item_id,
    p_source,
    p_source_ref
  )
  on conflict (user_id, item_id) do update
  set updated_at = now();

  return jsonb_build_object('ok', true, 'itemId', p_item_id);
end;
$$;

create or replace function public.grant_mobile_purchase(
  p_product_code text,
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
  v_user_id uuid;
  v_active_circuit_id text;
  v_gold integer := 0;
  v_fragments integer := 0;
  v_premium boolean := false;
  v_premium_until timestamptz;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform public.ensure_user_meta();

  select id
    into v_active_circuit_id
  from public.circuit_definitions
  where is_active = true
  order by starts_at desc
  limit 1;

  if p_product_code in ('passe_circuito_neon_01', 'premium_circuito_neon_01', 'elite2050_premium_monthly', 'premium_monthly') then
    v_premium := true;
    v_premium_until := coalesce(p_expires_at, now() + interval '90 days');
  elsif p_product_code in ('gold_100', 'elite2050_gold_100') then
    v_gold := 100;
  elsif p_product_code in ('gold_300', 'elite2050_gold_300') then
    v_gold := 300;
  elsif p_product_code in ('gold_700', 'elite2050_gold_700') then
    v_gold := 700;
  elsif p_product_code in ('fragments_25', 'elite2050_fragments_25') then
    v_fragments := 25;
  elsif p_product_code in ('fragments_80', 'elite2050_fragments_80') then
    v_fragments := 80;
  else
    return jsonb_build_object('ok', false, 'reason', 'UNKNOWN_PRODUCT', 'productCode', p_product_code);
  end if;

  insert into public.mobile_purchases (
    user_id,
    provider,
    product_code,
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
    v_user_id,
    'google_play',
    p_product_code,
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
  on conflict (purchase_token) where purchase_token is not null do update
  set order_id = coalesce(excluded.order_id, public.mobile_purchases.order_id),
      status = 'GRANTED',
      purchase_state = excluded.purchase_state,
      acknowledged = true,
      consumed = excluded.consumed,
      expires_at = coalesce(excluded.expires_at, public.mobile_purchases.expires_at),
      raw_payload = excluded.raw_payload,
      updated_at = now();

  update public.profiles_meta
  set gold_balance = gold_balance + v_gold,
      fragment_balance = fragment_balance + v_fragments,
      premium_active = case when v_premium then true else premium_active end,
      premium_source = case when v_premium then 'google_play' else premium_source end,
      premium_until = case when v_premium then greatest(coalesce(premium_until, now()), v_premium_until) else premium_until end,
      current_circuit_id = coalesce(current_circuit_id, v_active_circuit_id),
      updated_at = now()
  where user_id = v_user_id;

  if v_premium and v_active_circuit_id is not null then
    insert into public.user_circuit_progress (
      user_id,
      circuit_id,
      premium_unlocked
    )
    values (
      v_user_id,
      v_active_circuit_id,
      true
    )
    on conflict (user_id, circuit_id) do update
    set premium_unlocked = true,
        updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'productCode', p_product_code,
    'premium', v_premium,
    'premiumUntil', v_premium_until,
    'gold', v_gold,
    'fragments', v_fragments
  );
end;
$$;

grant execute on function public.ensure_user_meta() to authenticated;
grant execute on function public.purchase_catalog_item_with_balance(text) to authenticated;
grant execute on function public.grant_catalog_item(text, text, text) to authenticated;
grant execute on function public.grant_mobile_purchase(text, text, text, text, text, text, timestamptz, jsonb) to authenticated;
