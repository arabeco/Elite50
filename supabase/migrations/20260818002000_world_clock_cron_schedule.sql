-- Reduz o cron do world-clock-runner de 1x/minuto para 5x/dia.
--
-- POR QUE ISSO E SEGURO:
--
-- O runner so tem dois trabalhos, e os dois acontecem a meia-noite:
--
--   1. Virada de dia. getDueDays() compara getCivilDayIndex(now) com o do ultimo
--      tick, em America/Sao_Paulo. O mundo so avanca quando a DATA CIVIL muda —
--      ou seja, no maximo uma vez por dia, a meia-noite de Brasilia.
--
--   2. Abertura de kickoff agendado. startScheduledAt e sempre
--      getNextRealMidnight(), isto e, meia-noite local do criador.
--
-- Rodando a cada minuto, 1439 das 1440 execucoes diarias nao tinham nada a fazer —
-- e cada uma ainda pagava o custo de get_due_legacy_world_ids(), que precisa
-- destoastar ~1,6 MB de world_state por mundo so para ler `status` e `currentDay`.
--
-- Horarios (UTC; BRT = UTC-3, sem horario de verao):
--   03:05 UTC = 00:05 BRT  -> execucao principal, logo apos a virada
--   04:05 UTC = 01:05 BRT  -> retry curto
--   09:05 UTC = 06:05 BRT  -> retry
--   15:05 UTC = 12:05 BRT  -> retry
--   21:05 UTC = 18:05 BRT  -> retry
--
-- Os retries sao seguros porque getDueDays e idempotente: se o mundo ja avancou
-- hoje, o runner encontra 0 dias devidos, nao escreve nada e retorna.
--
-- LIMITACAO CONHECIDA: um criador em outro fuso agenda kickoff para a meia-noite
-- DELE. Com 5 janelas por dia, o atraso maximo de abertura passa a ser ~6h.
-- Para um app com base no Brasil isso e aceitavel; se virar problema, adicione
-- janelas em vez de voltar para 1x/minuto.

do $$
declare
  v_jobid   bigint;
  v_command text;
  v_jobname text;
begin
  -- Preserva o comando existente (contem a URL da function e o header do secret).
  select jobid, command, jobname
    into v_jobid, v_command, v_jobname
  from cron.job
  where command ilike '%world-clock-runner%'
  order by jobid
  limit 1;

  if v_jobid is null then
    raise notice 'Nenhum cron job do world-clock-runner encontrado; nada a fazer.';
    return;
  end if;

  raise notice 'Reagendando job % (%): 1x/minuto -> 5x/dia', v_jobid, v_jobname;

  perform cron.unschedule(v_jobid);

  perform cron.schedule(
    coalesce(v_jobname, 'elite2050-world-clock-runner'),
    '5 3,4,9,15,21 * * *',
    v_command
  );
end $$;
