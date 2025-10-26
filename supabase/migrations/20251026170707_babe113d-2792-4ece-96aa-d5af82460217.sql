-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule check-overdue-debts to run daily at 09:00
SELECT cron.schedule(
  'check-overdue-debts-daily',
  '0 9 * * *', -- Every day at 09:00
  $$
  SELECT
    net.http_post(
        url:='https://cywngfflmpdpuqaigsjc.supabase.co/functions/v1/check-overdue-debts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5d25nZmZsbXBkcHVxYWlnc2pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjUyMTQsImV4cCI6MjA2NDcwMTIxNH0.-fFn7DEY-XDxf3LwNkSFJJuMTT1Mrd4Qbs7Hims-w_g"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);