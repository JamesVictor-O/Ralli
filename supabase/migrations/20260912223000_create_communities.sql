-- Community creation is atomic: the authenticated creator owns the new place
-- from its first moment, without exposing elevated membership writes to clients.

create or replace function public.create_community(
  community_name text,
  community_icon text,
  community_description text
)
returns table (id uuid, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_id uuid := (select auth.uid());
  clean_name text := btrim(community_name);
  clean_icon text := coalesce(nullif(btrim(community_icon), ''), '🎉');
  clean_description text := btrim(community_description);
  base_slug text;
  available_slug text;
  created_id uuid;
begin
  if creator_id is null then
    raise exception 'You must be signed in to create a community.' using errcode = '42501';
  end if;
  if char_length(clean_name) not between 2 and 40 then
    raise exception 'Community names must be between 2 and 40 characters.' using errcode = '22023';
  end if;
  if char_length(clean_icon) not between 1 and 16 then
    raise exception 'Choose one short emoji for the community icon.' using errcode = '22023';
  end if;
  if char_length(clean_description) not between 10 and 180 then
    raise exception 'Community descriptions must be between 10 and 180 characters.' using errcode = '22023';
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'community'; end if;
  base_slug := left(base_slug, 40);
  available_slug := base_slug;
  if exists (select 1 from public.communities c where c.slug = available_slug) then
    available_slug := left(base_slug, 33) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.communities (slug, name, icon, description, created_by)
  values (available_slug, clean_name, clean_icon, clean_description, creator_id)
  returning communities.id into created_id;

  insert into public.community_members (community_id, user_id, role)
  values (created_id, creator_id, 'owner');

  return query select created_id, available_slug;
end;
$$;

revoke all on function public.create_community(text, text, text) from public;
grant execute on function public.create_community(text, text, text) to authenticated;

alter table public.product_events drop constraint if exists product_events_event_name_check;
alter table public.product_events add constraint product_events_event_name_check check (event_name in (
  'app_opened',
  'ralli_opened',
  'response_started',
  'response_published',
  'responses_viewed',
  'invitation_shared',
  'invitation_opened',
  'invitation_accepted',
  'community_opened',
  'community_joined',
  'community_created'
));
