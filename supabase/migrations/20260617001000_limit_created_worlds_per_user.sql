-- Limit legacy JSON worlds so one user cannot create unlimited 1000-player saves.
alter table public.games
  add column if not exists is_creator boolean default true;

create or replace function public.enforce_created_world_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  created_world_count integer;
  max_created_worlds constant integer := 5;
begin
  if coalesce(new.is_creator, true) is not true then
    return new;
  end if;

  select count(distinct world_id)
    into created_world_count
  from public.games
  where user_id = new.user_id
    and world_id <> new.world_id
    and coalesce(is_creator, true) = true;

  if created_world_count >= max_created_worlds then
    raise exception 'created world limit reached (% worlds per user)', max_created_worlds
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_created_world_limit_before_write on public.games;
create trigger enforce_created_world_limit_before_write
  before insert or update of is_creator, user_id, world_id
  on public.games
  for each row
  execute function public.enforce_created_world_limit();
