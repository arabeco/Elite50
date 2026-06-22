-- Keeps long-save district rotation explicit in normalized world tables.
-- Existing rows use the current district as their origin until a future save writes origin_district.

alter table public.world_players
  add column if not exists origin_district text;

alter table public.world_teams
  add column if not exists origin_district text,
  add column if not exists stadium jsonb not null default '{}'::jsonb;

alter table public.world_managers
  add column if not exists origin_district text;

update public.world_players
set origin_district = district
where origin_district is null;

update public.world_teams
set origin_district = district
where origin_district is null;

update public.world_managers
set origin_district = district
where origin_district is null;

alter table public.world_players
  alter column origin_district set not null;

alter table public.world_teams
  alter column origin_district set not null;

alter table public.world_managers
  alter column origin_district set not null;
