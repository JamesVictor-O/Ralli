-- Ralli backend foundation: social graph, Nimiq ledger, RLS, and media storage.
create extension if not exists pgcrypto with schema extensions;

create type public.ralli_status as enum ('draft', 'active', 'judging', 'settled', 'cancelled');
create type public.response_format as enum ('text', 'photo', 'video');
create type public.response_status as enum ('published', 'hidden', 'winner');
create type public.contribution_kind as enum ('creator_reward', 'boost');
create type public.transaction_status as enum ('pending', 'confirmed', 'failed', 'refunded');
create type public.settlement_status as enum ('pending', 'paying', 'paid', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default 'New Ralli',
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_path text,
  nimiq_address text unique,
  nimiq_address_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_address_is_present check (nimiq_address_verified_at is null or nimiq_address is not null)
);

create table public.rallis (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  prompt text not null check (char_length(prompt) between 8 and 180),
  description text not null default '' check (char_length(description) <= 1200),
  category text not null default 'Just for fun' check (char_length(category) <= 60),
  response_formats public.response_format[] not null default array['photo'::public.response_format, 'text'::public.response_format],
  cover_path text,
  status public.ralli_status not null default 'active',
  reward_total_luna bigint not null default 0 check (reward_total_luna >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ralli_ends_after_start check (ends_at > starts_at)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  ralli_id uuid not null references public.rallis(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  format public.response_format not null,
  text_content text check (text_content is null or char_length(text_content) <= 2000),
  media_path text,
  status public.response_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint response_has_content check (text_content is not null or media_path is not null),
  constraint one_response_per_ralli unique (ralli_id, author_id)
);

alter table public.rallis
  add column winner_response_id uuid references public.responses(id) on delete set null;

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('funny', 'nailed_it', 'wow', 'respect')),
  created_at timestamptz not null default now(),
  unique (response_id, user_id, kind)
);

create table public.ralli_passes (
  id uuid primary key default gen_random_uuid(),
  ralli_id uuid not null references public.rallis(id) on delete cascade,
  response_id uuid references public.responses(id) on delete set null,
  passed_by uuid not null references public.profiles(id) on delete cascade,
  passed_to uuid references public.profiles(id) on delete set null,
  share_code text not null unique default encode(extensions.gen_random_bytes(9), 'hex'),
  created_at timestamptz not null default now()
);

create table public.pool_contributions (
  id uuid primary key default gen_random_uuid(),
  ralli_id uuid not null references public.rallis(id) on delete restrict,
  contributor_id uuid not null references public.profiles(id) on delete restrict,
  kind public.contribution_kind not null,
  amount_luna bigint not null check (amount_luna > 0),
  transaction_hash text unique,
  status public.transaction_status not null default 'pending',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint confirmed_contribution_has_hash check (status <> 'confirmed' or transaction_hash is not null)
);

create table public.response_tips (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete restrict,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  amount_luna bigint not null check (amount_luna > 0),
  transaction_hash text unique,
  status public.transaction_status not null default 'pending',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint confirmed_tip_has_hash check (status <> 'confirmed' or transaction_hash is not null),
  constraint tip_recipient_differs_from_sender check (recipient_id <> sender_id)
);

create table public.reward_settlements (
  id uuid primary key default gen_random_uuid(),
  ralli_id uuid not null unique references public.rallis(id) on delete restrict,
  winner_response_id uuid references public.responses(id) on delete restrict,
  recipient_id uuid references public.profiles(id) on delete restrict,
  amount_luna bigint not null check (amount_luna >= 0),
  transaction_hash text unique,
  status public.settlement_status not null default 'pending',
  failure_reason text,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_verification_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nimiq_address text not null,
  nonce_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  ralli_id uuid references public.rallis(id) on delete cascade,
  response_id uuid references public.responses(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index rallis_status_created_idx on public.rallis(status, created_at desc);
create index rallis_creator_idx on public.rallis(creator_id, created_at desc);
create index responses_ralli_created_idx on public.responses(ralli_id, created_at desc);
create index responses_author_idx on public.responses(author_id, created_at desc);
create index reactions_response_idx on public.reactions(response_id);
create index contributions_ralli_status_idx on public.pool_contributions(ralli_id, status);
create index tips_response_status_idx on public.response_tips(response_id, status);
create index activity_user_created_idx on public.activity_events(user_id, created_at desc);
create index verification_user_expiry_idx on public.wallet_verification_challenges(user_id, expires_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger rallis_set_updated_at before update on public.rallis
for each row execute function public.set_updated_at();
create trigger responses_set_updated_at before update on public.responses
for each row execute function public.set_updated_at();
create trigger settlements_set_updated_at before update on public.reward_settlements
for each row execute function public.set_updated_at();

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New Ralli'));
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create function public.has_verified_nimiq_address(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = profile_id and nimiq_address_verified_at is not null
  );
$$;

alter table public.profiles enable row level security;
alter table public.rallis enable row level security;
alter table public.responses enable row level security;
alter table public.reactions enable row level security;
alter table public.ralli_passes enable row level security;
alter table public.pool_contributions enable row level security;
alter table public.response_tips enable row level security;
alter table public.reward_settlements enable row level security;
alter table public.wallet_verification_challenges enable row level security;
alter table public.activity_events enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users update their profile" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Published Rallis are publicly readable" on public.rallis for select
using (status <> 'draft' or creator_id = (select auth.uid()));
create policy "Verified users create unfunded Rallis" on public.rallis for insert to authenticated
with check (creator_id = (select auth.uid()) and reward_total_luna = 0 and public.has_verified_nimiq_address((select auth.uid())));
create policy "Creators update their Rallis" on public.rallis for update to authenticated
using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));

create policy "Published responses are publicly readable" on public.responses for select
using (status <> 'hidden' or author_id = (select auth.uid()));
create policy "Verified users create responses" on public.responses for insert to authenticated
with check (author_id = (select auth.uid()) and public.has_verified_nimiq_address((select auth.uid())));
create policy "Authors update responses" on public.responses for update to authenticated
using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Authors delete responses" on public.responses for delete to authenticated
using (author_id = (select auth.uid()));

create policy "Reactions are publicly readable" on public.reactions for select using (true);
create policy "Verified users react" on public.reactions for insert to authenticated
with check (user_id = (select auth.uid()) and public.has_verified_nimiq_address((select auth.uid())));
create policy "Users remove their reactions" on public.reactions for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Passes are publicly readable" on public.ralli_passes for select using (true);
create policy "Verified users pass Rallis" on public.ralli_passes for insert to authenticated
with check (passed_by = (select auth.uid()) and public.has_verified_nimiq_address((select auth.uid())));

create policy "Confirmed contributions are transparent" on public.pool_contributions for select
using (status = 'confirmed' or contributor_id = (select auth.uid()));
create policy "Confirmed tips are transparent" on public.response_tips for select
using (status = 'confirmed' or sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "Settlements are publicly readable" on public.reward_settlements for select using (true);

create policy "Users read their activity" on public.activity_events for select to authenticated
using (user_id = (select auth.uid()));
create policy "Users update their activity" on public.activity_events for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Financial records and wallet challenges are written only by trusted Edge Functions.
revoke all on public.pool_contributions, public.response_tips, public.reward_settlements, public.wallet_verification_challenges from anon, authenticated;
grant select on public.pool_contributions, public.response_tips, public.reward_settlements to anon, authenticated;

revoke update on public.profiles from authenticated;
grant update (handle, display_name, bio, avatar_path) on public.profiles to authenticated;
grant select on public.profiles, public.rallis, public.responses, public.reactions, public.ralli_passes to anon, authenticated;
grant insert on public.rallis to authenticated;
grant update (prompt, description, category, response_formats, cover_path, ends_at) on public.rallis to authenticated;
grant insert, delete on public.responses to authenticated;
grant update (text_content, media_path) on public.responses to authenticated;
grant insert, delete on public.reactions to authenticated;
grant insert on public.ralli_passes to authenticated;
grant select, update on public.activity_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ralli-media',
  'ralli-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Ralli media is publicly readable" on storage.objects for select
using (bucket_id = 'ralli-media');
create policy "Verified users upload into their folder" on storage.objects for insert to authenticated
with check (
  bucket_id = 'ralli-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_verified_nimiq_address((select auth.uid()))
);
create policy "Users update their media" on storage.objects for update to authenticated
using (bucket_id = 'ralli-media' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'ralli-media' and owner_id = (select auth.uid())::text);
create policy "Users delete their media" on storage.objects for delete to authenticated
using (bucket_id = 'ralli-media' and owner_id = (select auth.uid())::text);

create view public.ralli_feed
with (security_invoker = true)
as
select
  r.id,
  r.creator_id,
  p.handle,
  p.display_name,
  p.avatar_path,
  r.prompt,
  r.description,
  r.category,
  r.cover_path,
  r.status,
  r.reward_total_luna,
  coalesce((select sum(pc.amount_luna) from public.pool_contributions pc where pc.ralli_id = r.id and pc.kind = 'creator_reward' and pc.status = 'confirmed'), 0)::bigint as creator_reward_luna,
  coalesce((select sum(pc.amount_luna) from public.pool_contributions pc where pc.ralli_id = r.id and pc.kind = 'boost' and pc.status = 'confirmed'), 0)::bigint as boost_total_luna,
  r.ends_at,
  r.created_at,
  count(distinct rs.id)::integer as response_count,
  count(distinct rx.id)::integer as reaction_count,
  count(distinct rp.id)::integer as pass_count
from public.rallis r
join public.profiles p on p.id = r.creator_id
left join public.responses rs on rs.ralli_id = r.id and rs.status <> 'hidden'
left join public.reactions rx on rx.response_id = rs.id
left join public.ralli_passes rp on rp.ralli_id = r.id
where r.status <> 'draft'
group by r.id, p.id;

grant select on public.ralli_feed to anon, authenticated;
