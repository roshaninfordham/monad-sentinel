alter table public.sessions
  add column if not exists retention_minutes integer not null default 30,
  add column if not exists expires_at timestamptz not null default (now() + interval '30 minutes');

create index if not exists sessions_expires_at_idx
  on public.sessions(expires_at);

create or replace function public.cleanup_expired_demo_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with deleted as (
    delete from public.sessions
    where expires_at <= now()
    returning id
  )
  select count(*) into deleted_count from deleted;

  return coalesce(deleted_count, 0);
end;
$$;

comment on column public.sessions.retention_minutes is
  'Demo retention window in minutes. Default is 30 minutes for live QR sessions.';

comment on column public.sessions.expires_at is
  'Timestamp when demo session data is eligible for deletion by opportunistic cleanup.';
