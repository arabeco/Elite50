create table if not exists public.manager_profiles_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Manager Elite',
  preferred_play_style text not null default 'Equilibrado',
  evolution integer not null default 50 check (evolution between 0 and 100),
  negotiation integer not null default 50 check (negotiation between 0 and 100),
  scout integer not null default 50 check (scout between 0 and 100),
  origin_trait_id text not null default 'trait_cold_negotiator',
  owned_trait_ids text[] not null default array['trait_cold_negotiator']::text[],
  equipped_trait_ids text[] not null default array['trait_cold_negotiator']::text[],
  career_titles_total integer not null default 0,
  worlds_played integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.manager_profiles_meta enable row level security;

drop policy if exists "manager_profiles_meta_select_own" on public.manager_profiles_meta;
create policy "manager_profiles_meta_select_own"
  on public.manager_profiles_meta
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "manager_profiles_meta_insert_own" on public.manager_profiles_meta;
create policy "manager_profiles_meta_insert_own"
  on public.manager_profiles_meta
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "manager_profiles_meta_update_own" on public.manager_profiles_meta;
create policy "manager_profiles_meta_update_own"
  on public.manager_profiles_meta
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.ensure_manager_profile_meta()
returns public.manager_profiles_meta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.manager_profiles_meta;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.manager_profiles_meta (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_row
  from public.manager_profiles_meta
  where user_id = v_user_id;

  return v_row;
end;
$$;

create or replace function public.upsert_manager_profile_meta(
  p_display_name text default null,
  p_preferred_play_style text default null,
  p_evolution integer default null,
  p_negotiation integer default null,
  p_scout integer default null,
  p_origin_trait_id text default null,
  p_owned_trait_ids text[] default null,
  p_equipped_trait_ids text[] default null,
  p_career_titles_total integer default null,
  p_worlds_played integer default null
)
returns public.manager_profiles_meta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.manager_profiles_meta;
  v_owned text[];
  v_equipped text[];
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  perform public.ensure_manager_profile_meta();

  v_owned := coalesce(
    (select array_agg(distinct item) from unnest(p_owned_trait_ids) as item where item is not null and length(item) > 0),
    null
  );
  v_equipped := coalesce(
    (select array_agg(distinct item) from unnest(p_equipped_trait_ids) as item where item is not null and length(item) > 0),
    null
  );

  update public.manager_profiles_meta
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    preferred_play_style = coalesce(nullif(trim(p_preferred_play_style), ''), preferred_play_style),
    evolution = coalesce(least(100, greatest(0, p_evolution)), evolution),
    negotiation = coalesce(least(100, greatest(0, p_negotiation)), negotiation),
    scout = coalesce(least(100, greatest(0, p_scout)), scout),
    origin_trait_id = coalesce(nullif(trim(p_origin_trait_id), ''), origin_trait_id),
    owned_trait_ids = coalesce(v_owned, owned_trait_ids),
    equipped_trait_ids = coalesce(v_equipped, equipped_trait_ids),
    career_titles_total = coalesce(greatest(0, p_career_titles_total), career_titles_total),
    worlds_played = coalesce(greatest(0, p_worlds_played), worlds_played),
    updated_at = now()
  where user_id = v_user_id
  returning *
  into v_row;

  return v_row;
end;
$$;

grant execute on function public.ensure_manager_profile_meta() to authenticated;
grant execute on function public.upsert_manager_profile_meta(text, text, integer, integer, integer, text, text[], text[], integer, integer) to authenticated;
