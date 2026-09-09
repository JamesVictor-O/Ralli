-- Communities are shared-interest places around existing Rallis, not a second
-- content system. Responses, chains, reactions, boosts, and tips remain attached
-- to their Ralli and are aggregated into the community experience.

create type public.community_role as enum ('member', 'moderator', 'owner');

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 40),
  icon text not null default '🎉' check (char_length(icon) between 1 and 16),
  description text not null check (char_length(description) between 10 and 180),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.community_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.rallis
  add column community_id uuid references public.communities(id) on delete set null;

create table public.community_daily_rallis (
  community_id uuid not null references public.communities(id) on delete cascade,
  ralli_id uuid not null references public.rallis(id) on delete cascade,
  active_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (community_id, active_date),
  unique (ralli_id, active_date)
);

create index rallis_community_created_idx on public.rallis (community_id, created_at desc);
create index community_members_user_idx on public.community_members (user_id, joined_at desc);
create index community_daily_rallis_ralli_idx on public.community_daily_rallis (ralli_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_daily_rallis enable row level security;

create policy "Communities are public"
  on public.communities for select using (true);

create policy "Community membership is public"
  on public.community_members for select using (true);

create policy "People can join communities"
  on public.community_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member');

create policy "People can leave communities"
  on public.community_members for delete to authenticated
  using (user_id = auth.uid() and role = 'member');

create policy "Community daily Rallis are public"
  on public.community_daily_rallis for select using (true);

create policy "Community leaders can set the daily Ralli"
  on public.community_daily_rallis for all to authenticated
  using (exists (
    select 1 from public.community_members cm
    where cm.community_id = community_daily_rallis.community_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'moderator')
  ))
  with check (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = community_daily_rallis.community_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'moderator')
    )
    and exists (
      select 1 from public.rallis r
      where r.id = community_daily_rallis.ralli_id
        and r.community_id = community_daily_rallis.community_id
    )
  );

-- Lightweight starter places. Their counts and feeds remain entirely real.
insert into public.communities (id, slug, name, icon, description) values
  ('10000000-0000-4000-8000-000000000001', 'photography', 'Photography', '📸', 'See ordinary places differently through photo Rallis made together.'),
  ('10000000-0000-4000-8000-000000000002', 'fitness', 'Fitness', '🏃', 'Move, sweat, and keep one another showing up through simple challenges.'),
  ('10000000-0000-4000-8000-000000000003', 'football', 'Football', '⚽', 'Skills, match-day moments, predictions, and challenges for football people.'),
  ('10000000-0000-4000-8000-000000000004', 'art', 'Art', '🎨', 'Make something, share the process, and inspire the next response.'),
  ('10000000-0000-4000-8000-000000000005', 'builders', 'Builders', '🛠️', 'Ship small things in public and challenge other builders to join in.'),
  ('10000000-0000-4000-8000-000000000006', 'nigeria', 'Nigeria', '🇳🇬', 'Everyday life, culture, places, and playful Rallis from across Nigeria.'),
  ('10000000-0000-4000-8000-000000000007', 'music', 'Music', '🎵', 'Listen, perform, remix, and pass musical moments from person to person.'),
  ('10000000-0000-4000-8000-000000000008', 'food', 'Food', '🍲', 'Cook, taste, compare, and show what food looks like where you are.')
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  updated_at = now();

create or replace view public.community_directory
with (security_invoker = true)
as
select
  c.id,
  c.slug,
  c.name,
  c.icon,
  c.description,
  c.created_at,
  count(distinct cm.user_id)::integer as member_count,
  count(distinct r.id)::integer as ralli_count,
  count(distinct rs.id)::integer as response_count,
  count(distinct rx.id)::integer as reaction_count,
  count(distinct rp.id)::integer as pass_count,
  coalesce((
    select sum(pc.amount_luna)
    from public.pool_contributions pc
    join public.rallis boosted_ralli on boosted_ralli.id = pc.ralli_id
    where boosted_ralli.community_id = c.id
      and pc.kind = 'boost'
      and pc.status = 'confirmed'
  ), 0)::bigint as boost_total_luna
from public.communities c
left join public.community_members cm on cm.community_id = c.id
left join public.rallis r on r.community_id = c.id and r.status <> 'draft'
left join public.responses rs on rs.ralli_id = r.id and rs.status <> 'hidden'
left join public.reactions rx on rx.response_id = rs.id
left join public.ralli_passes rp on rp.ralli_id = r.id
group by c.id;

-- Keep the existing feed contract and append community_id so current clients
-- remain compatible while Communities can filter the same Ralli records.
create or replace view public.ralli_feed
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
  count(distinct rp.id)::integer as pass_count,
  coalesce((select count(distinct pc.contributor_id) from public.pool_contributions pc where pc.ralli_id = r.id and pc.kind = 'boost' and pc.status = 'confirmed'), 0)::integer as boost_count,
  r.community_id
from public.rallis r
join public.profiles p on p.id = r.creator_id
left join public.responses rs on rs.ralli_id = r.id and rs.status <> 'hidden'
left join public.reactions rx on rx.response_id = rs.id
left join public.ralli_passes rp on rp.ralli_id = r.id
where r.status <> 'draft'
group by r.id, p.id;

grant select on public.communities, public.community_members, public.community_daily_rallis to anon, authenticated;
grant select on public.community_directory, public.ralli_feed to anon, authenticated;
grant insert, delete on public.community_members to authenticated;
grant insert, update, delete on public.community_daily_rallis to authenticated;
