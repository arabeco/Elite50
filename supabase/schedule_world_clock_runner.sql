-- Run this after deploying the Edge Function:
--   supabase functions deploy world-clock-runner --no-verify-jwt
--
-- Replace PROJECT_REF before running if you paste this in SQL Editor.
-- The function is idempotent and can run every minute.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_jobid bigint;
begin
  select jobid
  into v_jobid
  from cron.job
  where jobname = 'elite2050-world-clock-runner'
  limit 1;

  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
end $$;

select cron.schedule(
  'elite2050-world-clock-runner',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://PROJECT_REF.supabase.co/functions/v1/world-clock-runner',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"source":"pg_cron"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $$
);

-- Optional immediate run after scheduling:
select net.http_post(
  url := 'https://PROJECT_REF.supabase.co/functions/v1/world-clock-runner',
  headers := '{"Content-Type":"application/json"}'::jsonb,
  body := '{"source":"manual"}'::jsonb,
  timeout_milliseconds := 60000
);
