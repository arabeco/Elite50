create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  world_id text,
  user_team_id text,
  user_manager_id text,
  current_tab text not null,
  current_day integer,
  current_season integer,
  category text not null check (category in ('bug', 'confusing', 'balance', 'visual', 'other')),
  message text not null check (char_length(trim(message)) >= 8),
  user_agent text,
  url text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_reports_world_created
  on public.feedback_reports (world_id, created_at desc);

create index if not exists idx_feedback_reports_user_created
  on public.feedback_reports (user_id, created_at desc);

alter table public.feedback_reports enable row level security;

drop policy if exists feedback_reports_insert_own on public.feedback_reports;
create policy feedback_reports_insert_own
on public.feedback_reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists feedback_reports_select_own on public.feedback_reports;
create policy feedback_reports_select_own
on public.feedback_reports
for select
to authenticated
using (auth.uid() = user_id);

-- Run this query in Supabase to see incoming test feedback:
-- select category, current_tab, current_day, message, created_at
-- from public.feedback_reports
-- order by created_at desc
-- limit 50;
