create table store_private.staff_invitations (
  email text primary key check (email=lower(email)), role text not null check (role in ('owner','manager')),
  expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);
alter table store_private.staff_invitations enable row level security;
grant all on store_private.staff_invitations to service_role;
create index staff_invitation_user_idx on store_private.staff_invitations(accepted_by);
create function store_private.accept_staff_invitation() returns boolean language plpgsql
security definer set search_path = '' as $$
declare account record; invitation store_private.staff_invitations%rowtype;
begin
  if auth.uid() is null then return false; end if;
  if store_private.is_staff() then return true; end if;
  select id,email,email_confirmed_at into account from auth.users where id=auth.uid();
  if not found or account.email_confirmed_at is null then return false; end if;
  select * into invitation from store_private.staff_invitations where email=lower(account.email)
    and accepted_at is null and expires_at>now() for update;
  if not found then return false; end if;
  insert into store_private.staff(user_id,role) values(account.id,invitation.role) on conflict(user_id) do nothing;
  update store_private.staff_invitations set accepted_at=now(),accepted_by=account.id where email=invitation.email;
  return store_private.is_staff();
end $$;
revoke all on function store_private.accept_staff_invitation() from public,anon;
grant execute on function store_private.accept_staff_invitation() to authenticated;
create function public.store_accept_staff_invitation() returns boolean language sql
security invoker set search_path = '' as $$ select store_private.accept_staff_invitation(); $$;
revoke all on function public.store_accept_staff_invitation() from public,anon;
grant execute on function public.store_accept_staff_invitation() to authenticated;
