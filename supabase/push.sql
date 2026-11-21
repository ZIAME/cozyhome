-- Cozy Home: run the daily-topic function every 15 minutes. Run this once in the SQL Editor,
-- after deploying the function. Replace the two values in CAPITALS first:
--   YOUR-PROJECT-REF  the part before .supabase.co in your Project URL
--   YOUR-CRON-SECRET  the same CRON_SECRET you saved in Edge Functions → Secrets
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('cozy-daily-topic') where exists (select 1 from cron.job where jobname = 'cozy-daily-topic');
select cron.schedule('cozy-daily-topic', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/daily-topic',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR-CRON-SECRET'),
    body := '{}'::jsonb
  );
$$);
