-- Keep the authoritative clock close to the current civil day while retaining
-- the one-simulated-day-per-invocation Edge compute guard. A delayed world is
-- drained automatically; a current world is a cheap no-op.

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'elite2050-world-clock-runner'
  order by jobid desc
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end;
$$;

select cron.schedule(
  'elite2050-world-clock-runner',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://xebhujvszurydytlrhra.supabase.co/functions/v1/world-clock-runner',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"source":"pg_cron","mode":"continuous_catchup"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

