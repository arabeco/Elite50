create or replace function public.grant_season_completion_rewards(
  p_season integer,
  p_gold integer,
  p_fragments integer default 0,
  p_reason jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_active_circuit_id text;
  v_profile public.profiles_meta%rowtype;
  v_reward_key text;
  v_final_fragments integer;
  v_existing_claim boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_season is null then
    raise exception 'SEASON_REQUIRED';
  end if;

  if p_gold < 0 or p_gold > 250 then
    raise exception 'INVALID_GOLD_AMOUNT';
  end if;

  if p_fragments < 0 or p_fragments > 40 then
    raise exception 'INVALID_FRAGMENT_AMOUNT';
  end if;

  perform public.ensure_user_meta();

  select *
    into v_profile
  from public.profiles_meta
  where user_id = v_user_id
  limit 1;

  select id
    into v_active_circuit_id
  from public.circuit_definitions
  where is_active = true
  order by starts_at desc
  limit 1;

  v_reward_key := 'season_reward_' || p_season::text;
  v_final_fragments := p_fragments + case when coalesce(v_profile.premium_active, false) then 4 else 0 end;

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

    select exists (
      select 1
      from public.user_circuit_progress ucp,
      lateral jsonb_array_elements(ucp.reward_claims) claim
      where ucp.user_id = v_user_id
        and ucp.circuit_id = v_active_circuit_id
        and claim->>'key' = v_reward_key
    )
    into v_existing_claim;

    if v_existing_claim then
      return jsonb_build_object(
        'ok', false,
        'reason', 'ALREADY_GRANTED',
        'season', p_season
      );
    end if;
  end if;

  update public.profiles_meta
  set gold_balance = gold_balance + p_gold,
      fragment_balance = fragment_balance + v_final_fragments,
      updated_at = now()
  where user_id = v_user_id;

  if v_active_circuit_id is not null then
    update public.user_circuit_progress
    set season_runs_completed = season_runs_completed + 1,
        reward_claims = reward_claims || jsonb_build_array(
          jsonb_build_object(
            'key', v_reward_key,
            'type', 'SEASON_COMPLETION',
            'season', p_season,
            'gold', p_gold,
            'fragments', v_final_fragments,
            'premiumBonusFragments', case when coalesce(v_profile.premium_active, false) then 4 else 0 end,
            'reason', p_reason,
            'claimedAt', now()
          )
        ),
        updated_at = now()
    where user_id = v_user_id
      and circuit_id = v_active_circuit_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'season', p_season,
    'gold', p_gold,
    'fragments', v_final_fragments,
    'premiumBonusFragments', case when coalesce(v_profile.premium_active, false) then 4 else 0 end
  );
end;
$$;

grant execute on function public.grant_season_completion_rewards(integer, integer, integer, jsonb) to authenticated;
