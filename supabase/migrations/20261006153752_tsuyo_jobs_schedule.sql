-- Supabase-hosted scheduler; credentials are resolved from Vault, never embedded in job SQL.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $$ begin
  if not exists(select 1 from vault.secrets where name='tsuyo_job_secret') then
    perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'tsuyo_job_secret');
  end if;
end $$;
select cron.schedule('tsuyo-store-maintenance','*/5 * * * *', $job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='tsuyo_store_api_url')||'/functions/v1/store-jobs',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='tsuyo_job_secret')),
    body:='{}'::jsonb
  ) where exists(select 1 from vault.secrets where name='tsuyo_store_api_url');
$job$);
