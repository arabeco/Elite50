-- Elite 2050 world normalization.
-- Phase 1: create relational world tables without removing the legacy games JSONB save.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  legacy_world_id text unique,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Elite 2050',
  status text not null default 'LOBBY',
  phase text not null default 'REGULAR_SEASON',
  current_season integer not null default 2050,
  current_day integer not null default -1,
  current_round integer not null default 1,
  current_game_date timestamptz not null default now(),
  season_start_at timestamptz,
  is_public boolean not null default false,
  join_code text unique,
  rules jsonb not null default '{}'::jsonb,
  source text not null default 'NORMALIZED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.world_participants (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text,
  manager_id text,
  role text not null default 'OBSERVER',
  is_creator boolean not null default false,
  is_observer boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_participants_user_world_key unique (world_id, user_id)
);

create unique index if not exists world_participants_world_team_key
  on public.world_participants(world_id, team_id)
  where team_id is not null;

create table if not exists public.world_managers (
  world_id uuid not null references public.worlds(id) on delete cascade,
  manager_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  district text not null,
  reputation integer not null default 50,
  is_npc boolean not null default true,
  attributes jsonb not null default '{}'::jsonb,
  career jsonb not null default '{}'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (world_id, manager_id)
);

create table if not exists public.world_teams (
  world_id uuid not null references public.worlds(id) on delete cascade,
  team_id text not null,
  name text not null,
  city text,
  district text not null,
  league text not null,
  manager_id text,
  colors jsonb not null default '{}'::jsonb,
  logo jsonb not null default '{}'::jsonb,
  tactics jsonb not null default '{}'::jsonb,
  lineup jsonb not null default '{}'::jsonb,
  squad jsonb not null default '[]'::jsonb,
  chemistry integer not null default 50,
  power_cap integer,
  inventory jsonb not null default '[]'::jsonb,
  titles jsonb not null default '{}'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (world_id, team_id)
);

create table if not exists public.world_players (
  world_id uuid not null references public.worlds(id) on delete cascade,
  player_id text not null,
  name text not null,
  nickname text not null,
  district text not null,
  position text not null,
  role text not null,
  total_rating integer not null default 400 check (total_rating >= 0 and total_rating <= 1000),
  potential integer not null default 600 check (potential >= 0 and potential <= 1000),
  current_phase numeric not null default 6.0,
  contract_team_id text,
  appearance jsonb not null default '{}'::jsonb,
  pentagon jsonb not null default '{}'::jsonb,
  fusion jsonb not null default '{}'::jsonb,
  badges jsonb not null default '{}'::jsonb,
  history jsonb not null default '{}'::jsonb,
  phase_history jsonb not null default '[]'::jsonb,
  satisfaction integer not null default 50 check (satisfaction >= 0 and satisfaction <= 100),
  training_progress integer not null default 0 check (training_progress >= 0 and training_progress <= 100),
  fatigue integer not null default 0 check (fatigue >= 0 and fatigue <= 100),
  achievements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (world_id, player_id)
);

create table if not exists public.world_matches (
  world_id uuid not null references public.worlds(id) on delete cascade,
  match_id text not null,
  season integer not null,
  competition text not null,
  league_id text,
  round integer not null default 1,
  home_team_id text not null,
  away_team_id text not null,
  scheduled_at timestamptz not null,
  match_time text,
  status text not null default 'SCHEDULED',
  played boolean not null default false,
  revealed boolean not null default false,
  home_score integer,
  away_score integer,
  result jsonb,
  events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (world_id, match_id)
);

create table if not exists public.world_standings (
  world_id uuid not null references public.worlds(id) on delete cascade,
  season integer not null,
  league_id text not null,
  team_id text not null,
  points integer not null default 0,
  played integer not null default 0,
  won integer not null default 0,
  drawn integer not null default 0,
  lost integer not null default 0,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  position integer,
  updated_at timestamptz not null default now(),
  primary key (world_id, season, league_id, team_id)
);

create table if not exists public.world_news (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  season integer,
  day integer,
  type text not null default 'SYSTEM',
  title text not null,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.world_user_state (
  world_id uuid not null references public.worlds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notifications jsonb not null default '[]'::jsonb,
  training jsonb not null default '{}'::jsonb,
  last_headline jsonb not null default '{}'::jsonb,
  store_overlay jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

create table if not exists public.world_snapshots (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  reason text not null default 'manual',
  state jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_worlds_creator_user_id on public.worlds(creator_user_id);
create index if not exists idx_worlds_join_code on public.worlds(join_code);
create index if not exists idx_worlds_public_updated_at on public.worlds(is_public, updated_at desc);

create index if not exists idx_world_participants_user_id on public.world_participants(user_id);
create index if not exists idx_world_participants_world_id on public.world_participants(world_id);

create index if not exists idx_world_managers_user_id on public.world_managers(user_id);
create index if not exists idx_world_managers_district on public.world_managers(world_id, district);

create index if not exists idx_world_teams_district on public.world_teams(world_id, district);
create index if not exists idx_world_teams_league on public.world_teams(world_id, league);
create index if not exists idx_world_teams_manager on public.world_teams(world_id, manager_id);

create index if not exists idx_world_players_rating on public.world_players(world_id, total_rating desc);
create index if not exists idx_world_players_role on public.world_players(world_id, role);
create index if not exists idx_world_players_district on public.world_players(world_id, district);
create index if not exists idx_world_players_contract_team on public.world_players(world_id, contract_team_id);
create index if not exists idx_world_players_free_agents on public.world_players(world_id, total_rating desc)
  where contract_team_id is null;

create index if not exists idx_world_matches_season_competition on public.world_matches(world_id, season, competition);
create index if not exists idx_world_matches_scheduled_at on public.world_matches(world_id, scheduled_at);
create index if not exists idx_world_matches_status on public.world_matches(world_id, status);
create index if not exists idx_world_matches_home_team on public.world_matches(world_id, home_team_id);
create index if not exists idx_world_matches_away_team on public.world_matches(world_id, away_team_id);

create index if not exists idx_world_standings_league_points on public.world_standings(world_id, season, league_id, points desc);
create index if not exists idx_world_news_created_at on public.world_news(world_id, created_at desc);
create index if not exists idx_world_news_season_day on public.world_news(world_id, season, day);
create index if not exists idx_world_snapshots_world_created_at on public.world_snapshots(world_id, created_at desc);

create or replace function public.is_world_creator(p_world_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.worlds w
    where w.id = p_world_id
      and w.creator_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.world_participants wp
    where wp.world_id = p_world_id
      and wp.user_id = auth.uid()
      and wp.is_creator = true
  );
$$;

create or replace function public.is_world_participant(p_world_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_world_creator(p_world_id)
  or exists (
    select 1
    from public.world_participants wp
    where wp.world_id = p_world_id
      and wp.user_id = auth.uid()
  );
$$;

create or replace function public.is_world_readable(p_world_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_world_participant(p_world_id)
  or exists (
    select 1
    from public.worlds w
    where w.id = p_world_id
      and w.is_public = true
  );
$$;

alter table public.worlds enable row level security;
alter table public.world_participants enable row level security;
alter table public.world_managers enable row level security;
alter table public.world_teams enable row level security;
alter table public.world_players enable row level security;
alter table public.world_matches enable row level security;
alter table public.world_standings enable row level security;
alter table public.world_news enable row level security;
alter table public.world_user_state enable row level security;
alter table public.world_snapshots enable row level security;

drop policy if exists "worlds_select_readable" on public.worlds;
create policy "worlds_select_readable"
  on public.worlds
  for select
  to authenticated
  using (creator_user_id = auth.uid() or is_public = true or public.is_world_participant(id));

drop policy if exists "worlds_insert_creator" on public.worlds;
create policy "worlds_insert_creator"
  on public.worlds
  for insert
  to authenticated
  with check (creator_user_id = auth.uid());

drop policy if exists "worlds_update_creator" on public.worlds;
create policy "worlds_update_creator"
  on public.worlds
  for update
  to authenticated
  using (creator_user_id = auth.uid() or public.is_world_creator(id))
  with check (creator_user_id = auth.uid() or public.is_world_creator(id));

drop policy if exists "world_participants_select_readable" on public.world_participants;
create policy "world_participants_select_readable"
  on public.world_participants
  for select
  to authenticated
  using (public.is_world_readable(world_id));

drop policy if exists "world_participants_insert_self_or_creator" on public.world_participants;
create policy "world_participants_insert_self_or_creator"
  on public.world_participants
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_world_creator(world_id));

drop policy if exists "world_participants_update_self_or_creator" on public.world_participants;
create policy "world_participants_update_self_or_creator"
  on public.world_participants
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_world_creator(world_id))
  with check (user_id = auth.uid() or public.is_world_creator(world_id));

drop policy if exists "world_managers_select_readable" on public.world_managers;
create policy "world_managers_select_readable"
  on public.world_managers
  for select
  to authenticated
  using (public.is_world_readable(world_id));

drop policy if exists "world_managers_write_creator" on public.world_managers;
create policy "world_managers_write_creator"
  on public.world_managers
  for all
  to authenticated
  using (public.is_world_creator(world_id))
  with check (public.is_world_creator(world_id));

drop policy if exists "world_teams_select_readable" on public.world_teams;
create policy "world_teams_select_readable"
  on public.world_teams
  for select
  to authenticated
  using (public.is_world_readable(world_id));

drop policy if exists "world_teams_write_creator" on public.world_teams;
create policy "world_teams_write_creator"
  on public.world_teams
  for all
  to authenticated
  using (public.is_world_creator(world_id))
  with check (public.is_world_creator(world_id));

drop policy if exists "world_players_select_readable" on public.world_players;
create policy "world_players_select_readable"
  on public.world_players
  for select
  to authenticated
  using (public.is_world_readable(world_id));

drop policy if exists "world_players_write_creator" on public.world_players;
create policy "world_players_write_creator"
  on public.world_players
  for all
  to authenticated
  using (public.is_world_creator(world_id))
  with check (public.is_world_creator(world_id));

drop policy if exists "world_matches_select_readable" on public.world_matches;
create policy "world_matches_select_readable"
  on public.world_matches
  for select
  to authenticated
  using (public.is_world_readable(world_id));

drop policy if exists "world_matches_write_creator" on public.world_matches;
create policy "world_matches_write_creator"
  on public.world_matches
  for all
  to authenticated
  using (public.is_world_creator(world_id))
  with check (public.is_world_creator(world_id));

drop policy if exists "world_standings_select_readable" on public.world_standings;
create policy "world_standings_select_readable"
  on public.world_standings
  for select
  to authenticated
  using (public.is_world_readable(world_id));

drop policy if exists "world_standings_write_creator" on public.world_standings;
create policy "world_standings_write_creator"
  on public.world_standings
  for all
  to authenticated
  using (public.is_world_creator(world_id))
  with check (public.is_world_creator(world_id));

drop policy if exists "world_news_select_readable" on public.world_news;
create policy "world_news_select_readable"
  on public.world_news
  for select
  to authenticated
  using (public.is_world_readable(world_id));

drop policy if exists "world_news_write_creator" on public.world_news;
create policy "world_news_write_creator"
  on public.world_news
  for all
  to authenticated
  using (public.is_world_creator(world_id))
  with check (public.is_world_creator(world_id));

drop policy if exists "world_user_state_select_self_or_creator" on public.world_user_state;
create policy "world_user_state_select_self_or_creator"
  on public.world_user_state
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_world_creator(world_id));

drop policy if exists "world_user_state_write_self_or_creator" on public.world_user_state;
create policy "world_user_state_write_self_or_creator"
  on public.world_user_state
  for all
  to authenticated
  using (user_id = auth.uid() or public.is_world_creator(world_id))
  with check (user_id = auth.uid() or public.is_world_creator(world_id));

drop policy if exists "world_snapshots_select_creator" on public.world_snapshots;
create policy "world_snapshots_select_creator"
  on public.world_snapshots
  for select
  to authenticated
  using (public.is_world_creator(world_id));

drop policy if exists "world_snapshots_insert_creator" on public.world_snapshots;
create policy "world_snapshots_insert_creator"
  on public.world_snapshots
  for insert
  to authenticated
  with check (public.is_world_creator(world_id));

drop trigger if exists touch_worlds_updated_at on public.worlds;
create trigger touch_worlds_updated_at
  before update on public.worlds
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_world_participants_updated_at on public.world_participants;
create trigger touch_world_participants_updated_at
  before update on public.world_participants
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_world_managers_updated_at on public.world_managers;
create trigger touch_world_managers_updated_at
  before update on public.world_managers
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_world_teams_updated_at on public.world_teams;
create trigger touch_world_teams_updated_at
  before update on public.world_teams
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_world_players_updated_at on public.world_players;
create trigger touch_world_players_updated_at
  before update on public.world_players
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_world_matches_updated_at on public.world_matches;
create trigger touch_world_matches_updated_at
  before update on public.world_matches
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_world_standings_updated_at on public.world_standings;
create trigger touch_world_standings_updated_at
  before update on public.world_standings
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_world_user_state_updated_at on public.world_user_state;
create trigger touch_world_user_state_updated_at
  before update on public.world_user_state
  for each row execute function public.touch_updated_at();

grant execute on function public.is_world_creator(uuid) to authenticated;
grant execute on function public.is_world_participant(uuid) to authenticated;
grant execute on function public.is_world_readable(uuid) to authenticated;
