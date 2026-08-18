-- Terceiro e ultimo fluxo bloqueado para participantes: responder proposta de clube.
--
-- Assim como o convite da Copa dos Distritos e a candidatura, `world.clubOffers` mora
-- no world_state, que saveGameState substitui pelo do criador quando isCreator e
-- false. Resultado torto: ao aceitar, o participante ASSUMIA o clube de verdade
-- (userTeamId e teams_data sao colunas proprias e persistem), mas o status da
-- proposta continuava PENDING no mundo do criador e podia reaparecer.
--
-- Esta RPC cuida somente da parte que vive no world_state: o status das ofertas.
-- A troca de comando em si (manager, time, carreira) continua sendo persistida pelo
-- save normal, via colunas proprias, e o merge de loadGameState ja faz a versao do
-- participante vencer para o proprio time e o proprio manager.

create or replace function public.respond_club_offer(
  p_world_id text,
  p_offer_id text,
  p_accept   boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id     uuid := auth.uid();
  v_master      public.games%rowtype;
  v_world       jsonb;
  v_offers      jsonb;
  v_offer       jsonb;
  v_idx         integer;
  v_status      text;
  v_novo_status text;
  v_current_day integer;
  v_available   integer;
  v_now         text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  v_master := public.lock_world_master(p_world_id);

  v_world  := coalesce(v_master.world_state, '{}'::jsonb);
  v_offers := coalesce(v_world->'clubOffers', '[]'::jsonb);

  select ord - 1, elem
    into v_idx, v_offer
  from jsonb_array_elements(v_offers) with ordinality as t(elem, ord)
  where elem->>'id' = p_offer_id
  limit 1;

  if v_offer is null then
    raise exception 'OFFER_NOT_FOUND';
  end if;

  if v_offer->>'targetUserId' is distinct from v_user_id::text then
    raise exception 'OFFER_NOT_YOURS';
  end if;

  v_status := coalesce(v_offer->>'status', '');

  if p_accept then
    -- Espelha a regra do cliente: so assina o que o clube ja aceitou.
    if v_status <> 'ACCEPTED' then
      raise exception 'OFFER_NOT_SIGNABLE';
    end if;

    v_current_day := coalesce(nullif(v_world->>'currentDay', '')::integer, 0);
    v_available   := coalesce(nullif(v_offer->>'availableOnDay', '')::integer, 0);

    if v_current_day < v_available then
      raise exception 'SIGNING_NOT_RELEASED_YET';
    end if;

    v_novo_status := 'SIGNED';
  else
    if v_status not in ('PENDING', 'ACCEPTED', 'WAITING_NEXT_SEASON') then
      raise exception 'OFFER_NOT_OPEN';
    end if;

    v_novo_status := 'REJECTED';
  end if;

  v_offers := jsonb_set(v_offers, array[v_idx::text, 'status'], to_jsonb(v_novo_status));
  v_offers := jsonb_set(v_offers, array[v_idx::text, 'respondedAt'], to_jsonb(v_now));
  v_offers := jsonb_set(v_offers, array[v_idx::text, 'note'],
                        to_jsonb((case when p_accept
                          then 'Contrato assinado.'
                          else 'Voce recusou a proposta.'
                        end)::text));

  -- Ao assinar, as outras negociacoes abertas deste usuario caem.
  if p_accept then
    select coalesce(
      jsonb_agg(
        case
          when elem->>'id' <> p_offer_id
           and elem->>'targetUserId' = v_user_id::text
           and elem->>'status' in ('PENDING', 'ACCEPTED')
          then elem
               || jsonb_build_object('status', 'EXPIRED')
               || jsonb_build_object('respondedAt', v_now)
               || jsonb_build_object('note', 'Outra assinatura foi concluida.')
          else elem
        end
        order by ord
      ),
      '[]'::jsonb
    )
      into v_offers
    from jsonb_array_elements(v_offers) with ordinality as t(elem, ord);
  end if;

  v_world := jsonb_set(v_world, '{clubOffers}', v_offers, true);

  update public.games
     set world_state = v_world
   where user_id = v_master.user_id
     and world_id = p_world_id
     and is_creator is true;

  return jsonb_build_object('ok', true, 'status', v_novo_status);
end;
$fn$;

revoke all on function public.respond_club_offer(text, text, boolean) from public;
revoke all on function public.respond_club_offer(text, text, boolean) from anon;
grant execute on function public.respond_club_offer(text, text, boolean) to authenticated;

comment on function public.respond_club_offer(text, text, boolean) is
  'Participante responde proposta de clube escrevendo apenas clubOffers no world_state do criador. Serializa com FOR UPDATE via lock_world_master.';
