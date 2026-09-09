create type public.invitation_status as enum ('shared', 'opened', 'accepted', 'responded');

create table public.ralli_invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  ralli_id uuid not null references public.rallis(id) on delete cascade,
  response_id uuid references public.responses(id) on delete set null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete set null,
  status public.invitation_status not null default 'shared',
  opened_at timestamptz,
  accepted_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index ralli_invitations_sender_idx on public.ralli_invitations(sender_id, created_at desc);
create index ralli_invitations_recipient_idx on public.ralli_invitations(recipient_id, created_at desc);
alter table public.ralli_invitations enable row level security;
create policy "Invitation participants read invitations" on public.ralli_invitations for select to authenticated
using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
grant select on public.ralli_invitations to authenticated;

alter table public.ralli_passes add column invitation_id uuid unique references public.ralli_invitations(id) on delete set null;

create or replace function public.create_ralli_invitation(target_ralli uuid, source_response uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare invitation public.ralli_invitations;
begin
  if auth.uid() is null or not public.has_verified_nimiq_address(auth.uid()) then raise exception 'VERIFIED_USER_REQUIRED'; end if;
  if not exists (select 1 from public.rallis r where r.id = target_ralli and r.status = 'active' and r.ends_at > now()) then raise exception 'RALLI_UNAVAILABLE'; end if;
  if source_response is not null and not exists (select 1 from public.responses x where x.id = source_response and x.ralli_id = target_ralli) then raise exception 'INVALID_RESPONSE'; end if;
  insert into public.ralli_invitations (ralli_id, response_id, sender_id) values (target_ralli, source_response, auth.uid()) returning * into invitation;
  insert into public.ralli_passes (ralli_id, response_id, passed_by, invitation_id) values (target_ralli, source_response, auth.uid(), invitation.id);
  return invitation.token;
end; $$;

create or replace function public.open_ralli_invitation(invite_token text)
returns table(ralli_id uuid, prompt text, sender_name text, status public.invitation_status)
language plpgsql security definer set search_path = '' as $$
begin
  update public.ralli_invitations i set status = case when i.status = 'shared' then 'opened' else i.status end,
    opened_at = coalesce(i.opened_at, now()) where i.token = invite_token;
  return query select i.ralli_id, r.prompt, p.display_name, i.status
    from public.ralli_invitations i join public.rallis r on r.id = i.ralli_id join public.profiles p on p.id = i.sender_id
    where i.token = invite_token;
end; $$;

create or replace function public.accept_ralli_invitation(invite_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.ralli_invitations;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.ralli_invitations i set recipient_id = coalesce(i.recipient_id, auth.uid()), status = 'accepted',
    opened_at = coalesce(i.opened_at, now()), accepted_at = coalesce(i.accepted_at, now())
    where i.token = invite_token and (i.recipient_id is null or i.recipient_id = auth.uid()) returning * into invitation;
  if invitation.id is null then raise exception 'INVITATION_UNAVAILABLE'; end if;
  if invitation.sender_id <> auth.uid() then
    insert into public.activity_events(user_id, actor_id, ralli_id, response_id, kind, payload)
    values(auth.uid(), invitation.sender_id, invitation.ralli_id, invitation.response_id, 'invitation', jsonb_build_object('token', invite_token));
  end if;
  return invitation.ralli_id;
end; $$;

grant execute on function public.create_ralli_invitation(uuid, uuid) to authenticated;
grant execute on function public.open_ralli_invitation(text) to anon, authenticated;
grant execute on function public.accept_ralli_invitation(text) to authenticated;

create or replace function public.complete_accepted_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare invitation public.ralli_invitations;
begin
  select * into invitation from public.ralli_invitations i where i.ralli_id = new.ralli_id and i.recipient_id = new.author_id
    and i.status = 'accepted' order by i.accepted_at desc limit 1 for update;
  if invitation.id is not null then
    update public.ralli_invitations set status = 'responded', responded_at = now() where id = invitation.id;
    if invitation.sender_id <> new.author_id then
      insert into public.activity_events(user_id, actor_id, ralli_id, response_id, kind, payload)
      values(invitation.sender_id, new.author_id, new.ralli_id, new.id, 'invitation_response', jsonb_build_object('invitation_id', invitation.id));
    end if;
  end if;
  return new;
end; $$;
create trigger accepted_invitation_response after insert on public.responses for each row execute function public.complete_accepted_invitation();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_events') then
    alter publication supabase_realtime add table public.activity_events;
  end if;
end $$;
