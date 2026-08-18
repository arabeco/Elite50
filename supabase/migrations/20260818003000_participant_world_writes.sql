-- Permite que PARTICIPANTES (nao criadores) apliquem escritas pontuais no mundo.
--
-- PROBLEMA QUE ISTO RESOLVE
--
-- src/lib/supabase.ts saveGameState() troca worldStateToSave pelo world_state do
-- criador quando isCreator e false. Isso protege o mundo de ser sobrescrito por um
-- participante com estado defasado, mas tem um efeito colateral: TODA mudanca de
-- nivel de mundo feita por participante e descartada em silencio.
--
-- Na pratica, so o criador conseguia aceitar convite para comandar uma selecao na
-- Copa dos Distritos. Para os demais humanos o fluxo era decorativo: a tela mostrava
-- "aceito", o save descartava, e no dia 19 o convite expirava como "sem resposta".
--
-- A solucao e a mesma ja usada por join_world_by_code: funcoes security definer que
-- validam a operacao e aplicam apenas o trecho do JSONB que mudou, direto na linha
-- mestre. O participante nunca escreve o world_state inteiro.
--
-- CONCORRENCIA: cada funcao trava a linha mestre com FOR UPDATE antes de ler o
-- world_state, entao dois humanos respondendo ao mesmo tempo sao serializados e o
-- segundo enxerga o resultado do primeiro.

-- Garante que o usuario atual participa do mundo e devolve a linha mestre travada.
create or replace function public.lock_world_master(p_world_id text)
returns public.games
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_master  public.games%rowtype;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.games g
    where g.world_id = p_world_id and g.user_id = v_user_id
  ) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;

  select * into v_master
  from public.games
  where world_id = p_world_id and is_creator is true
  for update;

  if not found then
    raise exception 'WORLD_NOT_FOUND';
  end if;

  return v_master;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Copa dos Distritos: responder convite para comandar uma selecao.
-- ---------------------------------------------------------------------------
create or replace function public.respond_district_cup_invite(
  p_world_id  text,
  p_invite_id text,
  p_accept    boolean
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
  v_invites     jsonb;
  v_invite      jsonb;
  v_idx         integer;
  v_district    text;
  v_manager_id  text;
  v_assignments jsonb;
  v_now         text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  v_master := public.lock_world_master(p_world_id);

  v_world   := coalesce(v_master.world_state, '{}'::jsonb);
  v_invites := coalesce(v_world->'districtCup'->'managerInvites', '[]'::jsonb);

  select ord - 1, elem
    into v_idx, v_invite
  from jsonb_array_elements(v_invites) with ordinality as t(elem, ord)
  where elem->>'id' = p_invite_id
  limit 1;

  if v_invite is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  if coalesce(v_invite->>'status', '') <> 'PENDING' then
    raise exception 'INVITE_NOT_PENDING';
  end if;

  v_manager_id := v_invite->>'managerId';
  v_district   := v_invite->>'district';

  -- O convite tem que pertencer ao manager DESTE usuario neste mundo.
  if not exists (
    select 1 from public.games g
    where g.world_id = p_world_id
      and g.user_id = v_user_id
      and g.user_manager_id = v_manager_id
  ) then
    raise exception 'INVITE_NOT_YOURS';
  end if;

  v_assignments := coalesce(v_world->'districtCup'->'managerAssignments', '{}'::jsonb);

  if p_accept then
    -- Conflito: outro tecnico ja assumiu esta selecao.
    if v_assignments ? v_district and v_assignments->>v_district <> v_manager_id then
      raise exception 'DISTRICT_ALREADY_ASSIGNED';
    end if;

    -- Conflito: este tecnico ja comanda outra selecao.
    if exists (
      select 1
      from jsonb_each_text(v_assignments) as a(district, manager_id)
      where a.manager_id = v_manager_id and a.district <> v_district
    ) then
      raise exception 'MANAGER_ALREADY_ASSIGNED';
    end if;
  end if;

  v_invites := jsonb_set(v_invites, array[v_idx::text, 'status'],
                         to_jsonb(case when p_accept then 'ACCEPTED' else 'REJECTED' end));
  v_invites := jsonb_set(v_invites, array[v_idx::text, 'respondedAt'], to_jsonb(v_now));
  v_invites := jsonb_set(v_invites, array[v_idx::text, 'note'],
                         to_jsonb(case when p_accept
                           then format('Contrato aceito para comandar a Selecao %s.', v_district)
                           else format('Convite recusado. A federacao %s chamou o proximo nome.', v_district)
                         end));

  -- jsonb_set so cria a ultima chave do caminho: garante o objeto intermediario.
  if v_world->'districtCup' is null then
    v_world := jsonb_set(v_world, '{districtCup}', '{}'::jsonb, true);
  end if;

  v_world := jsonb_set(v_world, '{districtCup,managerInvites}', v_invites, true);

  if p_accept then
    v_assignments := jsonb_set(v_assignments, array[v_district], to_jsonb(v_manager_id), true);
  else
    v_assignments := v_assignments - v_district;
  end if;

  v_world := jsonb_set(v_world, '{districtCup,managerAssignments}', v_assignments, true);

  update public.games
     set world_state = v_world
   where user_id = v_master.user_id
     and world_id = p_world_id
     and is_creator is true;

  return jsonb_build_object(
    'ok', true,
    'district', v_district,
    'status', case when p_accept then 'ACCEPTED' else 'REJECTED' end
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Candidatura a um clube (entra na fila de clubOffers do mundo).
-- ---------------------------------------------------------------------------
create or replace function public.submit_club_application(
  p_world_id         text,
  p_team_id          text,
  p_manager_name     text,
  p_status           text,
  p_available_on_day integer,
  p_note             text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id    uuid := auth.uid();
  v_master     public.games%rowtype;
  v_world      jsonb;
  v_offers     jsonb;
  v_manager_id text;
  v_offer      jsonb;
  v_now        text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if p_status not in ('PENDING', 'WAITING_NEXT_SEASON') then
    raise exception 'INVALID_STATUS';
  end if;

  v_master := public.lock_world_master(p_world_id);

  v_world  := coalesce(v_master.world_state, '{}'::jsonb);
  v_offers := coalesce(v_world->'clubOffers', '[]'::jsonb);

  select g.user_manager_id into v_manager_id
  from public.games g
  where g.world_id = p_world_id and g.user_id = v_user_id;

  -- Uma negociacao aberta por clube, por usuario.
  if exists (
    select 1
    from jsonb_array_elements(v_offers) as o(elem)
    where o.elem->>'targetUserId' = v_user_id::text
      and o.elem->>'teamId' = p_team_id
      and o.elem->>'status' in ('PENDING', 'ACCEPTED', 'WAITING_NEXT_SEASON')
  ) then
    raise exception 'APPLICATION_ALREADY_OPEN';
  end if;

  v_offer := jsonb_build_object(
    'id', format('application_%s_%s', (extract(epoch from now()) * 1000)::bigint, p_team_id),
    'teamId', p_team_id,
    'targetUserId', v_user_id::text,
    'managerId', v_manager_id,
    'managerName', p_manager_name,
    'source', 'APPLICATION',
    'status', p_status,
    'createdAt', coalesce(v_world->>'currentDate', v_now),
    'availableOnDay', p_available_on_day,
    'note', p_note
  );

  -- unshift: a candidatura nova entra no topo da fila.
  v_world := jsonb_set(v_world, '{clubOffers}', jsonb_build_array(v_offer) || v_offers, true);

  update public.games
     set world_state = v_world
   where user_id = v_master.user_id
     and world_id = p_world_id
     and is_creator is true;

  return jsonb_build_object('ok', true, 'offer', v_offer);
end;
$fn$;

revoke all on function public.lock_world_master(text) from public;
revoke all on function public.lock_world_master(text) from anon;
revoke all on function public.lock_world_master(text) from authenticated;

revoke all on function public.respond_district_cup_invite(text, text, boolean) from public;
revoke all on function public.respond_district_cup_invite(text, text, boolean) from anon;
revoke all on function public.submit_club_application(text, text, text, text, integer, text) from public;
revoke all on function public.submit_club_application(text, text, text, text, integer, text) from anon;

grant execute on function public.respond_district_cup_invite(text, text, boolean) to authenticated;
grant execute on function public.submit_club_application(text, text, text, text, integer, text) to authenticated;

comment on function public.respond_district_cup_invite(text, text, boolean) is
  'Participante responde convite da Copa dos Distritos escrevendo apenas o trecho do world_state do criador. Serializa com FOR UPDATE.';
comment on function public.submit_club_application(text, text, text, text, integer, text) is
  'Participante entra na fila de clubOffers do mundo sem sobrescrever o world_state inteiro.';
